import mongoose from "mongoose";
import video from "../Modals/video.js";
import history from "../Modals/history.js";
import { recordView } from "../services/views.js";

export const handlehistory = async (req, res) => {
  const userId = req.userId; // from the verified session token
  const { videoId } = req.params;
  try {
    if (!mongoose.Types.ObjectId.isValid(videoId) || !(await video.exists({ _id: videoId }))) {
      return res.status(404).json({ message: "Video not found" });
    }
    await history.create({ viewer: userId, videoid: videoId });
    const counted = await recordView(videoId, { userId });
    return res.status(200).json({ history: true, counted });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
export const handleview = async (req, res) => {
  const { videoId } = req.params;
  try {
    const counted = await recordView(videoId, { ip: req.ip });
    return res.status(200).json({ viewed: true, counted });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
export const getallhistoryVideo = async (req, res) => {
  const { userId } = req.params;
  try {
    const historyvideo = await history
      .find({ viewer: userId })
      .populate({
        path: "videoid",
        model: "videofiles",
      })
      .exec();
    return res.status(200).json(historyvideo);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
