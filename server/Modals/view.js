import mongoose from "mongoose";

// One document per counted view. Powers the Creator Studio charts and lets us
// ignore repeat views from the same person within a short window.
const viewschema = mongoose.Schema(
  {
    video: { type: mongoose.Schema.Types.ObjectId, ref: "videofiles", required: true },
    // Owner of the video at view time, so channel stats need no join.
    channel: { type: String, required: true },
    // Signed-in user id, or a hash of the client IP for anonymous viewers.
    viewerKey: { type: String, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

viewschema.index({ channel: 1, createdAt: -1 });
viewschema.index({ video: 1, viewerKey: 1, createdAt: -1 });

export default mongoose.model("view", viewschema);
