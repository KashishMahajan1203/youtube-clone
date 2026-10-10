"use client";

import { useState, useEffect } from "react";
import { ThumbsUp } from "lucide-react";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { timeAgo } from "@/lib/media";
import VideoRow from "./VideoRow";
import RowMenu from "./RowMenu";
import EmptyState from "./EmptyState";
import { VideoRowSkeleton } from "./Skeletons";

export default function LikedVideosContent() {
  const [likedVideos, setLikedVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();

  useEffect(() => {
    if (user) {
      loadLikedVideos();
    }
  }, [user]);

  const loadLikedVideos = async () => {
    if (!user) return;

    try {
      const likedData = await axiosInstance.get(`/like/${user?._id}`);

      setLikedVideos(likedData.data);
    } catch (error) {
      console.error("Error loading liked videos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlikeVideo = async (likedVideoId: string) => {
    if (!user) return;

    try {
      setLikedVideos(likedVideos.filter((item) => item._id !== likedVideoId));
    } catch (error) {
      console.error("Error unliking video:", error);
    }
  };

  if (!user) {
    return (
      <EmptyState
        icon={ThumbsUp}
        title="Keep track of videos you like"
        description="Sign in to see your liked videos."
      />
    );
  }

  if (loading) {
    return <VideoRowSkeleton />;
  }

  const items = likedVideos.filter((item) => item.videoid);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={ThumbsUp}
        title="No liked videos yet"
        description="Tap the thumbs-up on any video and it will show up here."
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
          note={`Liked ${timeAgo(item.createdAt)}`}
          actions={
            <RowMenu
              label="Remove from liked videos"
              onRemove={() => handleUnlikeVideo(item._id)}
            />
          }
        />
      ))}
    </div>
  );
}
