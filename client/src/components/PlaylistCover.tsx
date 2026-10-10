import { ListVideo } from "lucide-react";
import { mediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

// Stacked-card cover with a video count badge, like YouTube's playlist tiles.
export default function PlaylistCover({
  cover,
  count,
  className,
}: {
  cover?: { filepath?: string; thumbnail?: string } | null;
  count: number;
  className?: string;
}) {
  const img = mediaUrl(cover?.thumbnail);
  const vid = mediaUrl(cover?.filepath);
  return (
    <div className={cn("relative pt-2", className)}>
      <div className="absolute inset-x-4 top-0 h-3 rounded-t-xl bg-white/10" />
      <div className="absolute inset-x-2 top-1 h-3 rounded-t-xl bg-white/20" />
      <div className="relative aspect-video overflow-hidden rounded-xl bg-surface-2 ring-1 ring-white/5">
        {img ? (
          <img src={img} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        ) : vid ? (
          <video src={`${vid}#t=0.5`} muted preload="metadata" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-surface-2 to-surface-3">
            <ListVideo className="size-8 text-white/25" />
          </div>
        )}
        <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/80 px-1.5 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
          <ListVideo className="size-3" />
          {count} {count === 1 ? "video" : "videos"}
        </span>
      </div>
    </div>
  );
}
