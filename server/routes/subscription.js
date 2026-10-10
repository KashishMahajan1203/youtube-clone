import express from "express";
import {
  togglesubscription,
  getsubscriptionstatus,
  getsubscribedchannels,
  getsubscriptionfeed,
} from "../controllers/subscription.js";
import { optionalAuth, requireAuth, requireSelf } from "../middleware/auth.js";

const routes = express.Router();
routes.get("/channels/:userId", requireAuth, requireSelf(), getsubscribedchannels);
routes.get("/feed/:userId", requireAuth, requireSelf(), getsubscriptionfeed);
routes.get("/status/:channelId", optionalAuth, getsubscriptionstatus);
routes.post("/:channelId", requireAuth, togglesubscription);
export default routes;
