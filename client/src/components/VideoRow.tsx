import Link from "next/link";
import type { ReactNode } from "react";
import VideoThumbnail from "./VideoThumbnail";
import ChannelAvatar from "./ChannelAvatar";
import { cn } from "@/lib/utils";
import { formatViews, timeAgo } from "@/lib/media";
import { videoHref } from "@/lib/youtube";

interface VideoRowProps {
  video: any;
  /** Extra line under the stats, e.g. "Added 2 days ago". */
  note?: string;
  /** Trailing element, e.g. an actions menu. */
  actions?: ReactNode;
  /** Smaller layout for sidebars (related videos). */
  compact?: boolean;
  index?: number;
  /** Link target; defaults to the watch page. */
  href?: string;
  /** Highlight as the currently playing item (playlist queue). */
  active?: boolean;
  /** Show the start of the description (search results). */
  showDescription?: boolean;
}

// Horizontal video row used by history, liked, watch later, search and
// related-video lists.
export default function VideoRow({
  video,
  note,
  actions,
  compact,
  index,
  href: hrefProp,
  active,
  showDescription,
}: VideoRowProps) {
  if (!video) return null;
  const href = hrefProp || videoHref(video);

  return (
    <div
      className={cn(
        "group relative flex rounded-2xl transition-colors",
        compact ? "gap-3" : "gap-4 p-2 -mx-2 hover:bg-white/[0.03]",
        active && "bg-white/[0.06]"
      )}
    >
      {index !== undefined && (
        <span className="hidden w-6 shrink-0 self-center text-center text-sm tabular-nums text-muted-foreground sm:block">
          {index + 1}
        </span>
      )}
      <Link
        href={href}
        className={cn(
          "shrink-0",
          compact ? "w-40" : "w-40 sm:w-60 md:w-72"
        )}
      >
        <VideoThumbnail
          filepath={video.filepath}
          thumbnail={video.thumbnail}
          frameAt={video.thumbnailTime}
          title={video.videotitle}
          duration={video.duration}
          live={video.live}
          rounded={compact ? "rounded-lg" : "rounded-xl"}
        />
      </Link>

      <div className="min-w-0 flex-1 py-0.5">
        <Link href={href}>
          <h3
            className={cn(
              "line-clamp-2 font-semibold leading-snug tracking-tight transition-colors group-hover:text-white",
              compact ? "text-sm" : "text-[15px] sm:text-base"
            )}
          >
            {video.videotitle}
          </h3>
        </Link>

        {compact ? (
          <>
            <p className="mt-1 text-xs text-muted-foreground">
              {video.videochanel}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatViews(video.views)} · {timeAgo(video.createdAt)}
            </p>
          </>
        ) : (
          <>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              {formatViews(video.views)} · {timeAgo(video.createdAt)}
            </p>
            <div className="mt-2.5 flex items-center gap-2">
              <ChannelAvatar name={video.videochanel} className="size-6 text-[10px]" />
              <span className="truncate text-xs text-muted-foreground sm:text-sm">
                {video.videochanel}
              </span>
            </div>
          </>
        )}

        {showDescription && video.description && (
          <p className="mt-2 hidden text-xs text-muted-foreground sm:line-clamp-2">
            {video.description}
          </p>
        )}

        {note && (
          <p className="mt-2 text-xs text-muted-foreground/70">{note}</p>
        )}
      </div>

      {actions && <div className="shrink-0 self-start">{actions}</div>}
    </div>
  );
}
