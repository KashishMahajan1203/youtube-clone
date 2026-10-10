import video from "../Modals/video.js";
import users from "../Modals/Auth.js";
import { CATEGORIES } from "../constants/categories.js";
import { persistUpload, discardLocal, isRemoteUrl } from "../services/storage.js";
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
