import mongoose from "mongoose";
const videochema = mongoose.Schema(
  {
    videotitle: { type: String, required: true },
    filename: { type: String, required: true },
    filetype: { type: String, required: true },
    filepath: { type: String, required: true },
    filesize: { type: String, required: true },
    videochanel: { type: String, required: true },
    Like: { type: Number, default: 0 },
    Dislike: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    uploader: { type: String },
    description: { type: String, default: "", maxlength: 5000 },
    category: { type: String, default: "Other" },
    thumbnail: { type: String, default: "" },
    // Second of the video to show as the preview frame when there is no thumbnail image.
    thumbnailTime: { type: Number, default: 0.5, min: 0 },
    // HLS manifest (.m3u8) for adaptive-bitrate playback; empty when the video
    // is only available as a single MP4.
    hls: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

videochema.index({ uploader: 1, createdAt: -1 });

export default mongoose.model("videofiles", videochema);
