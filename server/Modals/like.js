import mongoose from "mongoose";
const likeschema = mongoose.Schema(
  {
    viewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    videoid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "videofiles",
      required: true,
    },
    // Records created before dislikes existed have no `type` and count as likes.
    type: { type: String, enum: ["like", "dislike"], default: "like" },
    likedon: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("like", likeschema);
