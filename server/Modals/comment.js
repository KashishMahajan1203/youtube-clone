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
    likes: { type: [String], default: [] },
    dislikes: { type: [String], default: [] },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("comment", commentschema);
