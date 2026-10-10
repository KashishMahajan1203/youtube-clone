import express from "express";
import {
  getallwatchlater,
  handlewatchlater,
} from "../controllers/watchlater.js";
import { requireAuth, requireSelf } from "../middleware/auth.js";

const routes = express.Router();
routes.get("/:userId", requireAuth, requireSelf(), getallwatchlater);
routes.post("/:videoId", requireAuth, handlewatchlater);
export default routes;
