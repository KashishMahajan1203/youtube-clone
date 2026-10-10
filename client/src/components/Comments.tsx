import React, { useEffect, useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import {
  ThumbsUp,
  ThumbsDown,
  Globe,
  MapPin,
  ChevronDown,
  ChevronUp,
  Pin,
  MoreVertical,
  MessageSquare,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import ChannelAvatar from "./ChannelAvatar";
import { cn } from "@/lib/utils";

/* ===================== TYPES ===================== */

interface Comment {
  _id: string;
  videoid: string;
  userid: string;
  commentbody: string;
  usercommented: string;
  commentedon: string;
  createdAt?: string;
  city?: string;
  likes: string[];
  dislikes: string[];
  /** Top-level comment this replies to; null for top-level comments. */
  parent?: string | null;
  pinned?: boolean;
}

interface CommentsProps {
  videoId: string;
  /** The video's creator: can pin and remove any comment. */
  uploaderId?: string;
  channelName?: string;
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
const isValidComment = (text: string) => !/[^\p{L}\p{N}\s.,?!]/u.test(text);

const action =
  "h-8 gap-1.5 rounded-full px-3 text-xs font-medium text-muted-foreground hover:bg-white/[0.06] hover:text-foreground";

/* ===================== COMPOSER ===================== */

function Composer({
  placeholder,
  submitLabel,
  autoFocus,
  footer,
  compact,
  onSubmit,
  onCancel,
}: {
  placeholder: string;
  submitLabel: string;
  autoFocus?: boolean;
  footer?: React.ReactNode;
  compact?: boolean;
  onSubmit: (text: string) => Promise<boolean>;
  onCancel?: () => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      if (await onSubmit(text)) setText("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex-1 rounded-2xl border border-white/10 bg-white/[0.03] p-2 transition-colors focus-within:border-brand/40 focus-within:bg-white/[0.05]">
      <Textarea
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit();
          if (e.key === "Escape") onCancel?.();
        }}
        className={cn(
          "resize-none border-0 bg-transparent px-2 text-sm shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-0",
          compact ? "min-h-[44px]" : "min-h-[64px]"
        )}
      />
      <div className="mt-1 flex items-center justify-between gap-2 px-1">
        <span className="flex items-center gap-1 text-xs text-muted-foreground">{footer}</span>
        <div className="flex gap-1.5">
          {onCancel && (
            <Button size="sm" variant="ghost" className="h-8 rounded-full px-3" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            onClick={submit}
            disabled={busy || !text.trim()}
            size="sm"
            className="bg-gradient-brand h-8 rounded-full px-4 font-semibold text-white hover:opacity-95"
          >
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ===================== COMPONENT ===================== */

const Comments = ({ videoId, uploaderId, channelName }: CommentsProps) => {
  const { user } = useUser();

  const [comments, setComments] = useState<Comment[]>([]);
  const [translatedComments, setTranslatedComments] = useState<Record<string, string>>({});
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [userCity, setUserCity] = useState("Unknown");
  const [loading, setLoading] = useState(true);

  const isCreator = !!user?._id && user._id === uploaderId;

  /* ===================== LOAD ===================== */

  useEffect(() => {
    setExpanded(new Set());
    setReplyingTo(null);
    loadComments();
    fetchUserCity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Top-level comments in server order (pinned, then newest); replies
  // grouped under their parent, oldest first so conversations read naturally.
  const { topLevel, repliesOf } = useMemo(() => {
    const repliesOf = new Map<string, Comment[]>();
    const topLevel: Comment[] = [];
    for (const c of comments) {
      if (c.parent) {
        const list = repliesOf.get(c.parent) ?? [];
        list.push(c);
        repliesOf.set(c.parent, list);
      } else {
        topLevel.push(c);
      }
    }
    const time = (c: Comment) => new Date(c.createdAt || c.commentedon).getTime();
    repliesOf.forEach((list) => list.sort((a, b) => time(a) - time(b)));
    return { topLevel, repliesOf };
  }, [comments]);

  /* ===================== TRANSLATION ===================== */

  const handleTranslate = async (commentId: string, text: string, language: string) => {
    if (language === "Original") {
      const copy = { ...translatedComments };
      delete copy[commentId];
      setTranslatedComments(copy);
      return;
    }

    try {
      const targetLang = LANGUAGE_MAP[language];
      const res = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=Autodetect|${targetLang}`
      );
      const data = await res.json();

      setTranslatedComments((prev) => ({
        ...prev,
        [commentId]: data?.responseData?.translatedText || "Translation unavailable",
      }));
    } catch {
      setTranslatedComments((prev) => ({ ...prev, [commentId]: "Translation error" }));
    }
  };

  /* ===================== CREATE ===================== */

  const postComment = async (text: string, parentId?: string) => {
    if (!user) return false;
    if (!isValidComment(text)) {
      toast.error("Special characters are not allowed.");
      return false;
    }
    try {
      const res = await axiosInstance.post("/comment/postcomment", {
        videoid: videoId,
        commentbody: text,
        city: userCity,
        parentId,
      });
      const item: Comment = res.data.item;
      setComments((prev) => (item.parent ? [...prev, item] : [item, ...prev]));
      if (item.parent) {
        setExpanded((prev) => new Set(prev).add(item.parent!));
        setReplyingTo(null);
      }
      return true;
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Couldn't post your comment");
      return false;
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
      toast.error("Special characters are not allowed.");
      return;
    }

    await axiosInstance.post(`/comment/editcomment/${editingCommentId}`, {
      commentbody: editText,
    });

    setComments((prev) =>
      prev.map((c) => (c._id === editingCommentId ? { ...c, commentbody: editText.trim() } : c))
    );

    setEditingCommentId(null);
    setEditText("");
  };

  /* ===================== DELETE / PIN ===================== */

  // Removing a top-level comment removes its replies too (as on the server).
  const removeLocally = (id: string) =>
    setComments((prev) => prev.filter((c) => c._id !== id && c.parent !== id));

  const handleDelete = async (id: string) => {
    try {
      await axiosInstance.delete(`/comment/deletecomment/${id}`);
      removeLocally(id);
    } catch {
      toast.error("Couldn't delete the comment");
    }
  };

  const handlePin = async (comment: Comment) => {
    try {
      const res = await axiosInstance.patch(`/comment/pin/${comment._id}`);
      toast.success(res.data.pinned ? "Comment pinned" : "Comment unpinned");
      loadComments(); // server order: the pinned comment moves to the top
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Couldn't pin the comment");
    }
  };

  /* ===================== LIKE / DISLIKE ===================== */

  const requireUser = () => {
    if (!user) toast.info("Sign in to react to comments");
    return !!user;
  };

  const handleLike = async (id: string) => {
    if (!requireUser()) return;
    const res = await axiosInstance.patch(`/comment/like/${id}`);
    setComments((prev) => prev.map((c) => (c._id === id ? { ...c, ...res.data } : c)));
  };

  const handleDislike = async (id: string) => {
    if (!requireUser()) return;
    const res = await axiosInstance.patch(`/comment/dislike/${id}`);

    /* 🔴 Auto-remove after 2 dislikes */
    if (res.data.deleted || res.data.dislikes?.length >= 2) {
      removeLocally(id);
    } else {
      setComments((prev) => prev.map((c) => (c._id === id ? { ...c, ...res.data } : c)));
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

  const renderComment = (comment: Comment, isReply = false) => {
    const mine = comment.userid === user?._id;
    const byCreator = !!uploaderId && comment.userid === uploaderId;
    const canDelete = mine || isCreator;
    const canPin = isCreator && !isReply;
    const liked = !!user && comment.likes.includes(user._id);
    const disliked = !!user && comment.dislikes.includes(user._id);
    const replies = isReply ? [] : repliesOf.get(comment._id) ?? [];
    const open = expanded.has(comment._id);

    return (
      <div key={comment._id} className="group flex gap-3">
        <ChannelAvatar name={comment.usercommented} className={isReply ? "size-7" : "size-10"} />

        <div className="min-w-0 flex-1">
          {comment.pinned && (
            <p className="mb-1 flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <Pin className="size-3" /> Pinned by {channelName || "the creator"}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
            {byCreator ? (
              <strong className="rounded-full bg-white/[0.12] px-2 py-0.5 text-xs font-semibold">
                {comment.usercommented}
              </strong>
            ) : (
              <strong className="font-semibold">{comment.usercommented}</strong>
            )}
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.createdAt || comment.commentedon))} ago
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
            <p className="mt-1 whitespace-pre-line break-words text-sm leading-relaxed text-foreground/90">
              {translatedComments[comment._id] || comment.commentbody}
            </p>
          )}

          <div className="-ml-3 mt-1.5 flex flex-wrap items-center gap-0.5">
            <Button
              size="sm"
              variant="ghost"
              className={cn(action, liked && "text-foreground")}
              onClick={() => handleLike(comment._id)}
              aria-pressed={liked}
            >
              <ThumbsUp className={cn("size-3.5", liked && "fill-current")} /> {comment.likes.length}
            </Button>

            <Button
              size="sm"
              variant="ghost"
              className={cn(action, disliked && "text-foreground")}
              onClick={() => handleDislike(comment._id)}
              aria-pressed={disliked}
            >
              <ThumbsDown className={cn("size-3.5", disliked && "fill-current")} /> {comment.dislikes.length}
            </Button>

            {user && (
              <Button
                size="sm"
                variant="ghost"
                className={action}
                onClick={() => setReplyingTo(replyingTo === comment._id ? null : comment._id)}
              >
                Reply
              </Button>
            )}

            {translatedComments[comment._id] ? (
              <Button
                size="sm"
                variant="ghost"
                className={action}
                onClick={() => handleTranslate(comment._id, comment.commentbody, "Original")}
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
                      onClick={() => handleTranslate(comment._id, comment.commentbody, lang)}
                    >
                      {lang}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {(mine || canDelete || canPin) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Comment actions"
                    className="size-8 rounded-full p-0 text-muted-foreground opacity-60 transition-opacity hover:bg-white/[0.06] group-hover:opacity-100"
                  >
                    <MoreVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="rounded-xl border-white/10 bg-popover/95 backdrop-blur-xl">
                  {canPin && (
                    <DropdownMenuItem className="rounded-lg" onClick={() => handlePin(comment)}>
                      <Pin className="size-4" /> {comment.pinned ? "Unpin" : "Pin"}
                    </DropdownMenuItem>
                  )}
                  {mine && (
                    <DropdownMenuItem className="rounded-lg" onClick={() => handleEdit(comment)}>
                      Edit
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <DropdownMenuItem
                      className="rounded-lg text-red-400 focus:text-red-400"
                      onClick={() => handleDelete(comment._id)}
                    >
                      {mine ? "Delete" : "Remove"}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {replyingTo === comment._id && user && (
            <div className="mt-2 flex gap-3">
              <Avatar className="size-7">
                <AvatarImage src={user.image || ""} />
                <AvatarFallback className="bg-gradient-brand text-xs font-semibold text-white">
                  {user.name?.[0]}
                </AvatarFallback>
              </Avatar>
              <Composer
                compact
                autoFocus
                placeholder={`Reply to ${comment.usercommented}…`}
                submitLabel="Reply"
                onSubmit={(text) => postComment(text, comment._id)}
                onCancel={() => setReplyingTo(null)}
              />
            </div>
          )}

          {replies.length > 0 && (
            <>
              <button
                onClick={() =>
                  setExpanded((prev) => {
                    const next = new Set(prev);
                    if (next.has(comment._id)) next.delete(comment._id);
                    else next.add(comment._id);
                    return next;
                  })
                }
                className="-ml-3 mt-1 flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-brand transition-colors hover:bg-brand/10"
              >
                {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                {replies.length} {replies.length === 1 ? "reply" : "replies"}
              </button>
              {open && (
                <div className="mt-3 space-y-4">{replies.map((r) => renderComment(r, true))}</div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

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
          <Composer
            placeholder="Add a comment in any language…"
            submitLabel="Comment"
            onSubmit={(text) => postComment(text)}
            footer={
              <>
                <MapPin className="size-3" /> {userCity}
              </>
            }
          />
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-white/10 px-4 py-3 text-sm text-muted-foreground">
          Sign in to join the conversation.
        </p>
      )}

      {topLevel.length === 0 ? (
        <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <MessageSquare className="size-4" /> No comments yet. Start the conversation!
        </p>
      ) : (
        <div className="space-y-6">{topLevel.map((c) => renderComment(c))}</div>
      )}
    </section>
  );
};

export default Comments;
