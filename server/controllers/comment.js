import comment from "../Modals/comment.js";
import mongoose from "mongoose";
import users from "../Modals/Auth.js";

export const postcomment = async (req, res) => {
  const { videoid, commentbody, city } = req.body;
  if (!mongoose.Types.ObjectId.isValid(videoid) || !commentbody?.trim()) {
    return res.status(400).json({ message: "A video and comment text are required" });
  }
  try {
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
    });
    await postcomment.save();
    return res.status(200).json({ comment: true });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
export const getallcomment = async (req, res) => {
  const { videoid } = req.params;
  try {
    const commentvideo = await comment.find({ videoid: videoid });
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
    const deleted = await comment.findOneAndDelete({ _id, userid: req.userId });
    if (!deleted) {
      return res.status(404).json({ message: "Comment not found or not yours" });
    }
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
  try {
    const updatecomment = await comment.findOneAndUpdate(
      { _id, userid: req.userId },
      { $set: { commentbody: commentbody } },
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
      await comment.findByIdAndDelete(_id);
      return res.status(200).json({ deleted: true, message: "Comment deleted due to excessive dislikes" });
    }

    await comment.findByIdAndUpdate(_id, commentData);
    res.status(200).json(commentData);
  } catch (error) {
    console.error(" error:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
};
