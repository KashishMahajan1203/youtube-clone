import video from "../Modals/video.js";
import like from "../Modals/like.js";

const isDislike = (doc) => doc?.type === "dislike";

const reactionState = async (videoId, existing) => {
  const updated = await video.findById(videoId).select("Like Dislike");
  return {
    liked: !!existing && !isDislike(existing),
    disliked: isDislike(existing),
    likes: Math.max(updated?.Like ?? 0, 0),
    dislikes: Math.max(updated?.Dislike ?? 0, 0),
  };
};

// Toggle a like or dislike. Body: { type?: "like" | "dislike" }.
// Switching from like to dislike (or back) moves the reaction in one step.
export const handlelike = async (req, res) => {
  const { type = "like" } = req.body;
  const userId = req.userId; // from the verified session token
  const { videoId } = req.params;
  if (!["like", "dislike"].includes(type)) {
    return res.status(400).json({ message: "Invalid reaction type" });
  }
  const field = (t) => (t === "dislike" ? "Dislike" : "Like");
  try {
    const existing = await like.findOne({ viewer: userId, videoid: videoId });
    const existingType = existing ? (isDislike(existing) ? "dislike" : "like") : null;

    let current = null;
    if (existingType === type) {
      // Same reaction again: remove it.
      await like.findByIdAndDelete(existing._id);
      await video.findByIdAndUpdate(videoId, { $inc: { [field(type)]: -1 } });
    } else if (existing) {
      // Switch reaction.
      existing.type = type;
      current = await existing.save();
      await video.findByIdAndUpdate(videoId, {
        $inc: { [field(existingType)]: -1, [field(type)]: 1 },
      });
    } else {
      current = await like.create({ viewer: userId, videoid: videoId, type });
      await video.findByIdAndUpdate(videoId, { $inc: { [field(type)]: 1 } });
    }

    return res.status(200).json(await reactionState(videoId, current));
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// Current user's reaction to a video, plus totals.
export const getlikestatus = async (req, res) => {
  const { videoId, userId } = req.params;
  try {
    const existing = await like.findOne({ viewer: userId, videoid: videoId });
    return res.status(200).json(await reactionState(videoId, existing));
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getallLikedVideo = async (req, res) => {
  const { userId } = req.params;
  try {
    const likevideo = await like
      .find({ viewer: userId, type: { $ne: "dislike" } })
      .sort({ createdAt: -1 })
      .populate({
        path: "videoid",
        model: "videofiles",
      })
      .exec();
    return res.status(200).json(likevideo);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
