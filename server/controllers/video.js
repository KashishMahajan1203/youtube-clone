import mongoose from "mongoose";
import video from "../Modals/video.js";
import users from "../Modals/Auth.js";
import comment from "../Modals/comment.js";
import like from "../Modals/like.js";
import history from "../Modals/history.js";
import watchlater from "../Modals/watchlater.js";
import download from "../Modals/download.js";
import playlist from "../Modals/playlist.js";
import notification from "../Modals/notification.js";
import view from "../Modals/view.js";
import { CATEGORIES } from "../constants/categories.js";
import {
  persistUpload,
  discardLocal,
  isRemoteUrl,
  cloudinaryHlsUrl,
  deleteStored,
} from "../services/storage.js";
import { notifyNewUpload } from "../services/notifications.js";

export const uploadvideo = async (req, res) => {
  const videofile = req.files?.file?.[0];
  const thumbnailfile = req.files?.thumbnail?.[0];
  if (videofile === undefined) {
    return res
      .status(404)
      .json({ message: "plz upload a mp4 video file only" });
  } else {
    try {
      // The uploader is the signed-in user; their channel name comes from the DB.
      const owner = await users.findById(req.userId).select("channelname");
      if (!owner?.channelname) {
        await Promise.all([discardLocal(videofile.path), discardLocal(thumbnailfile?.path)]);
        return res.status(403).json({ message: "Create a channel before uploading" });
      }
      const category = CATEGORIES.includes(req.body.category)
        ? req.body.category
        : "Other";
      const [filepath, thumbnail] = await Promise.all([
        persistUpload(videofile.path, "video"),
        thumbnailfile ? persistUpload(thumbnailfile.path, "image") : "",
      ]);
      const file = new video({
        videotitle: req.body.videotitle,
        filename: videofile.originalname,
        filepath,
        filetype: videofile.mimetype,
        filesize: videofile.size,
        videochanel: owner.channelname,
        uploader: req.userId,
        description: (req.body.description || "").slice(0, 5000),
        category,
        thumbnail,
        hls: cloudinaryHlsUrl(filepath),
      });
      await file.save();
      // Fire-and-forget: a notification failure shouldn't fail the upload.
      notifyNewUpload(file).catch((err) => console.error("Notify error:", err));
      return res.status(201).json("file uploaded successfully");
    } catch (error) {
      console.error(" error:", error);
      await Promise.all([discardLocal(videofile.path), discardLocal(thumbnailfile?.path)]);
      return res.status(500).json({ message: "Something went wrong" });
    }
  }
};
export const getallvideo = async (req, res) => {
  try {
    const files = await video.find();
    return res.status(200).send(files);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const watchVideo = async (req, res) => {
  const { videoId } = req.params;
  try {
    const videoFile = await video.findById(videoId);
    if (!videoFile) {
      return res.status(404).json({ message: "Video not found" });
    }
    const filePath = videoFile.filepath;
    // Cloud-hosted videos are streamed straight from the CDN.
    if (isRemoteUrl(filePath)) {
      return res.redirect(filePath);
    }
    res.sendFile(filePath, { root: "." });
  } catch (error) {
    console.error("Watch video error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// PATCH /video/:id — the owner edits title, description or category.
export const updatevideo = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ message: "Video not found" });
  }
  const { videotitle, description, category } = req.body || {};
  const update = {};
  if (videotitle !== undefined) {
    if (typeof videotitle !== "string" || !videotitle.trim()) {
      return res.status(400).json({ message: "Title can't be empty" });
    }
    update.videotitle = videotitle.trim().slice(0, 150);
  }
  if (description !== undefined) update.description = String(description).slice(0, 5000);
  if (category !== undefined) {
    if (!CATEGORIES.includes(category)) {
      return res.status(400).json({ message: "Unknown category" });
    }
    update.category = category;
  }
  try {
    const updated = await video.findOneAndUpdate(
      { _id: id, uploader: req.userId },
      { $set: update },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ message: "Video not found or not yours" });
    }
    return res.status(200).json(updated);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// DELETE /video/:id — the owner removes a video and everything attached to it.
export const deletevideo = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ message: "Video not found" });
  }
  try {
    const removed = await video.findOneAndDelete({ _id: id, uploader: req.userId });
    if (!removed) {
      return res.status(404).json({ message: "Video not found or not yours" });
    }
    await Promise.all([
      comment.deleteMany({ videoid: id }),
      like.deleteMany({ videoid: id }),
      history.deleteMany({ videoid: id }),
      watchlater.deleteMany({ videoid: id }),
      download.deleteMany({ videoid: id }),
      view.deleteMany({ video: id }),
      notification.deleteMany({ video: id }),
      playlist.updateMany({ videos: id }, { $pull: { videos: id } }),
    ]);
    // Files go last: a failure here must not leave dangling database rows.
    await Promise.all([
      deleteStored(removed.filepath, "video"),
      deleteStored(removed.thumbnail, "image"),
    ]);
    return res.status(200).json({ deleted: true });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
