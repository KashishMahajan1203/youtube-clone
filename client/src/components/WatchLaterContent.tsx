"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";
import { timeAgo } from "@/lib/media";
import VideoRow from "./VideoRow";
import RowMenu from "./RowMenu";
import EmptyState from "./EmptyState";
import { VideoRowSkeleton } from "./Skeletons";

export default function WatchLaterContent() {
  const [watchLater, setWatchLater] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();

  useEffect(() => {
    if (user) {
      loadWatchLater();
    }
  }, [user]);

  const loadWatchLater = async () => {
    if (!user) return;

    try {
      const watchLaterData = await axiosInstance.get(`/watch/${user?._id}`);

      setWatchLater(watchLaterData.data);
    } catch (error) {
      console.error("Error loading watch later:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromWatchLater = async (watchLaterId: string) => {
    try {
      setWatchLater(watchLater.filter((item) => item._id !== watchLaterId));
    } catch (error) {
      console.error("Error removing from watch later:", error);
    }
  };

  if (!user) {
    return (
      <EmptyState
        icon={Clock}
        title="Save videos for later"
        description="Sign in to access your Watch later playlist."
      />
    );
  }

  if (loading) {
    return <VideoRowSkeleton />;
  }

  const items = watchLater.filter((item) => item.videoid);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="No videos saved"
        description="Hit “Save” under any video to add it to this list."
      />
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <VideoRow
          key={item._id}
          index={i}
          video={item.videoid}
          note={`Added ${timeAgo(item.createdAt)}`}
          actions={
            <RowMenu
              label="Remove from Watch later"
              onRemove={() => handleRemoveFromWatchLater(item._id)}
            />
          }
        />
      ))}
    </div>
  );
}
