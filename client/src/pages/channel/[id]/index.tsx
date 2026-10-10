import ChannelHeader from "@/components/ChannelHeader";
import Channeltabs, { type ChannelTab } from "@/components/Channeltabs";
import ChannelVideos from "@/components/ChannelVideos";
import VideoUploader from "@/components/VideoUploader";
import { VideoGridSkeleton } from "@/components/Skeletons";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { formatCount } from "@/lib/media";
import { useRouter } from "next/router";
import React, { useCallback, useEffect, useMemo, useState } from "react";

const Index = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useUser();
  const [videos, setVideos] = useState<any[] | null>(null);
  const [tab, setTab] = useState<ChannelTab>("videos");
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    setProfile(null);
    axiosInstance
      .get(`/user/channel/${id}`)
      .then((res) => setProfile(res.data))
      .catch(() => setProfile(null));
  }, [id]);

  const loadVideos = useCallback(async () => {
    if (!id) return;
    try {
      const res = await axiosInstance.get("/video/getall");
      setVideos(
        res.data
          .filter((v: any) => v.uploader === id)
          .sort(
            (a: any, b: any) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
      );
    } catch (error) {
      console.error("Error fetching channel data:", error);
      setVideos([]);
    }
  }, [id]);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  const isOwner = !!user && user._id === id;

  // Prefer the signed-in user's own profile (always fresh), then the public
  // channel endpoint, then the uploader name stored on their videos.
  const channel = isOwner
    ? user
    : {
        _id: id,
        ...profile,
        channelname:
          profile?.channelname || videos?.[0]?.videochanel || "Channel",
      };

  const stats = useMemo(
    () =>
      videos
        ? {
            videos: videos.length,
            views: videos.reduce((sum, v) => sum + (v.views || 0), 0),
            likes: videos.reduce((sum, v) => sum + (v.Like || 0), 0),
          }
        : null,
    [videos]
  );

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-[1600px]">
        <ChannelHeader channel={channel} user={user} stats={stats} />
        <Channeltabs active={tab} onChange={setTab} />

        <div className="space-y-8 px-4 py-8 sm:px-10">
          {tab === "videos" ? (
            <>
              {isOwner && (
                <VideoUploader
                  channelId={id}
                  channelName={channel?.channelname}
                  onUploaded={loadVideos}
                />
              )}
              {videos ? (
                <ChannelVideos videos={videos} />
              ) : (
                <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                  <VideoGridSkeleton count={4} />
                </div>
              )}
            </>
          ) : (
            <div className="grid max-w-3xl gap-4 sm:grid-cols-3">
              {[
                { label: "Videos", value: stats?.videos ?? 0 },
                { label: "Total views", value: stats?.views ?? 0 },
                { label: "Total likes", value: stats?.likes ?? 0 },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl border border-white/[0.08] bg-surface p-5"
                >
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {s.label}
                  </p>
                  <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight">
                    {formatCount(s.value)}
                  </p>
                </div>
              ))}
              {channel?.description && (
                <div className="rounded-2xl border border-white/[0.08] bg-surface p-5 sm:col-span-3">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Description
                  </p>
                  <p className="text-sm leading-relaxed text-foreground/85">
                    {channel.description}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
