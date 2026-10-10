import express from "express";
import {
  createplaylist,
  getuserplaylists,
  getplaylist,
  updateplaylist,
  deleteplaylist,
  togglevideo,
} from "../controllers/playlist.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";

const routes = express.Router();
routes.post("/", requireAuth, createplaylist);
routes.get("/user/:userId", optionalAuth, getuserplaylists);
routes.get("/:id", optionalAuth, getplaylist);
routes.patch("/:id", requireAuth, updateplaylist);
routes.delete("/:id", requireAuth, deleteplaylist);
routes.post("/:id/video", requireAuth, togglevideo);
export default routes;
