import React, { useEffect, useState } from "react";
import { Button } from "./ui/button";
import {
  Check,
  ListPlus,
  Download,
  Share2,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import ChannelAvatar from "./ChannelAvatar";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";
import { useRouter } from "next/router";
import SubscribeButton from "./SubscribeButton";
import SaveToPlaylistDialog from "./SaveToPlaylistDialog";
import Link from "next/link";
import { useSubscription } from "@/hooks/useSubscription";
import { formatCount } from "@/lib/media";

const VideoInfo = ({ video }: any) => {
  const [likes, setlikes] = useState(video.Like || 0);
  const [dislikes, setDislikes] = useState(video.Dislike || 0);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const { user } = useUser();
  const router = useRouter();
  const [isWatchLater, setIsWatchLater] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);

  const subscription = useSubscription(video.uploader);

  const applyReaction = (data: any) => {
    setlikes(data.likes);
    setDislikes(data.dislikes);
    setIsLiked(data.liked);
    setIsDisliked(data.disliked);
  };

  useEffect(() => {
    setlikes(video.Like || 0);
    setDislikes(video.Dislike || 0);
    setIsLiked(false);
    setIsDisliked(false);
    if (!user?._id) return;
    axiosInstance
      .get(`/like/status/${video._id}/${user._id}`)
      .then((res) => applyReaction(res.data))
      .catch((error) => console.log(error));
    axiosInstance
      .get(`/watch/${user._id}`)
      .then((res) =>
        setIsWatchLater(res.data.some((item: any) => item.videoid?._id === video._id))
      )
      .catch((error) => console.log(error));
  }, [video._id, user?._id]);

  useEffect(() => {
    const handleviews = async () => {
      if (user) {
        try {
          return await axiosInstance.post(`/history/${video._id}`, {
            userId: user?._id,
          });
        } catch (error) {
          return console.log(error);
        }
      } else {
        axiosInstance.post(`/history/views/${video?._id}`);
      }
    };
    handleviews();
  }, [user]);
  const react = async (type: "like" | "dislike") => {
    if (!user) {
      toast.info(`Sign in to ${type} videos`);
      return;
    }
    try {
      const res = await axiosInstance.post(`/like/${video._id}`, {
        userId: user?._id,
        type,
      });
      applyReaction(res.data);
    } catch (error) {
      console.log(error);
      toast.error("Couldn't save your reaction");
    }
  };
  const handleLike = () => react("like");
  const handleDislike = () => react("dislike");

  useEffect(() => {
    const checkDownloadStatus = async () => {
      if (!user) return;
      try {
        const res = await axiosInstance.get(`/download/getall/${user._id}`);
        const isDownloaded = res.data.some((item: any) => item.videoid._id === video._id);
        setIsDownloaded(isDownloaded);
      } catch (error) {
        console.log(error);
      }
    };
    if (video) {
      checkDownloadStatus();
    }
  }, [user, video]);

  const handleDownload = async () => {
    if (!user) return;
    try {
      const res = await axiosInstance.post(`/download/${video._id}`, {
        userId: user._id,
      });
      if (res.data.downloaded) {
        setIsDownloaded(true);
        toast.success("Video downloaded", {
          description: "You can view it in the downloads section.",
          action: {
            label: "Go to Downloads",
            onClick: () => router.push("/downloads"),
          },
        });
      } else {
        setIsDownloaded(false);
        toast.info("Video removed from downloads");
      }
    } catch (error: any) {
      console.log(error);
      toast.error(error?.response?.data?.message || "An error occurred while handling download");
    }
  };

  const handleWatchLater = async () => {
    if (!user) {
      toast.info("Sign in to save videos");
      return;
    }
    try {
      const res = await axiosInstance.post(`/watch/${video._id}`, {
        userId: user?._id,
      });
      setIsWatchLater(res.data.watchlater);
      toast.success(res.data.watchlater ? "Saved to Watch later" : "Removed from Watch later");
    } catch (error) {
      console.log(error);
    }
  };
  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: video.videotitle, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
      }
    } catch {
      /* user cancelled share sheet */
    }
  };

  const pill =
    "h-10 shrink-0 gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 text-sm font-medium hover:bg-white/[0.1]";

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold leading-snug tracking-tight sm:text-2xl">
        {video.videotitle}
      </h1>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <Link href={video.uploader ? `/channel/${video.uploader}` : "#"} className="flex min-w-0 items-center gap-3">
            <ChannelAvatar name={video.videochanel} className="size-11 text-base" />
            <div className="min-w-0">
              <h3 className="truncate font-semibold hover:text-white">{video.videochanel}</h3>
              <p className="text-xs text-muted-foreground">
                {subscription.count === null
                  ? `Uploaded ${formatDistanceToNow(new Date(video.createdAt))} ago`
                  : `${formatCount(subscription.count)} ${subscription.count === 1 ? "subscriber" : "subscribers"}`}
              </p>
            </div>
          </Link>
          {video.uploader && !subscription.isOwnChannel && (
            <SubscribeButton
              className="ml-3"
              subscribed={subscription.subscribed}
              onToggle={subscription.toggle}
              disabled={subscription.pending}
            />
          )}
        </div>

        <div className="scrollbar-hide -mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0 lg:pb-0">
          <div className="flex h-10 shrink-0 items-center overflow-hidden rounded-full border border-white/10 bg-white/[0.05]">
            <button
              className={`flex h-full items-center gap-2 pl-4 pr-3 text-sm font-medium transition-colors hover:bg-white/[0.08] ${isLiked ? "text-brand" : ""}`}
              onClick={handleLike}
              aria-pressed={isLiked}
              aria-label="Like"
            >
              <ThumbsUp className={`size-[18px] ${isLiked ? "fill-current" : ""}`} />
              <span className="tabular-nums">{likes.toLocaleString()}</span>
            </button>
            <div className="h-5 w-px bg-white/15" />
            <button
              className={`flex h-full items-center gap-2 pl-3 pr-4 text-sm font-medium transition-colors hover:bg-white/[0.08] ${isDisliked ? "text-brand" : ""}`}
              onClick={handleDislike}
              aria-pressed={isDisliked}
              aria-label="Dislike"
            >
              <ThumbsDown className={`size-[18px] ${isDisliked ? "fill-current" : ""}`} />
              <span className="tabular-nums">{dislikes.toLocaleString()}</span>
            </button>
          </div>
          <Button variant="ghost" className={pill} onClick={handleShare}>
            <Share2 className="size-[18px]" />
            Share
          </Button>
          <Button
            variant="ghost"
            className={pill}
            onClick={() => {
              if (!user) {
                toast.info("Sign in to save videos");
                return;
              }
              setSaveOpen(true);
            }}
          >
            <ListPlus className="size-[18px]" />
            Save
          </Button>
          {user && (
            <SaveToPlaylistDialog
              open={saveOpen}
              onOpenChange={setSaveOpen}
              userId={user._id}
              videoId={video._id}
              isWatchLater={isWatchLater}
              onToggleWatchLater={handleWatchLater}
            />
          )}
          <Button
            variant="ghost"
            className={`${pill} ${isDownloaded ? "border-brand/40 text-brand" : ""}`}
            onClick={handleDownload}
          >
            {isDownloaded ? <Check className="size-[18px]" /> : <Download className="size-[18px]" />}
            {isDownloaded ? "Downloaded" : "Download"}
          </Button>
        </div>
      </div>
      <div className="rounded-2xl border border-white/[0.06] bg-surface p-4 transition-colors hover:bg-surface-2">
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm font-semibold">
          <span>{video.views.toLocaleString()} views</span>
          <span className="text-muted-foreground">·</span>
          <span>{new Date(video.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</span>
          {video.category && (
            <Link
              href={{ pathname: "/", query: { category: video.category } }}
              className="rounded-full bg-white/[0.07] px-2.5 text-xs font-medium leading-5 text-foreground/90 transition-colors hover:bg-white/[0.12]"
            >
              #{video.category}
            </Link>
          )}
        </div>
        <div className={`mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-foreground/85 ${showFullDescription ? "" : "line-clamp-3"}`}>
          {video.description?.trim() ? (
            <p>{video.description}</p>
          ) : (
            <p className="text-muted-foreground">No description provided.</p>
          )}
          {showFullDescription && (
            <p className="mt-4 text-xs text-muted-foreground">
              Gesture controls: tap the centre to play or pause, double-tap the left or right side to
              seek, triple-tap the centre for the next video and triple-tap the left side to open comments.
            </p>
          )}
        </div>
        <button
          className="mt-1 text-sm font-semibold text-foreground hover:underline"
          onClick={() => setShowFullDescription(!showFullDescription)}
        >
          {showFullDescription ? "Show less" : "Show more"}
        </button>
      </div>
    </div>
  );
};

export default VideoInfo;
