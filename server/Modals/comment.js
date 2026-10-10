import mongoose from "mongoose";
const commentschema = mongoose.Schema(
  {
    userid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    videoid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "videofiles",
      required: true,
    },
    commentbody: { type: String },
    usercommented: { type: String },
    commentedon: { type: Date, default: Date.now },
    city: { type: String },
    // Replies point at their top-level comment (one level deep, like YouTube).
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "comment",
      default: null,
    },
    // Pinned to the top of the thread by the video's creator.
    pinned: { type: Boolean, default: false },
    likes: { type: [String], default: [] },
    dislikes: { type: [String], default: [] },
  },
  {
    timestamps: true,
  }
);

commentschema.index({ videoid: 1, parent: 1 });

export default mongoose.model("comment", commentschema);
