

import Razorpay from "razorpay";
import crypto from "crypto";
import users from "../Modals/Auth.js";
import { PLAN_PRICING } from "../constants/plans.js";
import { sendInvoiceEmail } from "../services/emailService.js";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

/* =========================
   CREATE ORDER
   ========================= */
export const createOrder = async (req, res) => {
  const { plan } = req.body;
  const userId = req.userId; // from the verified session token
  console.log("Create order called with", { plan, userId });

  try {
    if (!plan || !userId) {
      return res.status(400).json({
        message: "Plan and userId are required",
      });
    }

    if (!PLAN_PRICING[plan]) {
      return res.status(400).json({
        message: "Invalid plan selected",
      });
    }

    if (
      !process.env.RAZORPAY_KEY_ID ||
      !process.env.RAZORPAY_KEY_SECRET
    ) {
      return res.status(500).json({
        message: "Razorpay configuration missing",
      });
    }

    // Validate userId as valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        message: "Invalid userId format",
      });
    }

    /* =========================
       RAZORPAY INSTANCE
       ========================= */
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    // Specific try-catch for user lookup
    let user;
    try {
      user = await users.findById(userId);
    } catch (dbError) {
      console.error("Database error during user lookup:", dbError);
      return res.status(500).json({
        message: "Database error while finding user",
      });
    }

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const amount = PLAN_PRICING[plan];

    const options = {
      amount: amount * 100, // paisa
      currency: "INR",
      receipt: `rcpt_${userId.slice(-8)}_${Date.now().toString().slice(-6)}`,
    };

    // Specific try-catch for Razorpay order creation
    let order;
    try {
      order = await razorpay.orders.create(options);
    } catch (razorpayError) {
      console.error("Razorpay order creation error:", razorpayError);
      return res.status(500).json({
        message: "Failed to create order with Razorpay",
        details: razorpayError.message || "Unknown Razorpay error",
      });
    }

    return res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    console.error("Create Order Error:", error);
    return res.status(500).json({
      message: "Unable to create order",
      details: error.message || "Unknown error",
    });
  }
};

/* =========================
   VERIFY PAYMENT
   ========================= */
export const verifyPayment = async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    plan,
  } = req.body;
  const userId = req.userId; // from the verified session token

  try {
    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !plan ||
      !userId
    ) {
      return res.status(400).json({
        message: "Incomplete payment details",
      });
    }

    const signPayload = `${razorpay_order_id}|${razorpay_payment_id}`;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(signPayload)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        message: "Payment verification failed",
      });
    }

    const planExpiry = new Date();
    planExpiry.setMonth(planExpiry.getMonth() + 1); // 1 month validity

    const updatedUser = await users.findByIdAndUpdate(userId, {
      plan,
      planExpiry,
    }, { new: true });

    // Send invoice email after successful payment
    try {
      await sendInvoiceEmail(
        updatedUser.email,
        updatedUser.name || updatedUser.email,
        plan,
        PLAN_PRICING[plan],
        planExpiry,
        razorpay_payment_id
      );
    } catch (emailError) {
      console.error("Failed to send invoice email:", emailError);
      // Don't fail the payment if email fails
    }

    return res.status(200).json({
      msg: "success",
      plan,
      planExpiry,
    });
  } catch (error) {
    console.error("Verify Payment Error:", error);
    return res.status(500).json({
      message: "Payment verification error",
    });
  }
};
