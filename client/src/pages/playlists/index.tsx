import Link from "next/link";
import { useEffect, useState } from "react";
import { Globe, ListVideo, Lock } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import PlaylistCover from "@/components/PlaylistCover";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { timeAgo } from "@/lib/media";

export default function PlaylistsPage() {
  const { user } = useUser();
  const [playlists, setPlaylists] = useState<any[] | null>(null);

  useEffect(() => {
    if (!user?._id) return;
    axiosInstance
      .get(`/playlist/user/${user._id}`, { params: { viewerId: user._id } })
      .then((res) => setPlaylists(res.data))
      .catch(() => setPlaylists([]));
  }, [user?._id]);

  const grid = "grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4";

  return (
    <main className="mx-auto w-full max-w-[1800px] px-4 py-8 sm:px-6">
      <PageHeader icon={ListVideo} title="Playlists" subtitle="Collections of videos you've put together." />

      {!user ? (
        <EmptyState
          icon={ListVideo}
          title="Organise your favourites"
          description="Sign in to create and view your playlists."
        />
      ) : playlists === null ? (
        <div className={grid}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-3">
              <div className="skeleton aspect-video rounded-xl" />
              <div className="skeleton h-4 w-2/3 rounded" />
            </div>
          ))}
        </div>
      ) : playlists.length === 0 ? (
        <EmptyState
          icon={ListVideo}
          title="No playlists yet"
          description="Tap “Save” under any video and choose “New playlist” to start one."
        />
      ) : (
        <div className={grid}>
          {playlists.map((p, i) => (
            <Link
              key={p._id}
              href={`/playlist/${p._id}`}
              className="animate-fade-up group block"
              style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
            >
              <PlaylistCover cover={p.cover} count={p.count} />
              <h3 className="mt-3 line-clamp-2 font-semibold tracking-tight group-hover:text-white">
                {p.title}
              </h3>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                {p.visibility === "public" ? <Globe className="size-3.5" /> : <Lock className="size-3.5" />}
                <span className="capitalize">{p.visibility}</span>
                <span>·</span>
                <span>Updated {timeAgo(p.updatedAt)}</span>
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
