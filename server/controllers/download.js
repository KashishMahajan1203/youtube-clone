import download from "../Modals/download.js";

export const handledownload = async (req, res) => {
    const userId = req.userId; // from the verified session token
    const { videoId } = req.params;
    try {
        const existingDownload = await download.findOne({
            viewer: userId,
            videoid: videoId,
        });
        if (existingDownload) {
            await download.findByIdAndDelete(existingDownload._id);
            return res.status(200).json({ downloaded: false });
        } else {
            await download.create({ viewer: userId, videoid: videoId });
            return res.status(200).json({ downloaded: true });
        }
    } catch (error) {
        console.error("error:", error);
        return res.status(500).json({ message: "Something went wrong" });
    }
};

export const getalldownloads = async (req, res) => {
    const { userId } = req.params;
    try {
        const downloadedVideos = await download
            .find({ viewer: userId })
            .populate({
                path: "videoid",
                model: "videofiles",
            })
            .exec();
        return res.status(200).json(downloadedVideos);
    } catch (error) {
        console.error("error:", error);
        return res.status(500).json({ message: "Something went wrong" });
    }
};

export const deletedownload = async (req, res) => {
    const { id } = req.params;
    try {
        const deleted = await download.findOneAndDelete({ _id: id, viewer: req.userId });
        if (!deleted) {
            return res.status(404).json({ message: "Download not found" });
        }
        return res.status(200).json({ message: "Download removed successfully" });
    } catch (error) {
        console.error("error:", error);
        return res.status(500).json({ result: "Something went wrong" });
    }
};
