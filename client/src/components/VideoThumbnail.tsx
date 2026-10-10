import { useRef, useState } from "react";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration, mediaUrl } from "@/lib/media";

interface VideoThumbnailProps {
  filepath?: string;
  /** Uploaded thumbnail image. Without one, a frame of the video is used. */
  thumbnail?: string;
  title?: string;
  className?: string;
  /** Play a muted preview while hovered. */
  preview?: boolean;
  rounded?: string;
}

export default function VideoThumbnail({
  filepath,
  thumbnail,
  title,
  className,
  preview = true,
  rounded = "rounded-xl",
}: VideoThumbnailProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState<number>();
  const [imageReady, setImageReady] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [playing, setPlaying] = useState(false);

  const src = mediaUrl(filepath);
  const imageSrc = mediaUrl(thumbnail);
  const hasImage = !!imageSrc && !imageFailed;

  // With an image thumbnail, the video is only fetched once the card is
  // hovered (to read the duration and play the preview). Without one, the
  // video's metadata and first frame are loaded straight away.
  const mountVideo = !!src && !videoFailed && (!hasImage || hovered);

  const start = () => {
    setHovered(true);
    if (!preview || !ref.current) return;
    ref.current.currentTime = 0;
    ref.current.play().then(() => setPlaying(true)).catch(() => {});
  };
  const stop = () => {
    setHovered(false);
    setPlaying(false);
    if (!ref.current) return;
    ref.current.pause();
    ref.current.currentTime = 0.5;
  };

  const loading = hasImage ? !imageReady : !videoReady && !videoFailed;

  return (
    <div
      className={cn(
        "relative aspect-video overflow-hidden bg-surface-2 ring-1 ring-white/5",
        rounded,
        className
      )}
      onMouseEnter={start}
      onMouseLeave={stop}
    >
      {loading && <div className="skeleton absolute inset-0" />}

      {hasImage && (
        <img
          src={imageSrc}
          alt={title || ""}
          loading="lazy"
          onLoad={() => setImageReady(true)}
          onError={() => setImageFailed(true)}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-all duration-500 group-hover:scale-[1.03]",
            imageReady ? "opacity-100" : "opacity-0"
          )}
        />
      )}

      {mountVideo && (
        <video
          ref={ref}
          src={`${src}#t=0.5`}
          muted
          playsInline
          loop
          preload="metadata"
          aria-label={title}
          autoPlay={hasImage && preview}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onLoadedData={() => setVideoReady(true)}
          onPlaying={() => setPlaying(true)}
          onError={() => setVideoFailed(true)}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-all duration-500",
            // Over an image, only show the video once it is actually playing.
            hasImage
              ? playing ? "opacity-100" : "opacity-0"
              : videoReady ? "opacity-100" : "opacity-0",
            "group-hover:scale-[1.03]"
          )}
        />
      )}

      {!hasImage && videoFailed && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-surface-2 to-surface-3">
          <Play className="size-8 text-white/30" />
        </div>
      )}

      {/* Subtle hover affordance */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      {duration ? (
        <span className="absolute bottom-2 right-2 rounded-md bg-black/80 px-1.5 py-0.5 font-mono text-[11px] font-medium tabular-nums text-white backdrop-blur-sm">
          {formatDuration(duration)}
        </span>
      ) : null}
    </div>
  );
}
