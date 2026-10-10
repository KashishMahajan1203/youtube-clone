import express from "express";
import { handlelike, getallLikedVideo, getlikestatus } from "../controllers/like.js";
import { requireAuth, requireSelf } from "../middleware/auth.js";

const routes = express.Router();
routes.get("/status/:videoId/:userId", requireAuth, requireSelf(), getlikestatus);
routes.get("/:userId", requireAuth, requireSelf(), getallLikedVideo);
routes.post("/:videoId", requireAuth, handlelike);
export default routes;
