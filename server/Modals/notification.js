import mongoose from "mongoose";
const notificationschema = mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    type: { type: String, enum: ["upload", "subscribe"], required: true },
    // Who caused it: the uploading channel, or the new subscriber.
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
    actorName: { type: String, default: "" },
    actorImage: { type: String, default: "" },
    video: { type: mongoose.Schema.Types.ObjectId, ref: "videofiles" },
    videoTitle: { type: String, default: "" },
    thumbnail: { type: String, default: "" },
    read: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

notificationschema.index({ recipient: 1, createdAt: -1 });
// Old notifications are cleaned up automatically after 60 days.
notificationschema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 24 * 60 * 60 });

export default mongoose.model("notification", notificationschema);
