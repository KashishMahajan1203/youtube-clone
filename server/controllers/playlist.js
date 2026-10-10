import mongoose from "mongoose";
import playlist from "../Modals/playlist.js";

const isId = (id) => mongoose.Types.ObjectId.isValid(id);
const VISIBILITY = ["public", "private"];

// The acting user always comes from the verified session token (req.userId).
const loadOwned = async (playlistId, userId, res) => {
  if (!isId(playlistId) || !isId(userId)) {
    res.status(400).json({ message: "Invalid playlist or user" });
    return null;
  }
  const doc = await playlist.findById(playlistId);
  if (!doc) {
    res.status(404).json({ message: "Playlist not found" });
    return null;
  }
  if (doc.owner.toString() !== userId) {
    res.status(403).json({ message: "You can only change your own playlists" });
    return null;
  }
  return doc;
};

export const createplaylist = async (req, res) => {
  const { title, description = "", visibility = "private", videoId } = req.body;
  const userId = req.userId; // from the verified session token
  if (!isId(userId) || !title?.trim()) {
    return res.status(400).json({ message: "A title is required" });
  }
  try {
    const doc = await playlist.create({
      owner: userId,
      title: title.trim().slice(0, 150),
      description: String(description).slice(0, 5000),
      visibility: VISIBILITY.includes(visibility) ? visibility : "private",
      videos: isId(videoId) ? [videoId] : [],
    });
    return res.status(201).json(doc);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// A user's playlists. Private ones are only included when the owner is the
// one asking. Each item carries the first video for a cover.
export const getuserplaylists = async (req, res) => {
  const { userId } = req.params;
  const viewerId = req.userId;
  if (!isId(userId)) {
    return res.status(400).json({ message: "Invalid user" });
  }
  try {
    const filter = { owner: userId };
    if (viewerId !== userId) filter.visibility = "public";
    const docs = await playlist
      .find(filter)
      .sort({ updatedAt: -1 })
      .populate({ path: "videos", model: "videofiles", select: "filepath thumbnail" });
    return res.status(200).json(
      docs.map((d) => {
        const videos = d.videos.filter(Boolean);
        return {
          _id: d._id,
          title: d.title,
          description: d.description,
          visibility: d.visibility,
          updatedAt: d.updatedAt,
          videoIds: videos.map((v) => v._id),
          count: videos.length,
          cover: videos[0] || null,
        };
      })
    );
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getplaylist = async (req, res) => {
  const { id } = req.params;
  const viewerId = req.userId;
  if (!isId(id)) {
    return res.status(404).json({ message: "Playlist not found" });
  }
  try {
    const doc = await playlist
      .findById(id)
      .populate({ path: "videos", model: "videofiles" })
      .populate({ path: "owner", select: "channelname name image" });
    if (!doc) {
      return res.status(404).json({ message: "Playlist not found" });
    }
    const ownerId = doc.owner?._id?.toString();
    if (doc.visibility === "private" && ownerId !== viewerId) {
      return res.status(404).json({ message: "Playlist not found" });
    }
    const out = doc.toObject();
    out.videos = out.videos.filter(Boolean); // drop deleted videos
    return res.status(200).json(out);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const updateplaylist = async (req, res) => {
  const { title, description, visibility } = req.body;
  const userId = req.userId; // from the verified session token
  try {
    const doc = await loadOwned(req.params.id, userId, res);
    if (!doc) return;
    if (title !== undefined) {
      if (!title.trim()) return res.status(400).json({ message: "A title is required" });
      doc.title = title.trim().slice(0, 150);
    }
    if (description !== undefined) doc.description = String(description).slice(0, 5000);
    if (VISIBILITY.includes(visibility)) doc.visibility = visibility;
    await doc.save();
    return res.status(200).json(doc);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const deleteplaylist = async (req, res) => {
  const userId = req.userId; // from the verified session token
  try {
    const doc = await loadOwned(req.params.id, userId, res);
    if (!doc) return;
    await doc.deleteOne();
    return res.status(200).json({ deleted: true });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// Body: { userId, videoId } — adds the video if missing, removes it if present.
export const togglevideo = async (req, res) => {
  const { videoId } = req.body;
  const userId = req.userId; // from the verified session token
  if (!isId(videoId)) {
    return res.status(400).json({ message: "Invalid video" });
  }
  try {
    const doc = await loadOwned(req.params.id, userId, res);
    if (!doc) return;
    const has = doc.videos.some((v) => v.toString() === videoId);
    await playlist.updateOne(
      { _id: doc._id },
      has ? { $pull: { videos: videoId } } : { $addToSet: { videos: videoId } }
    );
    return res.status(200).json({ added: !has });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
