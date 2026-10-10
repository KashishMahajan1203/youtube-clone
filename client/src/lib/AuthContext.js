import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  signInWithPhoneNumber,
  RecaptchaVerifier,
} from "firebase/auth";
import { useState, useEffect, createContext, useContext, useRef } from "react";
import { useTheme } from "next-themes";
import { provider, auth } from "./firebase";
import axiosInstance from "./axiosinstance";
import { getToken, setToken, SESSION_EXPIRED } from "./session";
import { toast } from "sonner";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [otpRequired, setOtpRequired] = useState(false);
  const [otpMethod, setOtpMethod] = useState(null);
  const [signingIn, setSigningIn] = useState(false);
  const [location, setLocation] = useState(null);
  const [mobile, setMobile] = useState("");
  const [tempEmail, setTempEmail] = useState("");
  const [isSignupFlow, setIsSignupFlow] = useState(false);
  const { setTheme } = useTheme();

  // Firebase Phone Auth state
  const [confirmationResult, setConfirmationResult] = useState(null);
  const recaptchaVerifierRef = useRef(null);

  const otpRequiredRef = useRef(false);
  const signingInRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => {
    otpRequiredRef.current = otpRequired;
  }, [otpRequired]);

  useEffect(() => {
    signingInRef.current = signingIn;
  }, [signingIn]);

  // Restore the session on load. The cached profile is shown immediately, then
  // the token is checked with the API (which also refreshes plan/profile data).
  // Sessions saved before tokens existed have no token and must sign in again.
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const token = getToken();
    if (!storedUser || !token) {
      localStorage.removeItem("user");
      setToken(null);
      return;
    }
    try {
      setUser(JSON.parse(storedUser));
    } catch (error) {
      console.error("Failed to parse stored user data:", error);
      localStorage.removeItem("user");
      setToken(null);
      return;
    }
    axiosInstance
      .get("/user/me")
      .then((res) => {
        setUser(res.data.result);
        localStorage.setItem("user", JSON.stringify(res.data.result));
      })
      .catch(() => {
        // 401s are handled by the SESSION_EXPIRED listener below; network
        // errors keep the cached session so the app still works offline-ish.
      });
  }, []);

  const login = (userdata, token) => {
    setUser(userdata);
    localStorage.setItem("user", JSON.stringify(userdata));
    if (token) setToken(token);
  };

  // One-click sign-in to the shared demo account (no Google/OTP needed).
  const demoLogin = async () => {
    try {
      const res = await axiosInstance.post("/user/demo-login");
      login(res.data.result, res.data.token);
      toast.success("Signed in to the demo account", {
        description: "Have a look around: like, comment, make playlists, upload.",
      });
      return true;
    } catch (error) {
      console.error("Demo login failed:", error?.response?.data || error.message);
      toast.error(error?.response?.data?.message || "Demo login is unavailable right now");
      return false;
    }
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem("user");
    setToken(null);
    try {
      await signOut(auth);
      setSigningIn(false);
      signingInRef.current = false;
      setOtpRequired(false);
      otpRequiredRef.current = false;
      setMobile("");
    } catch (error) {
      console.error("Error during sign out:", error);
    }
  };

  useEffect(() => {
    const onExpired = () => {
      if (!getToken()) return;
      logout();
      toast.error("Your session has expired. Please sign in again.");
    };
    window.addEventListener(SESSION_EXPIRED, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED, onExpired);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getThemeByLocationAndTime = (locData) => {
    return 'dark';
  };

  const [mobileRequired, setMobileRequired] = useState(false);

  const handlegooglesignin = async () => {
    console.log("handlegooglesignin started");
    try {
      setSigningIn(true);
      signingInRef.current = true;
      const result = await signInWithPopup(auth, provider);

      if (!result?.user) {
        throw new Error("Firebase authentication failed");
      }

      const firebaseuser = result.user;

      if (!firebaseuser.email) {
        throw new Error("Firebase user email missing");
      }

      let currentLoc = { region_name: "Haryana", country_name: "India" };
      try {
        // Fetch location with a timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const locRes = await fetch('https://ipapi.co/json/', { signal: controller.signal });
        clearTimeout(timeoutId);

        if (locRes.ok) {
          currentLoc = await locRes.json();
          setLocation(currentLoc);
        }
      } catch (e) {
        console.warn("Location fetch skipped/failed, using default", e.message);
      }

      console.log("Current Location for session:", currentLoc);

      const themeToSet = getThemeByLocationAndTime(currentLoc);
      setTheme(themeToSet);

      setTempEmail(firebaseuser.email);

      // Check if user exists to determine signup vs login
      const checkUserResponse = await axiosInstance.post("/user/send-otp", {
        email: firebaseuser.email,
        mobile: "",
        name: firebaseuser.displayName,
        image: firebaseuser.photoURL || "https://github.com/shadcn.png"
      });

      const isSignup = !!checkUserResponse.data.isSignup;
      setIsSignupFlow(isSignup);

      // Determine OTP method based on signup/login and location
      const southernStates = ["tamil nadu", "kerala", "karnataka", "andhra", "telangana"];
      const isSouthern = southernStates.includes(currentLoc.region_name?.toLowerCase() || "");

      let otpMethod = 'email'; // Default for signup or southern states

      if (!isSignup && !isSouthern) {
        // Existing user from non-southern state needs SMS OTP
        otpMethod = 'sms';

        if (!mobile) {
          // Need to collect mobile number first
          setMobileRequired(true);
          setOtpRequired(true);
          otpRequiredRef.current = true;
          setOtpMethod('sms');
          setSigningIn(false);
          signingInRef.current = false;
          return;
        }
      }

      console.log(`OTP Method: ${otpMethod}, IsSignup: ${isSignup}, Location: ${currentLoc.region_name}`);

      if (otpMethod === 'email') {
        // The first /send-otp call above already emails a code when the
        // server picks the email method. Calling it again would send a
        // second code and invalidate the first one ("Invalid OTP").
        const alreadySent =
          checkUserResponse.data.method === 'email' && !checkUserResponse.data.mobileRequired;
        if (!alreadySent) {
          const sanitizedMobile = (mobile || "").replace(/\\s+|-/g, "");
          await axiosInstance.post("/user/send-otp", {
            email: firebaseuser.email,
            mobile: sanitizedMobile,
            name: firebaseuser.displayName,
            image: firebaseuser.photoURL || "https://github.com/shadcn.png"
          });
        }

        setOtpRequired(true);
        otpRequiredRef.current = true;
        setOtpMethod('email');
        setMobileRequired(false);
      } else {
        // Use Firebase Phone Authentication for SMS
        const sanitizedMobile = mobile.replace(/\\s+|-/g, "");
        let formattedMobile = sanitizedMobile;

        // Format to E.164
        if (!formattedMobile.startsWith('+')) {
          if (formattedMobile.length === 10 && /^[6-9]/.test(formattedMobile)) {
            formattedMobile = `+91${formattedMobile}`;
          } else {
            formattedMobile = `+${formattedMobile}`;
          }
        }

        console.log("Sending Firebase SMS OTP to:", formattedMobile);

        // Initialize reCAPTCHA if not already done
        if (!recaptchaVerifierRef.current) {
          recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
            size: 'invisible',
            callback: () => {
              console.log("reCAPTCHA verified");
            }
          });
        }

        // Send SMS via Firebase
        const confirmation = await signInWithPhoneNumber(auth, formattedMobile, recaptchaVerifierRef.current);
        setConfirmationResult(confirmation);

        setOtpRequired(true);
        otpRequiredRef.current = true;
        setOtpMethod('sms');
        setMobileRequired(false);
      }

      setSigningIn(false);
      signingInRef.current = false;
    } catch (error) {
      console.error(
        "Google Sign-In Error:",
        error?.response?.data || error.message
      );
      setSigningIn(false);
    }
  };

  const resendOTP = async (customMobile) => {
    try {
      const firebaseuser = auth.currentUser;
      if (!firebaseuser?.email) throw new Error("No user email");

      const sanitizedMobile = (customMobile || mobile || "").replace(/\s+|-/g, "");
      const payload = {
        email: firebaseuser.email,
        mobile: sanitizedMobile,
      };

      console.log("Resending OTP for:", payload.email, "via:", payload.mobile ? 'SMS' : 'Email');

      if (!axiosInstance) {
        throw new Error("axiosInstance is not initialized");
      }

      const response = await axiosInstance.post("/user/send-otp", payload);
      console.log("Resend OTP response data:", response.data);

      if (response.data.mobileRequired) return false;

      setMobileRequired(false);
      return true;
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      console.error("Detailed Resend OTP Error:", errorMsg);
      return errorMsg;
    }
  };

  const verifyOTP = async (otp) => {
    try {
      const firebaseuser = auth.currentUser;
      if (!firebaseuser?.email) {
        throw new Error("No authenticated user");
      }

      let user;
      let token;

      if (otpMethod === 'sms' && confirmationResult) {
        // The Google account's ID token proves the email to the API. Grab it
        // before confirming the SMS code, which switches Firebase's current
        // user to the phone account.
        const idToken = await firebaseuser.getIdToken();

        console.log("Verifying Firebase SMS OTP");
        await confirmationResult.confirm(otp);

        const response = await axiosInstance.post("/user/login", { idToken });

        user = response.data.result;
        token = response.data.token;
        setConfirmationResult(null); // Clear confirmation result
      } else {
        // Verify backend email OTP
        console.log("Verifying backend email OTP");
        const payload = {
          email: firebaseuser.email,
          otp: otp,
        };

        const response = await axiosInstance.post(
          "/user/verify-otp",
          payload
        );

        if (!response?.data?.result) {
          throw new Error("Invalid OTP");
        }

        user = response.data.result;
        token = response.data.token;
      }

      if (!token) {
        throw new Error("Sign-in failed: no session token returned");
      }

      setOtpRequired(false);
      otpRequiredRef.current = false;
      setOtpMethod(null);
      setMobileRequired(false);
      setSigningIn(false);
      login(user, token);
    } catch (error) {
      console.error(
        "OTP Verification Error:",
        error?.response?.data || error.message
      );
      throw error;
    }
  };


  useEffect(() => {
    // Simplified location detection to avoid hangs
    const fetchLocationAndSetTheme = () => {
      setTheme('dark');
      setLocation({ region_name: "Haryana" });
    };

    fetchLocationAndSetTheme();

    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseuser) => {
        console.log("onAuthStateChanged fired", { firebaseuser: !!firebaseuser, otpRequired: otpRequiredRef.current, signingIn: signingInRef.current });
        // Authentication bypass removed - all sign-ins must go through OTP verification
        // Users must complete: handlegooglesignin → verifyOTP flow
      }
    );

    return () => unsubscribe();
  }, [setTheme]);

  return (
    <UserContext.Provider
      value={{
        user,
        login,
        logout,
        demoLogin,
        handlegooglesignin,
        otpRequired,
        otpMethod,
        mobileRequired,
        mobile,
        setMobile,
        verifyOTP,
        resendOTP,
        tempEmail,
        isSignupFlow
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
