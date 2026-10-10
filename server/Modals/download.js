import mongoose from "mongoose";

const downloadSchema = mongoose.Schema(
    {
        viewer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
            required: true,
        },
        videoid: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "videofiles",
            required: true,
        },
        downloadedOn: { type: Date, default: Date.now },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("download", downloadSchema);
