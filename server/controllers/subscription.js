import mongoose from "mongoose";
import subscription from "../Modals/subscription.js";
import video from "../Modals/video.js";
import { notifyNewSubscriber } from "../services/notifications.js";

const isId = (id) => mongoose.Types.ObjectId.isValid(id);

export const togglesubscription = async (req, res) => {
  const { channelId } = req.params;
  const userId = req.userId; // from the verified session token
  if (!isId(channelId) || !isId(userId)) {
    return res.status(400).json({ message: "Invalid user or channel" });
  }
  if (channelId === userId) {
    return res.status(400).json({ message: "You can't subscribe to your own channel" });
  }
  try {
    const existing = await subscription.findOneAndDelete({
      subscriber: userId,
      channel: channelId,
    });
    if (!existing) {
      await subscription.create({ subscriber: userId, channel: channelId });
      notifyNewSubscriber(channelId, userId).catch((err) =>
        console.error("Notify error:", err)
      );
    }
    const count = await subscription.countDocuments({ channel: channelId });
    return res.status(200).json({ subscribed: !existing, count });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// Subscriber count, plus whether `userId` (optional query param) is subscribed.
export const getsubscriptionstatus = async (req, res) => {
  const { channelId } = req.params;
  const userId = req.userId; // optional: set only when signed in
  if (!isId(channelId)) {
    return res.status(400).json({ message: "Invalid channel" });
  }
  try {
    const [count, mine] = await Promise.all([
      subscription.countDocuments({ channel: channelId }),
      isId(userId)
        ? subscription.exists({ subscriber: userId, channel: channelId })
        : null,
    ]);
    return res.status(200).json({ subscribed: !!mine, count });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// Channels the user is subscribed to.
export const getsubscribedchannels = async (req, res) => {
  const { userId } = req.params;
  if (!isId(userId)) {
    return res.status(400).json({ message: "Invalid user" });
  }
  try {
    const subs = await subscription
      .find({ subscriber: userId })
      .sort({ createdAt: -1 })
      .populate({ path: "channel", select: "channelname name image description" });
    return res
      .status(200)
      .json(subs.filter((s) => s.channel).map((s) => s.channel));
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// Latest videos from every channel the user is subscribed to.
export const getsubscriptionfeed = async (req, res) => {
  const { userId } = req.params;
  if (!isId(userId)) {
    return res.status(400).json({ message: "Invalid user" });
  }
  try {
    const subs = await subscription.find({ subscriber: userId }).select("channel");
    const channelIds = subs.map((s) => s.channel.toString());
    const videos = await video
      .find({ uploader: { $in: channelIds } })
      .sort({ createdAt: -1 });
    return res.status(200).json(videos);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
