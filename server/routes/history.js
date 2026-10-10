import express from "express";
import {
  getallhistoryVideo,
  handlehistory,
  handleview,
} from "../controllers/history.js";
import { requireAuth, requireSelf } from "../middleware/auth.js";

const routes = express.Router();
routes.get("/:userId", requireAuth, requireSelf(), getallhistoryVideo);
routes.post("/views/:videoId", handleview);
routes.post("/:videoId", requireAuth, handlehistory);
export default routes;
