"use client";

import { useState, useEffect } from "react";
import { History } from "lucide-react";
import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";
import { timeAgo } from "@/lib/media";
import VideoRow from "./VideoRow";
import RowMenu from "./RowMenu";
import EmptyState from "./EmptyState";
import { VideoRowSkeleton } from "./Skeletons";

export default function HistoryContent() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();

  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user]);

  const loadHistory = async () => {
    if (!user) return;

    try {
      const historyData = await axiosInstance.get(`/history/${user?._id}`);
      setHistory(historyData.data);
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromHistory = async (historyId: string) => {
    try {
      setHistory(history.filter((item) => item._id !== historyId));
    } catch (error) {
      console.error("Error removing from history:", error);
    }
  };

  if (!user) {
    return (
      <EmptyState
        icon={History}
        title="Keep track of what you watch"
        description="Watch history isn't viewable when signed out."
      />
    );
  }

  if (loading) {
    return <VideoRowSkeleton />;
  }

  const items = history.filter((item) => item.videoid);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No watch history yet"
        description="Videos you watch will appear here."
      />
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <VideoRow
          key={item._id}
          video={item.videoid}
          note={`Watched ${timeAgo(item.createdAt)}`}
          actions={
            <RowMenu
              label="Remove from watch history"
              onRemove={() => handleRemoveFromHistory(item._id)}
            />
          }
        />
      ))}
    </div>
  );
}
