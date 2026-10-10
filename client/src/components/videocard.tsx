"use client";
import Link from "next/link";
import VideoThumbnail from "./VideoThumbnail";
import ChannelAvatar from "./ChannelAvatar";
import { formatViews, timeAgo } from "@/lib/media";

export default function VideoCard({ video }: any) {
  return (
    <Link
      href={`/watch/${video?._id}`}
      className="group block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <VideoThumbnail filepath={video?.filepath} thumbnail={video?.thumbnail} title={video?.videotitle} />
      <div className="mt-3 flex gap-3">
        <ChannelAvatar name={video?.videochanel} className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight text-foreground/95 transition-colors group-hover:text-white">
            {video?.videotitle}
          </h3>
          <p className="mt-1 truncate text-sm text-muted-foreground transition-colors group-hover:text-foreground/80">
            {video?.videochanel}
          </p>
          <p className="text-sm text-muted-foreground">
            {formatViews(video?.views)} · {timeAgo(video?.createdAt)}
          </p>
        </div>
      </div>
    </Link>
  );
}
