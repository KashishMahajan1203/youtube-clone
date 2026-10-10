import mongoose from "mongoose";

const watchSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    required: true,
  },
  videoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "videos",
    required: true,
  },
  watchTime: {
    type: Number, // in seconds
    default: 0,
  },
  lastWatched: {
    type: Date,
    default: Date.now,
  },
});

// Compound index to ensure one session per user per video
watchSessionSchema.index({ userId: 1, videoId: 1 }, { unique: true });

export default mongoose.model("watchsession", watchSessionSchema);
