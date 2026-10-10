import comment from "../Modals/comment.js";
import mongoose from "mongoose";
import users from "../Modals/Auth.js";
import video from "../Modals/video.js";
import { notifyReply } from "../services/notifications.js";

const isId = (id) => mongoose.Types.ObjectId.isValid(id);

// Body: { videoid, commentbody, city?, parentId? }. A reply to a reply is
// attached to the top-level comment, so threads stay one level deep.
export const postcomment = async (req, res) => {
  const { videoid, commentbody, city, parentId } = req.body;
  if (!isId(videoid) || typeof commentbody !== "string" || !commentbody.trim()) {
    return res.status(400).json({ message: "A video and comment text are required" });
  }
  if (commentbody.length > 2000) {
    return res.status(400).json({ message: "Comments can be at most 2000 characters" });
  }
  try {
    const videoDoc = await video.findById(videoid).select("videotitle thumbnail");
    if (!videoDoc) {
      return res.status(404).json({ message: "Video not found" });
    }
    let parent = null;
    if (parentId) {
      parent = isId(parentId) ? await comment.findById(parentId) : null;
      if (!parent || String(parent.videoid) !== String(videoid)) {
        return res.status(404).json({ message: "The comment you replied to no longer exists" });
      }
      if (parent.parent) parent = await comment.findById(parent.parent);
      if (!parent) {
        return res.status(404).json({ message: "The comment you replied to no longer exists" });
      }
    }
    // Author identity comes from the session, not the request body.
    const author = await users.findById(req.userId).select("name channelname");
    if (!author) {
      return res.status(401).json({ message: "Account not found", code: "AUTH_REQUIRED" });
    }
    const postcomment = new comment({
      videoid,
      commentbody: commentbody.trim(),
      city,
      userid: req.userId,
      usercommented: author.name || author.channelname || "User",
      parent: parent?._id ?? null,
    });
    await postcomment.save();
    if (parent) {
      notifyReply(parent, postcomment, videoDoc).catch((err) => console.error("Notify error:", err));
    }
    return res.status(200).json({ comment: true, item: postcomment });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
export const getallcomment = async (req, res) => {
  const { videoid } = req.params;
  try {
    if (!isId(videoid)) return res.status(200).json([]);
    // Flat list (top-level and replies); the client nests replies under
    // their parent. Pinned first, then newest.
    const commentvideo = await comment
      .find({ videoid: videoid })
      .sort({ pinned: -1, createdAt: -1 });
    return res.status(200).json(commentvideo);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
export const deletecomment = async (req, res) => {
  const { id: _id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }
  try {
    // The author can delete their comment; the video's creator can moderate
    // any comment on their video.
    const target = await comment.findById(_id);
    const videoDoc = target && (await video.findById(target.videoid).select("uploader"));
    const allowed =
      target &&
      (String(target.userid) === String(req.userId) || videoDoc?.uploader === String(req.userId));
    if (!allowed) {
      return res.status(404).json({ message: "Comment not found or not yours" });
    }
    await comment.deleteMany({ $or: [{ _id }, { parent: _id }] });
    return res.status(200).json({ comment: true });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const editcomment = async (req, res) => {
  const { id: _id } = req.params;
  const { commentbody } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }
  if (typeof commentbody !== "string" || !commentbody.trim() || commentbody.length > 2000) {
    return res.status(400).json({ message: "Comment text is required (max 2000 characters)" });
  }
  try {
    const updatecomment = await comment.findOneAndUpdate(
      { _id, userid: req.userId },
      { $set: { commentbody: commentbody.trim() } },
      { new: true }
    );
    if (!updatecomment) {
      return res.status(404).json({ message: "Comment not found or not yours" });
    }
    res.status(200).json(updatecomment);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const likeComment = async (req, res) => {
  const { id: _id } = req.params;
  const userId = req.userId; // from the verified session token
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }
  try {
    const commentData = await comment.findById(_id);
    if (!commentData) {
      return res.status(404).json({ message: "Comment not found" });
    }
    const likeIndex = commentData.likes.findIndex((id) => id === String(userId));
    const dislikeIndex = commentData.dislikes.findIndex((id) => id === String(userId));

    if (likeIndex === -1) {
      commentData.likes.push(userId);
      if (dislikeIndex !== -1) {
        commentData.dislikes = commentData.dislikes.filter((id) => id !== String(userId));
      }
    } else {
      commentData.likes = commentData.likes.filter((id) => id !== String(userId));
    }
    await comment.findByIdAndUpdate(_id, commentData);
    res.status(200).json(commentData);
  } catch (error) {
    console.error(" error:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

export const dislikeComment = async (req, res) => {
  const { id: _id } = req.params;
  const userId = req.userId; // from the verified session token
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }
  try {
    const commentData = await comment.findById(_id);
    if (!commentData) {
      return res.status(404).json({ message: "Comment not found" });
    }
    const likeIndex = commentData.likes.findIndex((id) => id === String(userId));
    const dislikeIndex = commentData.dislikes.findIndex((id) => id === String(userId));

    if (dislikeIndex === -1) {
      commentData.dislikes.push(userId);
      if (likeIndex !== -1) {
        commentData.likes = commentData.likes.filter((id) => id !== String(userId));
      }
    } else {
      commentData.dislikes = commentData.dislikes.filter((id) => id !== String(userId));
    }

    if (commentData.dislikes.length >= 2) {
      await comment.deleteMany({ $or: [{ _id }, { parent: _id }] });
      return res.status(200).json({ deleted: true, message: "Comment deleted due to excessive dislikes" });
    }

    await comment.findByIdAndUpdate(_id, commentData);
    res.status(200).json(commentData);
  } catch (error) {
    console.error(" error:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

// PATCH /comment/pin/:id — the video's creator pins (or unpins) a top-level
// comment. Only one comment per video is pinned at a time.
export const pincomment = async (req, res) => {
  const { id: _id } = req.params;
  if (!isId(_id)) {
    return res.status(404).json({ message: "Comment not found" });
  }
  try {
    const target = await comment.findById(_id);
    if (!target) {
      return res.status(404).json({ message: "Comment not found" });
    }
    const videoDoc = await video.findById(target.videoid).select("uploader");
    if (videoDoc?.uploader !== String(req.userId)) {
      return res.status(403).json({ message: "Only the video's creator can pin comments" });
    }
    if (target.parent) {
      return res.status(400).json({ message: "Replies can't be pinned" });
    }
    const pinned = !target.pinned;
    if (pinned) {
      await comment.updateMany({ videoid: target.videoid, pinned: true }, { $set: { pinned: false } });
    }
    target.pinned = pinned;
    await target.save();
    return res.status(200).json({ pinned });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
