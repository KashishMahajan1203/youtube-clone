import Link from "next/link";
import { useEffect, useState } from "react";
import { PlaySquare, Users } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import Videogrid from "@/components/Videogrid";
import ChannelAvatar from "@/components/ChannelAvatar";
import { VideoGridSkeleton } from "@/components/Skeletons";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { useSubscribedChannels } from "@/hooks/useSubscribedChannels";

export default function SubscriptionsPage() {
  const { user } = useUser();
  const channels = useSubscribedChannels();
  const [videos, setVideos] = useState<any[] | null>(null);

  useEffect(() => {
    if (!user?._id || channels === null) return;
    axiosInstance
      .get(`/subscription/feed/${user._id}`)
      .then((res) => setVideos(res.data))
      .catch((err) => {
        console.error("Failed to load subscription feed:", err);
        setVideos([]);
      });
    // Reload the feed whenever the channel list changes.
  }, [user?._id, channels]);

  return (
    <main className="mx-auto w-full max-w-[1800px] px-4 py-8 sm:px-6">
      <PageHeader
        icon={PlaySquare}
        title="Subscriptions"
        subtitle="The latest uploads from channels you follow."
      />

      {!user ? (
        <EmptyState
          icon={Users}
          title="Don't miss new videos"
          description="Sign in to see updates from your favourite channels."
        />
      ) : (
        <div className="space-y-8">
          {channels && channels.length > 0 && (
            <div className="scrollbar-hide -mx-4 flex gap-5 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6">
              {channels.map((c) => (
                <Link
                  key={c._id}
                  href={`/channel/${c._id}`}
                  className="group flex w-20 shrink-0 flex-col items-center gap-2 text-center"
                >
                  <ChannelAvatar
                    name={c.channelname || c.name}
                    src={c.image}
                    className="size-16 text-xl ring-2 ring-transparent transition-all group-hover:ring-brand/60"
                  />
                  <span className="w-full truncate text-xs text-muted-foreground group-hover:text-foreground">
                    {c.channelname || c.name}
                  </span>
                </Link>
              ))}
            </div>
          )}

          {channels && channels.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No subscriptions yet"
              description="Subscribe to channels from any video or channel page and their uploads will show up here."
              action={
                <Link
                  href="/"
                  className="inline-flex h-10 items-center rounded-full bg-white px-5 text-sm font-semibold text-black hover:bg-white/90"
                >
                  Explore videos
                </Link>
              }
            />
          ) : videos ? (
            videos.length === 0 ? (
              <EmptyState
                icon={PlaySquare}
                title="Nothing new yet"
                description="Channels you follow haven't uploaded any videos."
              />
            ) : (
              <Videogrid videos={videos} />
            )
          ) : (
            <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              <VideoGridSkeleton />
            </div>
          )}
        </div>
      )}
    </main>
  );
}
