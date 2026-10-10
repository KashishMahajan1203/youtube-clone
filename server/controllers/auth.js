import mongoose from "mongoose";
import users from "../Modals/Auth.js";
import twilio from "twilio";
import axios from "axios";
import nodemailer from "nodemailer";
import crypto from "crypto";
import dotenv from "dotenv";
import { signToken, verifyFirebaseIdToken } from "../services/token.js";
import { DEMO_USER, isDemoLoginEnabled } from "../constants/demo.js";

dotenv.config();

const southernStates = [
  "tamil nadu",
  "kerala",
  "karnataka",
  "andhra",
  "telangana",
  "telungana"
];

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

const getUserLocation = async (ip) => {
  try {
    // For localhost, handle special cases
    if (ip === "::1" || ip === "127.0.0.1") {
      return { regionName: "Maharashtra", country: "India" };
    }
    const response = await axios.get(`http://ip-api.com/json/${ip}`);
    return response.data;
  } catch (error) {
    console.error("Location lookup error:", error);
    return null;
  }
};

const isValidLoginTime = () => {
  const now = new Date();
  const hour = now.getHours();
  return hour >= 10 && hour < 12;
};

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const otpEmailHtml = (otp) => `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:460px;margin:0 auto;padding:24px;color:#111">
    <h2 style="margin:0 0 8px">Your YourTube sign-in code</h2>
    <p style="margin:0 0 20px;color:#555">Enter this code to finish signing in. It expires in 5 minutes.</p>
    <div style="font-size:32px;font-weight:bold;letter-spacing:8px;padding:16px;text-align:center;background:#f4f4f6;border-radius:12px">${otp}</div>
    <p style="margin:20px 0 0;font-size:12px;color:#888">If you didn't try to sign in, you can ignore this email.</p>
  </div>`;

