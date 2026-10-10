import crypto from "crypto";
import mongoose from "mongoose";
import video from "../Modals/video.js";
import view from "../Modals/view.js";

// Refreshing or re-opening a video within this window doesn't add a view.
export const VIEW_DEDUP_WINDOW_MS = 30 * 60 * 1000;

const hashIp = (ip) =>
  "ip:" + crypto.createHash("sha256").update(String(ip || "unknown")).digest("hex").slice(0, 32);

/**
 * Count a view of `videoId`, unless the same viewer (user id, or hashed IP
 * when signed out) already viewed it recently.
 * @returns {Promise<boolean>} whether the view was counted
 */
export async function recordView(videoId, { userId, ip } = {}) {
  if (!mongoose.Types.ObjectId.isValid(videoId)) return false;
  const doc = await video.findById(videoId).select("uploader");
  if (!doc) return false;

  const viewerKey = userId ? `user:${userId}` : hashIp(ip);
  const recent = await view.exists({
    video: videoId,
    viewerKey,
    createdAt: { $gt: new Date(Date.now() - VIEW_DEDUP_WINDOW_MS) },
  });
  if (recent) return false;

  await Promise.all([
    view.create({ video: videoId, channel: doc.uploader || "", viewerKey }),
    video.updateOne({ _id: videoId }, { $inc: { views: 1 } }),
  ]);
  return true;
}
