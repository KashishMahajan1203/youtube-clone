import express from "express";
import { login, updateprofile, sendOTP, verifyOTP, getchannel, getme, demologin } from "../controllers/auth.js";
import { requireAuth, requireSelf } from "../middleware/auth.js";
const routes = express.Router();

routes.post("/login", login);
routes.post("/send-otp", sendOTP);
routes.post("/verify-otp", verifyOTP);
routes.post("/demo-login", demologin);
routes.get("/me", requireAuth, getme);
routes.patch("/update/:id", requireAuth, requireSelf("id"), updateprofile);
routes.get("/channel/:id", getchannel);
export default routes;
