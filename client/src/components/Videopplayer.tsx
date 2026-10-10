"use client";

import { useRef, useEffect, useState } from "react";
import { BACKEND_URL } from "@/lib/media";
import { toast } from "sonner";

interface VideoPlayerProps {
  video: {
    _id: string;
    videotitle: string;
    filepath: string;
  };
  onOpenComments?: () => void;
  onNextVideo?: () => void;
  /** Called when playback reaches the end (used for playlist autoplay). */
  onEnded?: () => void;
}

export default function Videopplayer({ video, onOpenComments, onNextVideo, onEnded }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

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
    <div className="relative aspect-video overflow-hidden bg-black">
      <video
        ref={videoRef}
        className="w-full h-full"
        controls
        onEnded={onEnded}
        playsInline
      >
        <source src={`${BACKEND_URL}/video/watch/${video?._id}`} type="video/mp4" />
        Your browser does not support the video tag.
      </video>

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
