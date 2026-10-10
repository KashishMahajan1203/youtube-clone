"use client";

import { useRef, useEffect, useState } from "react";
import type Hls from "hls.js";
import { Check, Settings } from "lucide-react";
import { BACKEND_URL } from "@/lib/media";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface VideoPlayerProps {
  video: {
    _id: string;
    videotitle: string;
    filepath: string;
    /** HLS manifest; when present, playback adapts to the connection. */
    hls?: string;
  };
  onOpenComments?: () => void;
  onNextVideo?: () => void;
  /** Called when playback reaches the end (used for playlist autoplay). */
  onEnded?: () => void;
}

interface QualityLevel {
  index: number;
  height: number;
}

const qualityLabel = (height: number) => `${height}p`;

export default function Videopplayer({ video, onOpenComments, onNextVideo, onEnded }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Adaptive streaming: with an HLS manifest, hls.js picks a rendition to
  // suit the connection ("Auto") and the viewer can pin one. Without one, or
  // if the stream fails, the plain MP4 is played.
  const hlsRef = useRef<Hls | null>(null);
  const [levels, setLevels] = useState<QualityLevel[]>([]);
  const [selectedLevel, setSelectedLevel] = useState(-1); // -1 = Auto
  const [playingHeight, setPlayingHeight] = useState<number | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !video?._id) return;
    const mp4 = `${BACKEND_URL}/video/watch/${video._id}`;
    let cancelled = false;
    setLevels([]);
    setSelectedLevel(-1);
    setPlayingHeight(null);

    const playMp4 = () => {
      const resumeAt = el.currentTime;
      el.src = mp4;
      if (resumeAt > 0) {
        el.addEventListener("loadedmetadata", () => (el.currentTime = resumeAt), { once: true });
      }
    };

    if (!video.hls) {
      playMp4();
    } else {
      import("hls.js").then(({ default: HlsLib }) => {
        if (cancelled) return;
        if (!HlsLib.isSupported()) {
          // Safari plays HLS natively (with its own quality switching).
          if (el.canPlayType("application/vnd.apple.mpegurl")) el.src = video.hls!;
          else playMp4();
          return;
        }
        const hls = new HlsLib({ capLevelToPlayerSize: true });
        hlsRef.current = hls;
        hls.on(HlsLib.Events.MANIFEST_PARSED, (_, data) => {
          // One entry per resolution (the best bitrate of each), highest first.
          const best = new Map<number, { index: number; bitrate: number }>();
          data.levels.forEach((level, index) => {
            if (!level.height) return;
            const prev = best.get(level.height);
            if (!prev || level.bitrate > prev.bitrate) best.set(level.height, { index, bitrate: level.bitrate });
          });
          setLevels(
            [...best.entries()]
              .map(([height, { index }]) => ({ height, index }))
              .sort((a, b) => b.height - a.height)
          );
        });
        hls.on(HlsLib.Events.LEVEL_SWITCHED, (_, data) => {
          setPlayingHeight(hls.levels[data.level]?.height ?? null);
        });
        hls.on(HlsLib.Events.ERROR, (_, data) => {
          if (!data.fatal) return;
          // e.g. the renditions aren't ready yet: fall back to the MP4.
          console.warn("HLS playback failed, falling back to MP4:", data.details);
          hls.destroy();
          hlsRef.current = null;
          setLevels([]);
          playMp4();
        });
        hls.loadSource(video.hls!);
        hls.attachMedia(el);
      });
    }

    return () => {
      cancelled = true;
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [video?._id, video?.hls]);

  const chooseLevel = (index: number) => {
    setSelectedLevel(index);
    // Switches immediately; -1 hands control back to the bandwidth estimator.
    if (hlsRef.current) hlsRef.current.currentLevel = index;
  };

  const currentLabel =
    selectedLevel === -1
      ? `Auto${playingHeight ? ` · ${qualityLabel(playingHeight)}` : ""}`
      : qualityLabel(levels.find((l) => l.index === selectedLevel)?.height ?? 0);

  // Gesture detection state
  const [tapCount, setTapCount] = useState(0);
  const tapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const TAP_DELAY = 500; // milliseconds

  // Clean up the tap timer on unmount
  useEffect(() => {
    return () => {
      if (tapTimerRef.current) {
        clearTimeout(tapTimerRef.current);
      }
    };
  }, []);

  // ==================== GESTURE DETECTION ====================

  const handleVideoClick = (event: React.MouseEvent) => {
    // Increment tap count
    setTapCount((prev) => prev + 1);

    // Clear existing timer
    if (tapTimerRef.current) {
      clearTimeout(tapTimerRef.current);
    }

    // Set new timer to process taps after delay
    tapTimerRef.current = setTimeout(() => {
      processTaps(event, tapCount + 1);
      setTapCount(0);
      tapTimerRef.current = null;
    }, TAP_DELAY);
  };

  const processTaps = (event: React.MouseEvent, taps: number) => {
    if (!videoRef.current) return;

    const videoWidth = videoRef.current.clientWidth;
    const rect = videoRef.current.getBoundingClientRect();
    const tapX = event.clientX - rect.left;

    // Determine zone
    const isLeft = tapX < videoWidth * 0.33;
    const isRight = tapX > videoWidth * 0.66;
    const isCenter = !isLeft && !isRight;

    // Single tap
    if (taps === 1 && isCenter) {
      togglePlayPause();
    }

    // Double tap
    if (taps === 2) {
      if (isRight) {
        seekForward();
      } else if (isLeft) {
        seekBackward();
      }
    }

    // Triple tap
    if (taps === 3) {
      if (isCenter) {
        toast.info("Switching to next video...");
        handleNextVideo();
      } else if (isRight) {
        handleCloseWebsite();
      } else if (isLeft) {
        handleOpenComments();
      }
    }
  };

  const togglePlayPause = () => {
    if (!videoRef.current) return;

    if (videoRef.current.paused) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  };

  const seekForward = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.min(
      videoRef.current.currentTime + 10,
      videoRef.current.duration
    );
  };

  const seekBackward = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(videoRef.current.currentTime - 10, 0);
  };

  const handleNextVideo = () => {
    if (onNextVideo) {
      onNextVideo();
    } else {
      toast.info('Next video functionality not available');
    }
  };

  const handleOpenComments = () => {
    if (onOpenComments) {
      onOpenComments();
    } else {
      toast.info('Comments section not available');
    }
  };

  const handleCloseWebsite = () => {
    // Try to close the window (may not work in all browsers)
    window.close();

    // If window.close() doesn't work, redirect to home
    setTimeout(() => {
      if (!window.closed) {
        window.location.href = '/';
      }
    }, 100);
  };

  // ==================== END GESTURE DETECTION ====================

  return (
    <div className="group relative aspect-video overflow-hidden bg-black">
      <video
        ref={videoRef}
        className="w-full h-full"
        controls
        onEnded={onEnded}
        playsInline
      >
        Your browser does not support the video tag.
      </video>

      {levels.length > 1 && (
        <div className="absolute right-3 top-3 z-[2] opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 has-[[data-state=open]]:opacity-100 [@media(hover:none)]:opacity-100">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label="Video quality"
                className="flex h-8 items-center gap-1.5 rounded-full bg-black/60 px-3 text-xs font-semibold text-white backdrop-blur-md transition-colors hover:bg-black/80"
              >
                <Settings className="size-3.5" />
                {currentLabel}
                {(playingHeight ?? 0) >= 720 && (
                  <span className="bg-gradient-brand rounded px-1 text-[9px] leading-4">HD</span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="min-w-40 rounded-xl border-white/10 bg-popover/95 backdrop-blur-xl"
            >
              <DropdownMenuLabel className="text-xs text-muted-foreground">Quality</DropdownMenuLabel>
              {[{ index: -1, height: 0 }, ...levels].map((level) => (
                <DropdownMenuItem
                  key={level.index}
                  onClick={() => chooseLevel(level.index)}
                  className="justify-between rounded-lg"
                >
                  <span className={cn(level.index === selectedLevel && "font-semibold")}>
                    {level.index === -1 ? "Auto" : qualityLabel(level.height)}
                    {level.height >= 720 && <sup className="ml-0.5 text-[9px] text-brand">HD</sup>}
                  </span>
                  {level.index === selectedLevel && <Check className="size-4 text-brand" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Gesture Control Layer - Covers top 85% to allow native controls access at bottom */}
      <div
        className="absolute top-0 left-0 right-0 h-[85%] z-[1] cursor-pointer"
        style={{ touchAction: 'manipulation' }}
        onClick={handleVideoClick}
        onDoubleClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      />
    </div>
  );
}
