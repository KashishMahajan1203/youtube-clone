import React, { useState } from "react";
import { Button } from "./ui/button";
import { Video } from "lucide-react";
import { copyCallLink } from "@/lib/callLink";
import VideoCall from "./VideoCall";
import ChannelAvatar from "./ChannelAvatar";
import { v4 as uuidv4 } from 'uuid';
import { formatCount } from "@/lib/media";
import SubscribeButton from "./SubscribeButton";
import { useSubscription } from "@/hooks/useSubscription";

const ChannelHeader = ({ channel, user, stats }: any) => {
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);

  const createRoom = () => {
    const newRoomId = uuidv4();
    setRoomId(newRoomId);
    setShowVideoCall(true);
    copyCallLink(newRoomId);
  };

  const name: string = channel?.channelname || "Channel";
  const isOwner = user && user?._id === channel?._id;
  const subscription = useSubscription(channel?._id);

  return (
    <div className="w-full">
      {/* Banner */}
      <div className="px-4 pt-4 sm:px-6">
        <div className="relative h-36 overflow-hidden rounded-3xl md:h-52">
          <div className="bg-gradient-brand absolute inset-0" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_120%,rgba(124,58,237,0.7),transparent_55%),radial-gradient(circle_at_90%_-20%,rgba(255,255,255,0.35),transparent_45%)]" />
          <div className="absolute inset-0 opacity-[0.15] [background-image:radial-gradient(rgba(255,255,255,0.8)_1px,transparent_1px)] [background-size:18px_18px]" />
        </div>
      </div>

      {/* Channel Info */}
      <div className="px-4 pb-6 sm:px-10">
        <div className="-mt-12 flex flex-col gap-5 md:-mt-14 md:flex-row md:items-end">
          <ChannelAvatar
            name={name}
            src={isOwner ? user?.image : undefined}
            className="size-24 text-4xl ring-4 ring-background md:size-32 md:text-5xl"
          />

          <div className="flex-1 space-y-1.5 md:pb-2">
            <h1 className="text-2xl font-bold tracking-tight md:text-4xl">{name}</h1>
            <div className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground/80">
                @{name.toLowerCase().replace(/\s+/g, "")}
              </span>
              {subscription.count !== null && (
                <>
                  <span>·</span>
                  <span>
                    {formatCount(subscription.count)} {subscription.count === 1 ? "subscriber" : "subscribers"}
                  </span>
                </>
              )}
              {stats && (
                <>
                  <span>·</span>
                  <span>{stats.videos} {stats.videos === 1 ? "video" : "videos"}</span>
                  <span>·</span>
                  <span>{formatCount(stats.views)} total views</span>
                </>
              )}
            </div>
            {channel?.description && (
              <p className="max-w-2xl pt-1 text-sm leading-relaxed text-foreground/75">
                {channel?.description}
              </p>
            )}
          </div>

          <div className="flex gap-2 md:pb-2">
            {!isOwner && channel?._id && (
              <SubscribeButton
                subscribed={subscription.subscribed}
                onToggle={subscription.toggle}
                disabled={subscription.pending}
              />
            )}

            {user && (
              <Button
                onClick={createRoom}
                className="h-10 gap-2 rounded-full border border-white/10 bg-white/[0.06] px-5 text-foreground hover:bg-white/[0.1]"
              >
                <Video className="size-4" />
                Start call
              </Button>
            )}
          </div>
        </div>
      </div>

      {showVideoCall && roomId && (
        <VideoCall roomId={roomId} onClose={() => setShowVideoCall(false)} />
      )}
    </div>
  );
};

export default ChannelHeader;
