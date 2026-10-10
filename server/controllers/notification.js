import mongoose from "mongoose";
import notification from "../Modals/notification.js";

const isId = (id) => mongoose.Types.ObjectId.isValid(id);

export const getnotifications = async (req, res) => {
  const { userId } = req.params;
  if (!isId(userId)) {
    return res.status(400).json({ message: "Invalid user" });
  }
  try {
    const [items, unread] = await Promise.all([
      notification.find({ recipient: userId }).sort({ createdAt: -1 }).limit(30),
      notification.countDocuments({ recipient: userId, read: false }),
    ]);
    return res.status(200).json({ items, unread });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// Body: { ids?: string[] } — marks those, or every notification, as read.
export const marknotificationsread = async (req, res) => {
  const { userId } = req.params;
  const { ids } = req.body || {};
  if (!isId(userId)) {
    return res.status(400).json({ message: "Invalid user" });
  }
  try {
    const filter = { recipient: userId, read: false };
    if (Array.isArray(ids) && ids.length) filter._id = { $in: ids.filter(isId) };
    await notification.updateMany(filter, { $set: { read: true } });
    const unread = await notification.countDocuments({ recipient: userId, read: false });
    return res.status(200).json({ unread });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
