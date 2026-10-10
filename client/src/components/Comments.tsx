import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { ThumbsUp, ThumbsDown, Globe, MapPin, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import ChannelAvatar from "./ChannelAvatar";

/* ===================== TYPES ===================== */

interface Comment {
  _id: string;
  videoid: string;
  userid: string;
  commentbody: string;
  usercommented: string;
  commentedon: string;
  city?: string;
  likes: string[];
  dislikes: string[];
}

/* ===================== LANGUAGE MAP ===================== */

const LANGUAGE_MAP: Record<string, string> = {
  English: "en",
  Hindi: "hi",
  Spanish: "es",
  French: "fr",
  German: "de",
  Chinese: "zh",
  Japanese: "ja",
  Arabic: "ar",
};

/* ===================== COMPONENT ===================== */

const Comments = ({ videoId }: { videoId: string }) => {
  const { user } = useUser();

  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [translatedComments, setTranslatedComments] = useState<
    Record<string, string>
  >({});
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [userCity, setUserCity] = useState("Unknown");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* ===================== LOAD ===================== */

  useEffect(() => {
    loadComments();
    fetchUserCity();
  }, [videoId]);

  const fetchUserCity = async () => {
    try {
      const res = await fetch("https://ipapi.co/json/");
      const data = await res.json();
      if (data.city) setUserCity(data.city);
    } catch {
      setUserCity("Unknown");
    }
  };

  const loadComments = async () => {
    try {
      const res = await axiosInstance.get(`/comment/${videoId}`);
      setComments(res.data);
    } finally {
      setLoading(false);
    }
  };

  /* ===================== VALIDATION ===================== */
  /**
   * Allows:
   * - All Unicode languages
   * - Numbers
   * - Spaces
   * - Basic punctuation
   * Blocks:
   * - Emojis
   * - Symbols like @ # $ % ^ & *
   */
  const isValidComment = (text: string) => {
    const invalidRegex = /[^\p{L}\p{N}\s.,?!]/u;
    return !invalidRegex.test(text);
  };

  /* ===================== TRANSLATION ===================== */

  const handleTranslate = async (
    commentId: string,
    text: string,
    language: string
  ) => {
    if (language === "Original") {
      const copy = { ...translatedComments };
      delete copy[commentId];
      setTranslatedComments(copy);
      return;
    }

    try {
      const targetLang = LANGUAGE_MAP[language];
      const res = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
          text
        )}&langpair=Autodetect|${targetLang}`
      );
      const data = await res.json();

      setTranslatedComments((prev) => ({
        ...prev,
        [commentId]:
          data?.responseData?.translatedText || "Translation unavailable",
      }));
    } catch {
      setTranslatedComments((prev) => ({
        ...prev,
        [commentId]: "Translation error",
      }));
    }
  };

  /* ===================== CREATE ===================== */

  const handleSubmit = async () => {
    if (!user || !newComment.trim()) return;

    if (!isValidComment(newComment)) {
      alert("Special characters are not allowed.");
      return;
    }

    setIsSubmitting(true);
    try {
      await axiosInstance.post("/comment/postcomment", {
        videoid: videoId,
        userid: user._id,
        commentbody: newComment,
        usercommented: user.name,
        city: userCity,
      });
      setNewComment("");
      loadComments();
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ===================== EDIT ===================== */

  const handleEdit = (comment: Comment) => {
    setEditingCommentId(comment._id);
    setEditText(comment.commentbody);
  };

  const handleUpdate = async () => {
    if (!editingCommentId || !editText.trim()) return;

    if (!isValidComment(editText)) {
      alert("Special characters are not allowed.");
      return;
    }

    await axiosInstance.post(`/comment/editcomment/${editingCommentId}`, {
      commentbody: editText,
    });

    setComments((prev) =>
      prev.map((c) =>
        c._id === editingCommentId ? { ...c, commentbody: editText } : c
      )
    );

    setEditingCommentId(null);
    setEditText("");
  };

  /* ===================== DELETE ===================== */

  const handleDelete = async (id: string) => {
    await axiosInstance.delete(`/comment/deletecomment/${id}`);
    setComments((prev) => prev.filter((c) => c._id !== id));
  };

  /* ===================== LIKE / DISLIKE ===================== */

  const handleLike = async (id: string) => {
    const res = await axiosInstance.patch(`/comment/like/${id}`, {
      userId: user?._id,
    });
    setComments((prev) => prev.map((c) => (c._id === id ? res.data : c)));
  };

  const handleDislike = async (id: string) => {
    const res = await axiosInstance.patch(`/comment/dislike/${id}`, {
      userId: user?._id,
    });

    /* 🔴 Auto-remove after 2 dislikes */
    if (res.data.deleted || res.data.dislikes?.length >= 2) {
      setComments((prev) => prev.filter((c) => c._id !== id));
    } else {
      setComments((prev) => prev.map((c) => (c._id === id ? res.data : c)));
    }
  };

  /* ===================== RENDER ===================== */

  if (loading)
    return (
      <div className="space-y-5">
        <div className="skeleton h-6 w-32 rounded" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="skeleton size-10 rounded-full" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="skeleton h-3 w-40 rounded" />
              <div className="skeleton h-3 w-3/4 rounded" />
            </div>
          </div>
        ))}
      </div>
    );

  const action =
    "h-8 gap-1.5 rounded-full px-3 text-xs font-medium text-muted-foreground hover:bg-white/[0.06] hover:text-foreground";

  return (
    <section className="space-y-6 pt-2">
      <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
        Comments
        <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
          {comments.length}
        </span>
      </h2>

      {user ? (
        <div className="flex gap-3">
          <Avatar className="size-10">
            <AvatarImage src={user.image || ""} />
            <AvatarFallback className="bg-gradient-brand font-semibold text-white">{user.name?.[0]}</AvatarFallback>
          </Avatar>

          <div className="flex-1 rounded-2xl border border-white/10 bg-white/[0.03] p-2 transition-colors focus-within:border-brand/40 focus-within:bg-white/[0.05]">
            <Textarea
              placeholder="Add a comment in any language…"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[64px] resize-none border-0 bg-transparent px-2 text-sm shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-0"
            />
            <div className="mt-1 flex items-center justify-between px-1">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3" /> {userCity}
              </span>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !newComment.trim()}
                size="sm"
                className="bg-gradient-brand h-8 rounded-full px-4 font-semibold text-white hover:opacity-95"
              >
                Comment
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-white/10 px-4 py-3 text-sm text-muted-foreground">
          Sign in to join the conversation.
        </p>
      )}

      <div className="space-y-6">
        {comments.map((comment) => (
          <div key={comment._id} className="group flex gap-3">
            <ChannelAvatar name={comment.usercommented} className="size-10" />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                <strong className="font-semibold">{comment.usercommented}</strong>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.commentedon))} ago
                </span>
                {comment.city && (
                  <span className="flex items-center gap-1 rounded-full bg-white/[0.05] px-2 py-0.5 text-[11px] text-muted-foreground">
                    <MapPin className="size-3" /> {comment.city}
                  </span>
                )}
              </div>

              {editingCommentId === comment._id ? (
                <>
                  <Textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="mt-2 rounded-xl border-white/10 bg-white/[0.03]"
                  />
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" className="rounded-full" onClick={handleUpdate}>
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-full"
                      onClick={() => setEditingCommentId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-foreground/90">
                  {translatedComments[comment._id] || comment.commentbody}
                </p>
              )}

              <div className="-ml-3 mt-1.5 flex flex-wrap items-center gap-0.5">
                <Button
                  size="sm"
                  variant="ghost"
                  className={action}
                  onClick={() => handleLike(comment._id)}
                >
                  <ThumbsUp className="size-3.5" /> {comment.likes.length}
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  className={action}
                  onClick={() => handleDislike(comment._id)}
                >
                  <ThumbsDown className="size-3.5" /> {comment.dislikes.length}
                </Button>

                {translatedComments[comment._id] ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className={action}
                    onClick={() =>
                      handleTranslate(
                        comment._id,
                        comment.commentbody,
                        "Original"
                      )
                    }
                  >
                    <Globe className="size-3.5" /> Show original
                  </Button>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost" className={action}>
                        <Globe className="size-3.5" /> Translate
                        <ChevronDown className="size-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="max-h-72 overflow-y-auto rounded-xl border-white/10 bg-popover/95 backdrop-blur-xl">
                      {Object.keys(LANGUAGE_MAP).map((lang) => (
                        <DropdownMenuItem
                          key={lang}
                          className="rounded-lg"
                          onClick={() =>
                            handleTranslate(
                              comment._id,
                              comment.commentbody,
                              lang
                            )
                          }
                        >
                          {lang}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {comment.userid === user?._id && (
                  <div className="ml-1 flex gap-1 text-xs font-medium text-muted-foreground">
                    <button onClick={() => handleEdit(comment)} className="rounded-full px-2.5 py-1.5 transition-colors hover:bg-white/[0.06] hover:text-foreground">Edit</button>
                    <button onClick={() => handleDelete(comment._id)} className="rounded-full px-2.5 py-1.5 transition-colors hover:bg-red-500/10 hover:text-red-400">
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Comments;
