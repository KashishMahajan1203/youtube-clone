import express from "express";
import {
  comments,
  getVideo,
  isYouTubeEnabled,
  related,
  search,
  suggestions,
  trending,
} from "../services/youtube.js";

const routes = express.Router();
const VIDEO_ID = /^[\w-]{11}$/;

const handle = (fn) => async (req, res) => {
  try {
    res.status(200).json(await fn(req));
  } catch (error) {
    const status = error.status || 500;
    if (status >= 500 && !error.code) console.error("[youtube] error:", error);
    res.status(status).json({ message: error.message, code: error.code || "YOUTUBE_ERROR" });
  }
};

const validId = (req) => {
  if (!VIDEO_ID.test(req.params.id)) {
    throw Object.assign(new Error("Invalid video id"), { status: 400, code: "BAD_ID" });
  }
  return req.params.id;
};

routes.get("/status", (req, res) => res.json({ enabled: isYouTubeEnabled() }));
routes.get("/trending", handle((req) => trending(req.query)));
routes.get("/search", handle((req) => search(req.query)));
routes.get("/suggest", handle((req) => suggestions(req.query.q)));
routes.get("/video/:id", handle((req) => getVideo(validId(req))));
routes.get("/video/:id/related", handle((req) => related(validId(req))));
routes.get("/video/:id/comments", handle((req) => comments(validId(req), req.query)));

export default routes;
