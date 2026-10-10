import express from "express";
import {
  getallvideo,
  uploadvideo,
  watchVideo,
  updatevideo,
  deletevideo,
} from "../controllers/video.js";


import upload from "../filehelper/filehelper.js";
import { requireAuth } from "../middleware/auth.js";

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
routes.get("/watch/:videoId", watchVideo); // public: anyone can watch
routes.patch("/:id", requireAuth, updatevideo); // owner only
routes.delete("/:id", requireAuth, deletevideo); // owner only
export default routes;
