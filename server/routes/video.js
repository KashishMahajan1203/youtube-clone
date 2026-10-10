import express from "express";
import { getallvideo, uploadvideo, watchVideo, updateWatchTime } from "../controllers/video.js";

import { checkPlanExpiry } from "../middleware/planExpiry.js";
import { checkWatchTimeLimit } from "../middleware/watchTimeCheck.js";

import upload from "../filehelper/filehelper.js";
import { requireAuth, requireAuthMedia } from "../middleware/auth.js";

const routes = express.Router();

routes.post(
  "/upload",
  requireAuth, // before multer, so anonymous uploads never touch the disk
  upload.fields([
    { name: "file", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  uploadvideo
);
routes.get("/getall", getallvideo);
// <video> elements can't send headers, so the stream accepts ?token=<jwt>.
routes.get("/watch/:videoId", requireAuthMedia, checkPlanExpiry, checkWatchTimeLimit, watchVideo);
routes.put("/watch/:videoId", requireAuth, updateWatchTime);
export default routes;
