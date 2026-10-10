import express from "express";
import { createOrder, verifyPayment } from "../controllers/payment.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.post("/create-order", requireAuth, createOrder);
router.post("/verify", requireAuth, verifyPayment);

export default router;
