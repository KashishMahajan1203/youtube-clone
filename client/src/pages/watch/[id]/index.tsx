import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";

import Videopplayer from "@/components/Videopplayer";
import VideoInfo from "@/components/VideoInfo";
import Comments from "@/components/Comments";
import RelatedVideos from "@/components/RelatedVideos";
import PlaylistQueue from "@/components/PlaylistQueue";
import { useUser } from "@/lib/AuthContext";
import { toast } from "sonner";

import EmptyState from "@/components/EmptyState";
import { VideoRowSkeleton } from "@/components/Skeletons";
import Link from "next/link";
import { VideoOff, X } from "lucide-react";

import axiosInstance from "@/lib/axiosinstance";

/* ===============================
   COMPONENT
   =============================== */
const VideoPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const videoId = id as string;

  const [currentVideo, setCurrentVideo] = useState<any>(null);
  const [allVideos, setAllVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCommentsOverlay, setShowCommentsOverlay] = useState(false);
  const { user } = useUser();

  // Playlist mode: /watch/<id>?list=<playlistId>[&shuffle=1]
  const listId = typeof router.query.list === "string" ? router.query.list : "";
  const shuffle = router.query.shuffle === "1";
  const [playlist, setPlaylist] = useState<any>(null);
  const [queue, setQueue] = useState<any[]>([]);

  useEffect(() => {
    if (!listId) {
      setPlaylist(null);
      setQueue([]);
      return;
    }
    axiosInstance
      .get(`/playlist/${listId}`, { params: user?._id ? { viewerId: user._id } : {} })
      .then((res) => {
        setPlaylist(res.data);
        const vids = [...res.data.videos];
        if (shuffle) {
          // Fisher–Yates, done once per load so the order stays stable.
          for (let i = vids.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [vids[i], vids[j]] = [vids[j], vids[i]];
          }
          // Keep the video that was clicked at the front.
          const at = vids.findIndex((v) => v._id === router.query.id);
          if (at > 0) vids.unshift(...vids.splice(at, 1));
        }
        setQueue(vids);
      })
      .catch(() => {
        setPlaylist(null);
        setQueue([]);
      });
    // Only refetch when the playlist itself changes, not on every next video.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listId, shuffle, user?._id]);

  const queueHref = (vid: string) =>
    `/watch/${vid}?list=${listId}${shuffle ? "&shuffle=1" : ""}`;

  /* ===============================
     FETCH VIDEO DATA
     =============================== */
  useEffect(() => {
    const fetchVideo = async () => {
      if (!videoId) return;

      try {
        const res = await axiosInstance.get("/video/getall");
        const selected = res.data.find((vid: any) => vid._id === videoId);

        setCurrentVideo(selected);
        setAllVideos(res.data);
      } catch (error) {
        console.error("Failed to fetch video:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();
  }, [videoId]);

  /* ===============================
     HANDLERS
     =============================== */
  const handleToggleComments = () => {
    setShowCommentsOverlay((prev) => !prev);
  };

  const handleNextVideo = () => {
    if (queue.length > 0) {
      const at = queue.findIndex((vid: any) => vid._id === videoId);
      const next = queue[at + 1];
      if (next) {
        router.push(queueHref(next._id));
      } else {
        toast.info("You've reached the end of the playlist");
      }
      return;
    }

    if (!currentVideo || allVideos.length === 0) {
      return;
    }

    // Find current video index
    const currentIndex = allVideos.findIndex((vid: any) => vid._id === videoId);

    // Get next video index (loop back to start if at end)
    const nextIndex = (currentIndex + 1) % allVideos.length;
    const nextVideo = allVideos[nextIndex];

    // Navigate to next video
    if (nextVideo && nextVideo._id !== videoId) {
      router.push(`/watch/${nextVideo._id}`);
    }
  };

  /* ===============================
     UI STATES
     =============================== */
  if (loading) {
    return (
      <div className="mx-auto grid max-w-[1700px] grid-cols-1 gap-8 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-4">
          <div className="skeleton aspect-video rounded-2xl" />
          <div className="skeleton h-7 w-2/3 rounded-lg" />
          <div className="flex items-center gap-3">
            <div className="skeleton size-11 rounded-full" />
            <div className="skeleton h-4 w-40 rounded" />
          </div>
          <div className="skeleton h-28 rounded-2xl" />
        </div>
        <VideoRowSkeleton count={6} />
      </div>
    );
  }

  if (!currentVideo) {
    return (
      <div className="mx-auto max-w-xl p-6 pt-16">
        <EmptyState
          icon={VideoOff}
          title="Video not found"
          description="It may have been removed, or the link is incorrect."
          action={
            <Link href="/" className="inline-flex h-10 items-center rounded-full bg-white px-5 text-sm font-semibold text-black hover:bg-white/90">
              Back to home
            </Link>
          }
        />
      </div>
    );
  }

  const upNext = allVideos.filter((vid: any) => vid._id !== videoId);

  /* ===============================
     RENDER
     =============================== */
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-[1700px] p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_400px]">
          {/* VIDEO SECTION */}
          <div className="min-w-0 space-y-6">
            <div className="overflow-hidden rounded-2xl bg-black shadow-2xl shadow-black/40 ring-1 ring-white/[0.06]">
              <Videopplayer
                key={videoId}
                video={currentVideo}
                onOpenComments={handleToggleComments}
                onNextVideo={handleNextVideo}
                onEnded={queue.length > 0 ? handleNextVideo : undefined}
              />
            </div>

            <VideoInfo video={currentVideo} />
            <Comments videoId={videoId} uploaderId={currentVideo?.uploader} channelName={currentVideo?.videochanel} />
          </div>

          {/* RELATED VIDEOS */}
          <aside className="min-w-0">
            <div className="space-y-6 xl:sticky xl:top-20">
              {playlist && queue.length > 0 && (
                <PlaylistQueue
                  playlist={playlist}
                  queue={queue}
                  currentId={videoId}
                  shuffle={shuffle}
                  hrefFor={queueHref}
                />
              )}
              <div>
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Up next
                </h2>
                <RelatedVideos videos={upNext} />
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* COMMENTS OVERLAY */}
      {showCommentsOverlay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={handleToggleComments}
        >
          <div
            className="animate-fade-up max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-surface p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold tracking-tight">Comments</h3>
              <button
                onClick={handleToggleComments}
                className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
                aria-label="Close comments"
              >
                <X className="size-5" />
              </button>
            </div>
            <Comments videoId={videoId} uploaderId={currentVideo?.uploader} channelName={currentVideo?.videochanel} />
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPage;