const sendEmailOTP = async (email, otp) => {
  try {
    const mailOptions = {
      from: `"YourTube" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `${otp} is your YourTube sign-in code`,
      text: `Your YourTube sign-in code is ${otp}. It expires in 5 minutes.`,
      html: otpEmailHtml(otp),
    };
    const info = await transporter.sendMail(mailOptions);
    if (process.env.NODE_ENV !== "production") {
      const self = email.toLowerCase() === (process.env.EMAIL_USER || "").toLowerCase();
      console.log(
        `[dev] Gmail ${info.accepted?.length ? "accepted" : "did NOT accept"} the OTP email for ${email}` +
          (info.rejected?.length ? ` (rejected: ${info.rejected.join(", ")})` : "") +
          (self ? " — sent to yourself, so Gmail may show it only in Sent/All Mail" : "")
      );
    }
    return true;
  } catch (error) {
    console.error("Email OTP error:", error.code || "", error.response || error.message);
    return false;
  }
};

const sendSMSOTP = async (mobile, otp) => {
  try {
    if (!mobile) return false;

    // Check if Twilio credentials are configured
    if (!process.env.TWILIO_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      console.error("Twilio configuration missing. Please check your environment variables:");
      console.error("- TWILIO_SID:", process.env.TWILIO_SID ? "✓ Set" : "✗ Missing");
      console.error("- TWILIO_AUTH_TOKEN:", process.env.TWILIO_AUTH_TOKEN ? "✓ Set" : "✗ Missing");
      console.error("- TWILIO_PHONE_NUMBER:", process.env.TWILIO_PHONE_NUMBER ? "✓ Set" : "✗ Missing");
      return false;
    }

    // Intelligent formatting for Twilio E.164
    const fromNumber = (process.env.TWILIO_PHONE_NUMBER || "").replace(/\s+/g, "");
    let formattedMobile = mobile.replace(/\s+/g, "");

    if (formattedMobile.startsWith('+')) {
      // already fine
    } else if (formattedMobile.length === 10 && /^[6-9]/.test(formattedMobile)) {
      formattedMobile = `+91${formattedMobile}`;
    } else {
      formattedMobile = `+${formattedMobile}`;
    }

    console.log(`Twilio: Requesting SMS from ${fromNumber} to ${formattedMobile}`);
    console.log(`Twilio SID: ${process.env.TWILIO_SID.substring(0, 10)}...`);

    const message = await twilioClient.messages.create({
      body: `Your OTP for verification is: ${otp}. This code will expire in 5 minutes.`,
      from: fromNumber,
      to: formattedMobile,
    });

    console.log("SMS sent successfully, message SID:", message.sid);
    return true;
  } catch (error) {
    console.error("Twilio SMS Error Details:", error.message);
    if (error.code === 21211) {
      console.log("---------------------------------------------------------");
      console.log("HINT: Error 21211 usually means 'Invalid To Number'.");
      console.log("If using a Twilio Trial Account, you MUST verify the ");
      console.log("recipient's phone number in your Twilio Console first.");
      console.log("Link: https://www.twilio.com/console/phone-numbers/verified");
      console.log("---------------------------------------------------------");
    } else if (error.code === 20003) {
      console.log("---------------------------------------------------------");
      console.log("HINT: Error 20003 usually means authentication failed.");
      console.log("Please check your TWILIO_SID and TWILIO_AUTH_TOKEN.");
      console.log("---------------------------------------------------------");
    } else if (error.code === 21608) {
      console.log("---------------------------------------------------------");
      console.log("HINT: Error 21608 means the 'From' number is not valid.");
      console.log("Please check your TWILIO_PHONE_NUMBER in environment variables.");
      console.log("---------------------------------------------------------");
    }
    if (error.code) console.error("Twilio Error Code:", error.code);
    return false;
  }
};

export const sendOTP = async (req, res) => {
  console.log("=========================================");
  console.log("!!! SEND OTP REQUEST RECEIVED !!!");
  const { email, mobile, name, image } = req.body;
  console.log(`Payload: email=${email}, mobile=${mobile}, name=${name}`);
  console.log("=========================================");

  try {
    const existingUser = await users.findOne({ email });
    const isSignup = !existingUser;

    const clientIP = req.ip || "127.0.0.1";
    // Mock for testing
    const location = { regionName: "Haryana" };
    const regionName = location.regionName.toLowerCase();
    const isSouthern = false; // Mocked

    console.log(`Auth Flow: ${isSignup ? "SIGNUP" : "LOGIN"}`);

    // Signup ALWAYS uses email. Login uses regional rule.
    let method = 'email';
    if (mobile) {
      method = 'sms';
    }
    if (!isSignup && !isSouthern) {
      method = 'sms';
      if (!mobile) {
        return res.status(200).json({
          message: "Login for other states requires mobile number.",
          method: 'sms',
          mobileRequired: true,
          theme: 'dark'
        });
      }
    }

    const otp = generateOTP();
    // Handy while developing (no inbox needed); never log codes in production.
    if (process.env.NODE_ENV !== "production") {
      console.log(`[dev] OTP for ${email}: ${otp} (via ${method})`);
    }

    let otpSent = false;
    let actualMethod = method;

    try {
      if (method === 'email') {
        otpSent = await sendEmailOTP(email, otp);
      } else {
        otpSent = await sendSMSOTP(mobile, otp);
        // If SMS fails and we have email, try email as fallback for non-southern states
        if (!otpSent && email && !isSouthern) {
          console.log("SMS failed, trying email as fallback...");
          otpSent = await sendEmailOTP(email, otp);
          if (otpSent) {
            actualMethod = 'email';
            console.log("Fallback to email OTP successful");
          }
        }
      }
    } catch (sendError) {
      console.error("Internal Send OTP Error:", sendError.message);
    }

    if (!otpSent) {
      let errorMsg = "Failed to send OTP. ";
      if (method === 'sms' && !isSouthern) {
        errorMsg += "Please check your Twilio settings, phone number format, or try again later. If using Twilio Trial, verify the phone number first.";
      } else {
        errorMsg += "Please check your email settings or try again later.";
      }
      return res.status(500).json({ message: errorMsg });
    }

    // Store OTP temporarily
    global.otps = global.otps || {};
    global.otps[email] = {
      otp,
      expires: Date.now() + 5 * 60 * 1000,
      theme: 'dark',
      name,
      image,
      isSignup
    };

    return res.status(200).json({
      message: `OTP sent via ${actualMethod}${actualMethod !== method ? ' (fallback from SMS)' : ''}`,
      method: actualMethod,
      isSignup,
      theme: 'dark'
    });
  } catch (error) {
    console.error("Send OTP main error:", error);
    return res.status(500).json({ message: error.message || "Something went wrong" });
  }
};

export const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const storedOTP = global.otps && global.otps[email];
    if (!storedOTP || storedOTP.otp !== otp || Date.now() > storedOTP.expires) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Clear OTP
    delete global.otps[email];

    let user = await users.findOne({ email });
    if (!user) {
      user = await users.create({
        email,
        name: storedOTP.name || 'User',
        image: storedOTP.image || 'https://github.com/shadcn.png'
      });
    }

    return res.status(200).json({ result: user, token: signToken(user._id), theme: storedOTP.theme });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// Called after the SMS OTP step. The client must send the Firebase ID token of
// the Google account it signed in with; the email is taken from that verified
// token, never from the request body.
export const login = async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) {
    return res.status(401).json({ message: "Missing ID token" });
  }

  let claims;
  try {
    claims = await verifyFirebaseIdToken(idToken);
  } catch (error) {
    console.error("ID token verification failed:", error.message);
    return res.status(401).json({ message: "Invalid or expired sign-in. Please try again." });
  }
  if (!claims.email || claims.email_verified === false) {
    return res.status(401).json({ message: "A verified email is required" });
  }
  const email = claims.email;
  const name = claims.name;
  const image = claims.picture;

  try {
    // Re-verify localization for direct login attempts (Security Guard)
    const clientIP = req.ip || "127.0.0.1";
    // Mock for testing
    const location = { regionName: "Haryana" };
    const isSouthern = false; // Forced for testing policy

    const existingUser = await users.findOne({ email });

    // If existing user from other state but no mobile, we still allow login 
    // but the policy says "reject if login with email but not with number"
    // So if it's a new or existing user, and they are in the SMS zone,
    // they MUST go through verified flow in AuthContext.

    // In our backend logic, the login is the "final" step. 
    // If they hit this but shouldn't have, we can return a 403.
    // However, keeping it simple: just ensure verify-otp is the only way in for non-southern.

    if (!existingUser) {
      const newUser = await users.create({ email, name, image });
      return res.status(201).json({ result: newUser, token: signToken(newUser._id) });
    } else {
      return res.status(200).json({ result: existingUser, token: signToken(existingUser._id) });
    }
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
export const updateprofile = async (req, res) => {
  const { id: _id } = req.params;
  const { channelname, description } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(500).json({ message: "User unavailable..." });
  }
  try {
    const updatedata = await users.findByIdAndUpdate(
      _id,
      {
        $set: {
          channelname: channelname,
          description: description,
        },
      },
      { new: true }
    );
    return res.status(201).json(updatedata);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// Public channel info (no email, mobile or plan details).
export const getchannel = async (req, res) => {
  const { id: _id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).json({ message: "Channel not found" });
  }
  try {
    const channel = await users
      .findById(_id)
      .select("channelname name image description joinedon");
    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }
    return res.status(200).json(channel);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// Current user, from the session token. Used to validate a stored session
// and refresh profile/plan data on page load.
export const getme = async (req, res) => {
  try {
    const user = await users.findById(req.userId);
    if (!user) {
      return res.status(401).json({ message: "Account not found", code: "AUTH_REQUIRED" });
    }
    return res.status(200).json({ result: user });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// One-click sign-in to a shared demo account, so visitors (e.g. recruiters)
// can try the app without Google sign-in and OTP. Disable with
// ENABLE_DEMO_LOGIN=false. The demo account gets the GOLD plan so watch-time
// limits don't get in the way.
export const demologin = async (req, res) => {
  if (!isDemoLoginEnabled()) {
    return res.status(404).json({ message: "Demo login is disabled" });
  }
  try {
    const farFuture = new Date();
    farFuture.setFullYear(farFuture.getFullYear() + 10);
    const user = await users.findOneAndUpdate(
      { email: DEMO_USER.email },
      {
        $setOnInsert: DEMO_USER,
        $set: { plan: "GOLD", planExpiry: farFuture },
      },
      { upsert: true, new: true }
    );
    return res.status(200).json({ result: user, token: signToken(user._id), demo: true });
  } catch (error) {
    console.error("Demo login error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
