import video from "../Modals/video.js";
import watchsession from "../Modals/watchsession.js";
import users from "../Modals/Auth.js";
import { PLAN_RULES } from "../constants/plans.js";
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

export const updateWatchTime = async (req, res) => {
  const { videoId } = req.params;
  const userId = req.userId; // from the verified session token
  const { watchTime } = req.body;

  try {
    // Validate inputs
    if (!videoId || !userId || watchTime === undefined) {
      return res.status(400).json({ message: "Missing required parameters" });
    }

    // Get user and check plan
    const user = await users.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if plan is expired
    const currentDate = new Date();
    if (user.plan !== "FREE" && user.planExpiry && user.planExpiry < currentDate) {
      await users.findByIdAndUpdate(userId, { plan: "FREE", planExpiry: null });
      user.plan = "FREE";
    }

    const planRules = PLAN_RULES[user.plan];
    if (!planRules) {
      return res.status(400).json({ message: "Invalid plan" });
    }

    // For unlimited plans, allow unlimited watch time
    if (planRules.maxWatchTime === Infinity) {
      return res.status(200).json({
        message: "Watch time updated",
        remainingTime: Infinity,
        unlimited: true
      });
    }

    // Get or create watch session
    let session = await watchsession.findOne({ userId, videoId });
    if (!session) {
      session = new watchsession({
        userId,
        videoId,
        watchTime: 0,
        lastWatched: new Date()
      });
    }

    // Update watch time (only if it's greater than current)
    if (watchTime > session.watchTime) {
      session.watchTime = watchTime;
      session.lastWatched = new Date();
      await session.save();
    }

    // Calculate remaining time
    const remainingTime = Math.max(0, planRules.maxWatchTime - session.watchTime);

    // Check if limit exceeded (but allow initialization with watchTime 0)
    if (remainingTime <= 0 && watchTime > 0) {
      return res.status(403).json({
        message: "Watch time limit exceeded. Upgrade to premium for more watch time.",
        remainingTime: 0,
        limitExceeded: true,
        upgradeRequired: true
      });
    }

    return res.status(200).json({
      message: "Watch time updated",
      remainingTime,
      watchedTime: session.watchTime,
      maxTime: planRules.maxWatchTime
    });

  } catch (error) {
    console.error("Update watch time error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
