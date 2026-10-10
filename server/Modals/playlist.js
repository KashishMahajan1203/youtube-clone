import mongoose from "mongoose";
const playlistschema = mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, default: "", maxlength: 5000 },
    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "private",
    },
    videos: [{ type: mongoose.Schema.Types.ObjectId, ref: "videofiles" }],
  },
  {
    timestamps: true,
  }
);

playlistschema.index({ owner: 1, updatedAt: -1 });

export default mongoose.model("playlist", playlistschema);
