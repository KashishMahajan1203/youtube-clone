import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import {
  Globe,
  ListVideo,
  Lock,
  Pencil,
  Play,
  Share2,
  Shuffle,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import EmptyState from "@/components/EmptyState";
import VideoRow from "@/components/VideoRow";
import RowMenu from "@/components/RowMenu";
import PlaylistCover from "@/components/PlaylistCover";
import { VideoRowSkeleton } from "@/components/Skeletons";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { timeAgo } from "@/lib/media";
import { cn } from "@/lib/utils";

export default function PlaylistPage() {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : "";
  const { user } = useUser();
  const [playlist, setPlaylist] = useState<any>(undefined);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", visibility: "private" });

  useEffect(() => {
    if (!id) return;
    axiosInstance
      .get(`/playlist/${id}`, { params: user?._id ? { viewerId: user._id } : {} })
      .then((res) => setPlaylist(res.data))
      .catch(() => setPlaylist(null));
  }, [id, user?._id]);

  const isOwner = !!user && playlist?.owner?._id === user._id;
  const videos: any[] = playlist?.videos || [];

  const play = (shuffle = false) => {
    if (videos.length === 0) return;
    const start = shuffle ? videos[Math.floor(Math.random() * videos.length)] : videos[0];
    router.push(`/watch/${start._id}?list=${id}${shuffle ? "&shuffle=1" : ""}`);
  };

  const share = async () => {
    const url = window.location.href;
    if (playlist.visibility === "private") {
      toast.info("This playlist is private. Make it public to share it.");
      return;
    }
    await navigator.clipboard.writeText(url).catch(() => {});
    toast.success("Playlist link copied");
  };

  const removeVideo = async (videoId: string) => {
    setPlaylist((p: any) => ({ ...p, videos: p.videos.filter((v: any) => v._id !== videoId) }));
    try {
      await axiosInstance.post(`/playlist/${id}/video`, { userId: user._id, videoId });
      toast.success("Removed from playlist");
    } catch {
      toast.error("Couldn't remove video");
    }
  };

  const openEdit = () => {
    setForm({
      title: playlist.title,
      description: playlist.description || "",
      visibility: playlist.visibility,
    });
    setEditOpen(true);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axiosInstance.patch(`/playlist/${id}`, { userId: user._id, ...form });
      setPlaylist((p: any) => ({ ...p, ...res.data, videos: p.videos, owner: p.owner }));
      setEditOpen(false);
      toast.success("Playlist updated");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Couldn't update playlist");
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete "${playlist.title}"? This can't be undone.`)) return;
    try {
      await axiosInstance.delete(`/playlist/${id}`, { data: { userId: user._id } });
      toast.success("Playlist deleted");
      router.push("/playlists");
    } catch {
      toast.error("Couldn't delete playlist");
    }
  };

  if (playlist === undefined) {
    return (
      <main className="mx-auto grid w-full max-w-[1400px] gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="skeleton h-80 rounded-3xl" />
        <VideoRowSkeleton count={5} />
      </main>
    );
  }

  if (playlist === null) {
    return (
      <main className="mx-auto max-w-xl px-6 pt-16">
        <EmptyState
          icon={ListVideo}
          title="Playlist not available"
          description="It may be private, or it has been deleted."
          action={
            <Link href="/" className="inline-flex h-10 items-center rounded-full bg-white px-5 text-sm font-semibold text-black hover:bg-white/90">
              Back to home
            </Link>
          }
        />
      </main>
    );
  }

  const iconBtn =
    "size-10 rounded-full border border-white/10 bg-white/[0.06] hover:bg-white/[0.12]";

  return (
    <main className="mx-auto grid w-full max-w-[1400px] gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[360px_minmax(0,1fr)]">
      {/* Playlist panel */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-surface p-5">
          <div className="bg-gradient-brand pointer-events-none absolute -right-16 -top-16 size-48 rounded-full opacity-20 blur-3xl" />
          <PlaylistCover cover={videos[0]} count={videos.length} className="relative" />

          <h1 className="relative mt-5 text-2xl font-bold leading-tight tracking-tight">{playlist.title}</h1>
          <Link
            href={`/channel/${playlist.owner?._id}`}
            className="relative mt-2 inline-block text-sm font-medium hover:text-white"
          >
            {playlist.owner?.channelname || playlist.owner?.name}
          </Link>
          <p className="relative mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            {playlist.visibility === "public" ? <Globe className="size-3.5" /> : <Lock className="size-3.5" />}
            <span className="capitalize">{playlist.visibility}</span>
            <span>·</span>
            <span>Updated {timeAgo(playlist.updatedAt)}</span>
          </p>
          {playlist.description && (
            <p className="relative mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground/80">
              {playlist.description}
            </p>
          )}

          <div className="relative mt-5 flex items-center gap-2">
            {isOwner && (
              <>
                <Button variant="ghost" size="icon" className={iconBtn} onClick={openEdit} title="Edit">
                  <Pencil className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" className={cn(iconBtn, "hover:text-red-400")} onClick={remove} title="Delete">
                  <Trash2 className="size-4" />
                </Button>
              </>
            )}
            <Button variant="ghost" size="icon" className={iconBtn} onClick={share} title="Share">
              <Share2 className="size-4" />
            </Button>
          </div>

          <div className="relative mt-4 grid grid-cols-2 gap-2">
            <Button
              disabled={videos.length === 0}
              onClick={() => play()}
              className="h-10 gap-2 rounded-full bg-white font-semibold text-black hover:bg-white/90"
            >
              <Play className="size-4 fill-current" /> Play all
            </Button>
            <Button
              variant="ghost"
              disabled={videos.length < 2}
              onClick={() => play(true)}
              className="h-10 gap-2 rounded-full border border-white/10 bg-white/[0.06] hover:bg-white/[0.12]"
            >
              <Shuffle className="size-4" /> Shuffle
            </Button>
          </div>
        </div>
      </aside>

      {/* Videos */}
      <section>
        {videos.length === 0 ? (
          <EmptyState
            icon={ListVideo}
            title="This playlist is empty"
            description="Use “Save” under any video to add it here."
          />
        ) : (
          <div className="space-y-2">
            {videos.map((v, i) => (
              <VideoRow
                key={v._id}
                index={i}
                video={v}
                href={`/watch/${v._id}?list=${id}`}
                actions={
                  isOwner ? (
                    <RowMenu label="Remove from playlist" onRemove={() => removeVideo(v._id)} />
                  ) : undefined
                }
              />
            ))}
          </div>
        )}
      </section>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-3xl border-white/10 bg-surface sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit playlist</DialogTitle>
            <DialogDescription>Change the name, description or who can see it.</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveEdit} className="space-y-4">
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Playlist name"
              maxLength={150}
              className="h-11 rounded-xl border-white/10 bg-white/[0.03]"
            />
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Description (optional)"
              className="min-h-[90px] rounded-xl border-white/10 bg-white/[0.03]"
            />
            <div className="grid grid-cols-2 gap-2">
              {(["private", "public"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setForm({ ...form, visibility: v })}
                  className={cn(
                    "flex h-10 items-center justify-center gap-1.5 rounded-xl border text-sm font-medium capitalize transition-colors",
                    form.visibility === v
                      ? "border-brand/50 bg-brand/10"
                      : "border-white/10 text-muted-foreground hover:bg-white/[0.04]"
                  )}
                >
                  {v === "public" ? <Globe className="size-4" /> : <Lock className="size-4" />}
                  {v}
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" className="rounded-full" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!form.title.trim()}
                className="bg-gradient-brand rounded-full px-5 font-semibold text-white hover:opacity-95"
              >
                Save
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
