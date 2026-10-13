import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { ExternalLink, Loader2, MessageSquareOff, ThumbsUp, VideoOff } from "lucide-react";

import ChannelAvatar from "@/components/ChannelAvatar";
import EmptyState from "@/components/EmptyState";
import RelatedVideos from "@/components/RelatedVideos";
import { VideoRowSkeleton } from "@/components/Skeletons";
import { formatCount, timeAgo } from "@/lib/media";
import { fetchComments, fetchRelated, fetchYouTubeVideo } from "@/lib/youtube";

// Watch page for a real YouTube video, played through YouTube's embedded player.
export default function YouTubeWatchPage() {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : "";

  const [state, setState] = useState<{ id: string; video: any | null; error: boolean }>({
    id: "",
    video: null,
    error: false,
  });
  const [related, setRelated] = useState<{ id: string; videos: any[] }>({ id: "", videos: [] });
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetchYouTubeVideo(id)
      .then((video) => !cancelled && setState({ id, video, error: false }))
      .catch(() => !cancelled && setState({ id, video: null, error: true }));
    fetchRelated(id)
      .then((videos) => !cancelled && setRelated({ id, videos }))
      .catch(() => !cancelled && setRelated({ id, videos: [] }));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const loading = !id || state.id !== id;
  const video = state.video;

  if (!loading && !video) {
    return (
      <div className="mx-auto max-w-xl p-6 pt-16">
        <EmptyState
          icon={VideoOff}
          title="Video not available"
          description="It may be private, removed, or YouTube couldn't be reached."
          action={
            <Link href="/" className="inline-flex h-10 items-center rounded-full bg-white px-5 text-sm font-semibold text-black hover:bg-white/90">
              Back to home
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-[1700px] p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_400px]">
          <div className="min-w-0 space-y-5">
            <div className="aspect-video overflow-hidden rounded-2xl bg-black shadow-2xl shadow-black/40 ring-1 ring-white/[0.06]">
              {id && (
                <iframe
                  key={id}
                  src={`https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`}
                  title={video?.videotitle || "YouTube video"}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                  className="h-full w-full"
                />
              )}
            </div>

            {loading || !video ? (
              <div className="space-y-4">
                <div className="skeleton h-7 w-2/3 rounded-lg" />
                <div className="flex items-center gap-3">
                  <div className="skeleton size-11 rounded-full" />
                  <div className="skeleton h-4 w-40 rounded" />
                </div>
                <div className="skeleton h-28 rounded-2xl" />
              </div>
            ) : (
              <>
                <h1 className="text-xl font-bold leading-snug tracking-tight sm:text-2xl">
                  {video.videotitle}
                </h1>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <a
                    href={`https://www.youtube.com/channel/${video.channelId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-w-0 items-center gap-3"
                  >
                    <ChannelAvatar name={video.videochanel} className="size-11" />
                    <span className="truncate font-semibold">{video.videochanel}</span>
                  </a>
                  <div className="flex items-center gap-2">
                    <span className="flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm font-medium">
                      <ThumbsUp className="size-4" />
                      {formatCount(video.Like)}
                    </span>
                    <a
                      href={`https://www.youtube.com/watch?v=${id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm font-medium hover:bg-white/[0.08]"
                    >
                      <ExternalLink className="size-4" />
                      Watch on YouTube
                    </a>
                  </div>
                </div>

                <div className="rounded-2xl bg-white/[0.04] p-4 text-sm">
                  <p className="font-semibold">
                    {formatCount(video.views)} views · {timeAgo(video.createdAt)}
                    {video.category && video.category !== "Other" && (
                      <Link
                        href={{ pathname: "/", query: { category: video.category } }}
                        className="ml-2 font-medium text-brand hover:underline"
                      >
                        #{video.category}
                      </Link>
                    )}
                  </p>
                  {video.description && (
                    <>
                      <p className={`mt-2 whitespace-pre-line break-words text-foreground/85 ${expanded ? "" : "line-clamp-3"}`}>
                        {video.description}
                      </p>
                      <button
                        onClick={() => setExpanded((e) => !e)}
                        className="mt-2 font-semibold hover:underline"
                      >
                        {expanded ? "Show less" : "…more"}
                      </button>
                    </>
                  )}
                </div>

                <YouTubeComments videoId={id} total={video.commentCount} />
              </>
            )}
          </div>

          <aside className="min-w-0">
            <div className="xl:sticky xl:top-20">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Up next
              </h2>
              {related.id === id ? (
                <RelatedVideos videos={related.videos} />
              ) : (
                <VideoRowSkeleton count={6} />
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

// Top comments from YouTube (read-only).
function YouTubeComments({ videoId, total }: { videoId: string; total?: number }) {
  const [data, setData] = useState<{
    id: string;
    comments: any[];
    next: string | null;
    disabled: boolean;
    failed: boolean;
  }>({ id: "", comments: [], next: null, disabled: false, failed: false });
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchComments(videoId)
      .then((page) => {
        if (cancelled) return;
        setData({ id: videoId, comments: page.comments, next: page.nextPageToken, disabled: page.disabled, failed: false });
      })
      .catch(() => !cancelled && setData({ id: videoId, comments: [], next: null, disabled: false, failed: true }));
    return () => {
      cancelled = true;
    };
  }, [videoId]);

  const loadMore = () => {
    if (!data.next) return;
    setLoadingMore(true);
    fetchComments(videoId, data.next)
      .then((page) =>
        setData((d) => (d.id !== videoId ? d : { ...d, comments: [...d.comments, ...page.comments], next: page.nextPageToken }))
      )
      .catch(() => setData((d) => ({ ...d, next: null })))
      .finally(() => setLoadingMore(false));
  };

  return (
    <section>
      <h2 className="mb-5 text-lg font-semibold tracking-tight">
        {total ? `${formatCount(total)} Comments` : "Comments"}
      </h2>
      {data.id !== videoId ? (
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      ) : data.disabled ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <MessageSquareOff className="size-4" /> Comments are turned off for this video.
        </p>
      ) : data.failed ? (
        <p className="text-sm text-muted-foreground">Couldn&apos;t load comments.</p>
      ) : data.comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet.</p>
      ) : (
        <ul className="space-y-5">
          {data.comments.map((c) => (
            <li key={c.id} className="flex gap-3">
              {c.authorImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.authorImage} alt="" className="size-10 shrink-0 rounded-full" referrerPolicy="no-referrer" />
              ) : (
                <ChannelAvatar name={c.author} className="size-10" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[13px]">
                  <span className="font-semibold">{c.author}</span>{" "}
                  <span className="text-muted-foreground">{timeAgo(c.createdAt)}</span>
                </p>
                <p className="mt-1 whitespace-pre-line break-words text-sm">{c.text}</p>
                <p className="mt-1.5 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <ThumbsUp className="size-3.5" /> {c.likes ? formatCount(c.likes) : ""}
                  </span>
                  {c.replies > 0 && <span>{c.replies} {c.replies === 1 ? "reply" : "replies"}</span>}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {data.next && data.id === videoId && (
        <button
          onClick={loadMore}
          disabled={loadingMore}
          className="mt-6 h-9 rounded-full border border-white/10 px-4 text-sm font-medium hover:bg-white/[0.06] disabled:opacity-60"
        >
          {loadingMore ? "Loading…" : "Show more comments"}
        </button>
      )}
    </section>
  );
}
