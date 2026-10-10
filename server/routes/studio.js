import express from "express";
import { getoverview, getstudiovideos } from "../controllers/studio.js";
import { requireAuth } from "../middleware/auth.js";

// Always scoped to the signed-in user's own channel.
const routes = express.Router();
routes.get("/overview", requireAuth, getoverview);
routes.get("/videos", requireAuth, getstudiovideos);
export default routes;
