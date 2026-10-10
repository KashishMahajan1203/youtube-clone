import express from "express";
import { getnotifications, marknotificationsread } from "../controllers/notification.js";
import { requireAuth, requireSelf } from "../middleware/auth.js";

const routes = express.Router();
routes.get("/:userId", requireAuth, requireSelf(), getnotifications);
routes.post("/:userId/read", requireAuth, requireSelf(), marknotificationsread);
export default routes;
