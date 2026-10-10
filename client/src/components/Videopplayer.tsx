"use client";

import { useRef, useEffect, useState } from "react";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { BACKEND_URL } from "@/lib/media";
import { getToken } from "@/lib/session";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Crown, Lock } from "lucide-react";
import PremiumPayment from "./PremiumPayment";

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
  const { user, handlegooglesignin, demoLogin } = useUser();
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [selectedUpgradePlan, setSelectedUpgradePlan] = useState<
    "BRONZE" | "SILVER" | "GOLD"
  >("BRONZE");
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const videos = "/video/vdo.mp4";

  // Gesture detection state
  const [tapCount, setTapCount] = useState(0);
  const tapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const TAP_DELAY = 500; // milliseconds

  // Initialize watch time tracking
  useEffect(() => {
    if (user && video._id) {
      initializeWatchTime();
    }
  }, [user, video._id]);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
      if (tapTimerRef.current) {
        clearTimeout(tapTimerRef.current);
      }
    };
  }, []);

  const startWatchTimeUpdate = () => {
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
    }
    updateIntervalRef.current = setInterval(() => {
      if (videoRef.current && !isLimitReached) {
        const currentTime = videoRef.current.currentTime;
        updateWatchTime(currentTime);
      }
    }, 5000); // Update every 5 seconds
  };

  const stopWatchTimeUpdate = () => {
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }
  };

  const initializeWatchTime = async () => {
    try {
      console.log(
        "Initializing watch time for user:",
        user?._id,
        "video:",
        video._id
      );
      if (!user || !user._id || !video._id) {
        console.error("User not logged in or video not available");
        setIsLoading(false);
        return;
      }

      const response = await axiosInstance.put(
        `/video/watch/${video._id}`,
        {
          watchTime: 0,
        }
      );

      console.log("Initialize response:", response.data);

      if (response.data.remainingTime !== undefined) {
        setRemainingTime(response.data.remainingTime);
        const isUnlimited = response.data.unlimited === true || response.data.remainingTime === null;
        if (!isUnlimited && response.data.remainingTime <= 0) {
          setIsLimitReached(true);
          setShowUpgradePrompt(true);
        } else {
          setIsLimitReached(false);
          setShowUpgradePrompt(false);
          startWatchTimeUpdate();
        }
      }
    } catch (error: any) {
      console.error("Error initializing watch time:", error);
      console.error("Error response:", error.response?.data);
      if (error.response?.data?.message?.includes("Upgrade")) {
        setIsLimitReached(true);
        setShowUpgradePrompt(true);
        toast.error("Watch time limit reached", {
          description: "Upgrade to premium for unlimited watch time.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const updateWatchTime = async (currentTime: number) => {
    if (!user || !user._id || !video._id || isLimitReached) return;

    try {
      console.log(
        "Updating watch time:",
        Math.floor(currentTime),
        "for user:",
        user._id
      );
      const response = await axiosInstance.put(
        `/video/watch/${video._id}`,
        {
          watchTime: Math.floor(currentTime),
        }
      );

      console.log("Update response:", response.data);

      if (response.data.remainingTime !== undefined) {
        setRemainingTime(response.data.remainingTime);
        const isUnlimited = response.data.unlimited === true || response.data.remainingTime === null;
        if (!isUnlimited && response.data.remainingTime <= 0 && !isLimitReached) {
          console.log("Watch time limit reached!");
          setIsLimitReached(true);
          setShowUpgradePrompt(true);
          stopWatchTimeUpdate();
          if (videoRef.current) {
            videoRef.current.pause();
          }
          toast.error("Watch time limit reached", {
            description: "Upgrade to premium for unlimited watch time.",
          });
        } else if (isUnlimited || response.data.remainingTime > 0) {
          setIsLimitReached(false);
          setShowUpgradePrompt(false);
        }
      }
    } catch (error: any) {
      console.error("Error updating watch time:", error);
      console.error("Error response:", error.response?.data);
      if (error.response?.data?.message?.includes("Upgrade")) {
        setIsLimitReached(true);
        setShowUpgradePrompt(true);
        if (videoRef.current) {
          videoRef.current.pause();
        }
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && !isLimitReached) {
      const currentTime = videoRef.current.currentTime;

      // Update watch time every 5 seconds for more frequent checks
      if (Math.floor(currentTime) % 5 === 0) {
        updateWatchTime(currentTime);
      }

      // Check if we've exceeded the limit immediately
      if (remainingTime !== null && remainingTime <= 0) {
        videoRef.current.pause();
        setIsLimitReached(true);
        setShowUpgradePrompt(true);
        toast.error("Watch time limit reached", {
          description: "Upgrade to premium for unlimited watch time.",
        });
      }
    }
  };

  const handlePlay = () => {
    if (isLimitReached) {
      videoRef.current?.pause();
      setShowUpgradePrompt(true);
      return;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handlePaymentSuccess = () => {
    console.log("Payment successful, resuming video...");
    setIsLimitReached(false);
    setShowUpgradePrompt(false);
    setRemainingTime(null); // Reset remaining time since user upgraded

    // Re-initialize watch time tracking with new plan (without showing loading)
    if (user && video._id) {
      initializeWatchTimeAfterUpgrade();
    }

    // Resume video playback
    if (videoRef.current) {
      videoRef.current.play();
    }
  };

  const initializeWatchTimeAfterUpgrade = async () => {
    try {
      console.log(
        "Re-initializing watch time after upgrade for user:",
        user?._id,
        "video:",
        video._id
      );
      if (!user || !user._id || !video._id) {
        console.error("User not logged in or video not available");
        return;
      }

      const response = await axiosInstance.put(
        `/video/watch/${video._id}`,
        {
          watchTime: 0,
        }
      );

      console.log("Re-initialize response:", response.data);

      if (response.data.remainingTime !== undefined) {
        setRemainingTime(response.data.remainingTime);
        const isUnlimited = response.data.unlimited === true || response.data.remainingTime === null;
        // For Gold plan, remainingTime should be null or very high
        if (!isUnlimited && response.data.remainingTime <= 0) {
          setIsLimitReached(true);
          setShowUpgradePrompt(true);
        } else {
          setIsLimitReached(false);
          setShowUpgradePrompt(false);
        }
      }
    } catch (error: any) {
      console.error("Error re-initializing watch time:", error);
      console.error("Error response:", error.response?.data);
      if (error.response?.data?.message?.includes("Upgrade")) {
        setIsLimitReached(true);
        setShowUpgradePrompt(true);
        toast.error("Watch time limit reached", {
          description: "Upgrade to premium for unlimited watch time.",
        });
      }
    }
  };

  // ==================== GESTURE DETECTION ====================

  const handleVideoClick = (event: React.MouseEvent) => {
    // Prevent default video controls from interfering
    // const target = event.target as HTMLVideoElement;

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

    console.log(`Detected ${taps} tap(s) in zone: ${isLeft ? 'LEFT' : isRight ? 'RIGHT' : 'CENTER'}`);

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
    if (!videoRef.current || isLimitReached) return;

    if (videoRef.current.paused) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  };

  const seekForward = () => {
    if (!videoRef.current || isLimitReached) return;

    const newTime = Math.min(
      videoRef.current.currentTime + 10,
      videoRef.current.duration
    );
    videoRef.current.currentTime = newTime;
    console.log(`Seeked forward to ${newTime}s`);
  };

  const seekBackward = () => {
    if (!videoRef.current || isLimitReached) return;

    const newTime = Math.max(videoRef.current.currentTime - 10, 0);
    videoRef.current.currentTime = newTime;
    console.log(`Seeked backward to ${newTime}s`);
  };

  const handleNextVideo = () => {
    if (onNextVideo) {
      console.log('Navigating to next video...');
      onNextVideo();
    } else {
      console.log('Next video handler not provided');
      toast.info('Next video functionality not available');
    }
  };

  const handleOpenComments = () => {
    if (onOpenComments) {
      console.log('Opening comments section...');
      onOpenComments();
    } else {
      console.log('Comments handler not provided');
      toast.info('Comments section not available');
    }
  };

  const handleCloseWebsite = () => {
    console.log('Attempting to close website...');

    // Try to close the window (may not work in all browsers)
    window.close();

    // If window.close() doesn't work, redirect to home
    setTimeout(() => {
      // Check if window is still open
      if (!window.closed) {
        console.log('window.close() failed, redirecting to home...');
        window.location.href = '/';
      }
    }, 100);
  };

  // ==================== END GESTURE DETECTION ====================

  // Streams require a session (watch-time limits are per account).
  if (!user) {
    return (
      <div className="relative flex aspect-video flex-col items-center justify-center gap-4 overflow-hidden bg-black px-6 text-center">
        <div className="bg-gradient-brand absolute inset-0 opacity-[0.12]" />
        <div className="bg-gradient-brand relative flex size-14 items-center justify-center rounded-2xl shadow-lg shadow-brand/30">
          <Lock className="size-6 text-white" />
        </div>
        <div className="relative">
          <p className="text-lg font-semibold text-white">Sign in to watch</p>
          <p className="mt-1 text-sm text-white/70">Use the demo account, or create a free account.</p>
        </div>
        <div className="relative flex flex-wrap justify-center gap-2">
          <Button
            onClick={() => demoLogin()}
            className="bg-gradient-brand h-10 rounded-full px-6 font-semibold text-white hover:opacity-95"
          >
            Try the demo
          </Button>
          <Button
            onClick={() => handlegooglesignin()}
            className="h-10 rounded-full bg-white px-6 font-semibold text-black hover:bg-white/90"
          >
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-black">
        <div className="skeleton absolute inset-0 opacity-40" />
        <div className="relative size-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  return (
    <div className="relative aspect-video overflow-hidden bg-black">
      {showUpgradePrompt && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="animate-fade-up max-w-md p-6 text-center text-white">
            <Crown className="mx-auto mb-4 size-12 text-amber-400 drop-shadow-[0_0_24px_rgba(251,191,36,0.5)]" />
            <h3 className="text-xl font-bold mb-2">Watch Time Limit Reached</h3>
            <p className="mb-4">Choose a plan to continue watching:</p>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  className="h-auto rounded-xl border-white/15 bg-white/5 p-2.5 text-xs text-white hover:border-amber-400/60 hover:bg-amber-400/10 hover:text-white"
                  onClick={() => setSelectedUpgradePlan("BRONZE")}
                >
                  <div>
                    <div className="font-bold">Bronze</div>
                    <div className="text-xs">₹10</div>
                    <div className="text-xs">7 min</div>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto rounded-xl border-white/15 bg-white/5 p-2.5 text-xs text-white hover:border-amber-400/60 hover:bg-amber-400/10 hover:text-white"
                  onClick={() => setSelectedUpgradePlan("SILVER")}
                >
                  <div>
                    <div className="font-bold">Silver</div>
                    <div className="text-xs">₹50</div>
                    <div className="text-xs">10 min</div>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto rounded-xl border-white/15 bg-white/5 p-2.5 text-xs text-white hover:border-amber-400/60 hover:bg-amber-400/10 hover:text-white"
                  onClick={() => setSelectedUpgradePlan("GOLD")}
                >
                  <div>
                    <div className="font-bold">Gold</div>
                    <div className="text-xs">₹100</div>
                    <div className="text-xs">Unlimited</div>
                  </div>
                </Button>
              </div>
              <PremiumPayment
                trigger={
                  <Button className="bg-gradient-brand h-10 w-full rounded-full font-semibold text-white hover:opacity-95">
                    Upgrade to {selectedUpgradePlan}
                  </Button>
                }
                selectedPlan={selectedUpgradePlan}
                onSuccess={handlePaymentSuccess}
              />
              <Button
                variant="outline"
                className="h-10 w-full rounded-full border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
                onClick={() => setShowUpgradePrompt(false)}
              >
                Watch Later
              </Button>
            </div>
          </div>
        </div>
      )}

      {remainingTime !== null &&
        remainingTime > 0 &&
        remainingTime <= 20 &&
        user?.plan === "FREE" && (
          <div className="absolute right-4 top-4 z-10 animate-pulse rounded-full bg-brand px-3 py-1 text-sm font-medium tabular-nums text-white shadow-lg shadow-brand/40">
            {formatTime(remainingTime)} remaining
          </div>
        )}

      <video
        ref={videoRef}
        className="w-full h-full"
        controls={!isLimitReached}
        onTimeUpdate={handleTimeUpdate}
        onPlay={handlePlay}
        onEnded={onEnded}
        playsInline
      >
        <source
          src={`${BACKEND_URL}/video/watch/${video?._id}?token=${encodeURIComponent(getToken() || "")}`}
          type="video/mp4"
        />
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
