import { useEffect, useState } from "react";
import { Check, Clock, Globe, Lock, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import axiosInstance from "@/lib/axiosinstance";
import { cn } from "@/lib/utils";

interface PlaylistSummary {
  _id: string;
  title: string;
  visibility: "public" | "private";
  videoIds: string[];
}

function Row({
  checked,
  onClick,
  icon,
  label,
  hint,
}: {
  checked: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  hint?: React.ReactNode;
}) {
  return (
    <button
      role="checkbox"
      aria-checked={checked}
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.05]"
    >
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
          checked ? "border-transparent bg-brand text-white" : "border-white/25"
        )}
      >
        {checked && <Check className="size-3.5" strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{label}</span>
      <span className="flex items-center gap-1 text-muted-foreground">
        {hint}
        {icon}
      </span>
    </button>
  );
}

export default function SaveToPlaylistDialog({
  open,
  onOpenChange,
  userId,
  videoId,
  isWatchLater,
  onToggleWatchLater,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  videoId: string;
  isWatchLater: boolean;
  onToggleWatchLater: () => void;
}) {
  const [playlists, setPlaylists] = useState<PlaylistSummary[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    axiosInstance
      .get(`/playlist/user/${userId}`, { params: { viewerId: userId } })
      .then((res) => setPlaylists(res.data))
      .catch(() => setPlaylists([]));
  }, [open, userId]);

  const has = (p: PlaylistSummary) => p.videoIds.some((id) => id === videoId);

  const toggle = async (p: PlaylistSummary) => {
    const adding = !has(p);
    // Optimistic update
    setPlaylists((prev) =>
      prev!.map((x) =>
        x._id === p._id
          ? { ...x, videoIds: adding ? [...x.videoIds, videoId] : x.videoIds.filter((id) => id !== videoId) }
          : x
      )
    );
    try {
      await axiosInstance.post(`/playlist/${p._id}/video`, { userId, videoId });
      toast.success(adding ? `Saved to ${p.title}` : `Removed from ${p.title}`);
    } catch {
      toast.error("Couldn't update playlist");
      setPlaylists((prev) => prev!.map((x) => (x._id === p._id ? p : x)));
    }
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    try {
      const res = await axiosInstance.post("/playlist", {
        userId,
        title,
        visibility,
        videoId,
      });
      setPlaylists((prev) => [
        { _id: res.data._id, title: res.data.title, visibility: res.data.visibility, videoIds: [videoId] },
        ...(prev || []),
      ]);
      toast.success(`Saved to ${res.data.title}`);
      setTitle("");
      setCreating(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Couldn't create playlist");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setCreating(false);
      }}
    >
      <DialogContent className="gap-0 rounded-3xl border-white/10 bg-surface p-0 sm:max-w-sm">
        <DialogHeader className="px-5 pb-3 pt-5">
          <DialogTitle className="tracking-tight">Save video to…</DialogTitle>
          <DialogDescription className="sr-only">
            Choose playlists for this video
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[320px] overflow-y-auto px-2">
          <Row
            checked={isWatchLater}
            onClick={onToggleWatchLater}
            label="Watch later"
            icon={<Clock className="size-4" />}
          />
          {playlists === null
            ? [0, 1].map((i) => <div key={i} className="skeleton mx-3 my-2 h-8 rounded-lg" />)
            : playlists.map((p) => (
                <Row
                  key={p._id}
                  checked={has(p)}
                  onClick={() => toggle(p)}
                  label={p.title}
                  icon={p.visibility === "public" ? <Globe className="size-4" /> : <Lock className="size-4" />}
                />
              ))}
        </div>

        <div className="border-t border-white/[0.06] p-3">
          {creating ? (
            <form onSubmit={create} className="space-y-3 p-1">
              <Input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Playlist name"
                maxLength={150}
                className="h-10 rounded-xl border-white/10 bg-white/[0.03]"
              />
              <div className="grid grid-cols-2 gap-2">
                {(["private", "public"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVisibility(v)}
                    className={cn(
                      "flex h-9 items-center justify-center gap-1.5 rounded-xl border text-xs font-medium capitalize transition-colors",
                      visibility === v
                        ? "border-brand/50 bg-brand/10 text-foreground"
                        : "border-white/10 text-muted-foreground hover:bg-white/[0.04]"
                    )}
                  >
                    {v === "public" ? <Globe className="size-3.5" /> : <Lock className="size-3.5" />}
                    {v}
                  </button>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 rounded-full"
                  onClick={() => setCreating(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!title.trim() || busy}
                  className="bg-gradient-brand h-9 rounded-full px-5 font-semibold text-white hover:opacity-95"
                >
                  Create
                </Button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:bg-white/[0.05]"
            >
              <Plus className="size-5" />
              New playlist
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
