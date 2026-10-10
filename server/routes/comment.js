import express from "express";
import { deletecomment, getallcomment, postcomment, editcomment, likeComment, dislikeComment } from "../controllers/comment.js";
import { requireAuth } from "../middleware/auth.js";

const routes = express.Router();
routes.get("/:videoid", getallcomment);
routes.post("/postcomment", requireAuth, postcomment);
routes.delete("/deletecomment/:id", requireAuth, deletecomment);
routes.post("/editcomment/:id", requireAuth, editcomment);
routes.patch("/like/:id", requireAuth, likeComment);
routes.patch("/dislike/:id", requireAuth, dislikeComment);
export default routes;
