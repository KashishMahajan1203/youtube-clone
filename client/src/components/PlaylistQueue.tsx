import Link from "next/link";
import { ListVideo, Lock, Shuffle } from "lucide-react";
import VideoRow from "./VideoRow";

// Side panel shown on the watch page while playing a playlist.
export default function PlaylistQueue({
  playlist,
  queue,
  currentId,
  shuffle,
  hrefFor,
}: {
  playlist: any;
  queue: any[];
  currentId: string;
  shuffle: boolean;
  hrefFor: (videoId: string) => string;
}) {
  const position = queue.findIndex((v) => v._id === currentId);
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-surface">
      <div className="border-b border-white/[0.06] p-4">
        <Link href={`/playlist/${playlist._id}`} className="flex items-center gap-2 font-semibold tracking-tight hover:text-white">
          <ListVideo className="size-4 text-brand" />
          <span className="truncate">{playlist.title}</span>
          {playlist.visibility === "private" && <Lock className="size-3.5 shrink-0 text-muted-foreground" />}
        </Link>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          {playlist.owner?.channelname || playlist.owner?.name}
          <span>·</span>
          <span className="tabular-nums">
            {position + 1} / {queue.length}
          </span>
          {shuffle && (
            <>
              <span>·</span>
              <Shuffle className="size-3" /> Shuffled
            </>
          )}
        </p>
      </div>
      <div className="max-h-[480px] space-y-1 overflow-y-auto p-2">
        {queue.map((v) => (
          <VideoRow
            key={v._id}
            video={v}
            compact
            active={v._id === currentId}
            href={hrefFor(v._id)}
          />
        ))}
      </div>
    </div>
  );
}
