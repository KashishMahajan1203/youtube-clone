import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  Eye,
  ThumbsUp,
  UserPlus,
  MessageSquare,
  Pencil,
  Trash2,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Film,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import VideoThumbnail from "@/components/VideoThumbnail";
import AreaChart, { type Point } from "@/components/studio/AreaChart";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { CATEGORIES } from "@/lib/categories";
import { formatCount, timeAgo } from "@/lib/media";
import { cn } from "@/lib/utils";

/* ===================== TYPES ===================== */

type Metric = "views" | "subscribers" | "likes";

interface Overview {
  days: number;
  totals: { videos: number; views: number; likes: number; dislikes: number; comments: number; subscribers: number };
  period: Record<Metric, { value: number; previous: number }>;
  series: Record<Metric, Point[]>;
  topVideos: { video: StudioVideo; periodViews: number }[];
}

interface StudioVideo {
  _id: string;
  videotitle: string;
  description?: string;
  category?: string;
  filepath: string;
  thumbnail?: string;
  thumbnailTime?: number;
  views: number;
  Like: number;
  Dislike: number;
  comments?: number;
  hls?: string;
  createdAt: string;
}

const RANGES = [7, 28, 90];

const METRICS: { key: Metric; label: string; icon: typeof Eye }[] = [
  { key: "views", label: "Views", icon: Eye },
  { key: "subscribers", label: "Subscribers", icon: UserPlus },
  { key: "likes", label: "Likes", icon: ThumbsUp },
];

/* ===================== PIECES ===================== */

function Change({ value, previous }: { value: number; previous: number }) {
  if (previous === 0) {
    return value > 0 ? <span className="text-xs font-medium text-emerald-400">New</span> : null;
  }
  const pct = Math.round(((value - previous) / previous) * 100);
  const up = pct >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={cn("flex items-center gap-1 text-xs font-medium", up ? "text-emerald-400" : "text-red-400")}>
      <Icon className="size-3.5" />
      {up ? "+" : ""}
      {pct}%
    </span>
  );
}

function MetricTab({
  active,
  onClick,
  icon: Icon,
  label,
  value,
  change,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Eye;
  label: string;
  value: number;
  change: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "relative flex-1 rounded-xl px-4 py-3 text-left transition-colors",
        active ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"
      )}
    >
      {active && <span className="bg-gradient-brand absolute inset-x-4 top-0 h-0.5 rounded-full" />}
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </span>
      <span className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-bold tabular-nums tracking-tight">{formatCount(value)}</span>
        {change}
      </span>
    </button>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Eye; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-surface/60 p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </div>
      <div className="mt-1.5 text-xl font-bold tabular-nums">{value.toLocaleString()}</div>
    </div>
  );
}

/* ===================== EDIT DIALOG ===================== */

function EditVideoDialog({
  video,
  onClose,
  onSaved,
}: {
  video: StudioVideo | null;
  onClose: () => void;
  onSaved: (v: StudioVideo) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Other");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!video) return;
    setTitle(video.videotitle);
    setDescription(video.description || "");
    setCategory(video.category || "Other");
  }, [video]);

  const save = async () => {
    if (!video || !title.trim()) return;
    setSaving(true);
    try {
      const res = await axiosInstance.patch(`/video/${video._id}`, {
        videotitle: title,
        description,
        category,
      });
      onSaved({ ...video, ...res.data });
      toast.success("Video updated");
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Couldn't save changes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!video} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-2xl border-white/10 bg-popover/95 backdrop-blur-xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit video details</DialogTitle>
          <DialogDescription>Changes show up everywhere the video appears.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="studio-title">Title</Label>
            <Input id="studio-title" value={title} maxLength={150} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="studio-description">Description</Label>
            <Textarea
              id="studio-description"
              value={description}
              maxLength={5000}
              rows={5}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="studio-category">Category</Label>
            <select
              id="studio-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c} className="bg-popover">
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" className="rounded-full" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={save}
            disabled={saving || !title.trim()}
            className="bg-gradient-brand rounded-full font-semibold text-white"
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ===================== PAGE ===================== */

export default function StudioPage() {
  const { user } = useUser();
  const [days, setDays] = useState(28);
  const [metric, setMetric] = useState<Metric>("views");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [videos, setVideos] = useState<StudioVideo[] | null>(null);
  const [editing, setEditing] = useState<StudioVideo | null>(null);
  const [deleting, setDeleting] = useState<StudioVideo | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const loadOverview = useCallback(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    axiosInstance
      .get("/studio/overview", { params: { days, tz } })
      .then((res) => setOverview(res.data))
      .catch(() => toast.error("Couldn't load analytics"));
  }, [days]);

  const loadVideos = useCallback(() => {
    axiosInstance
      .get("/studio/videos")
      .then((res) => setVideos(res.data))
      .catch(() => setVideos([]));
  }, []);

  useEffect(() => {
    if (user?.channelname) loadOverview();
  }, [user?.channelname, loadOverview]);

  useEffect(() => {
    if (user?.channelname) loadVideos();
  }, [user?.channelname, loadVideos]);

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await axiosInstance.delete(`/video/${deleting._id}`);
      setVideos((prev) => prev?.filter((v) => v._id !== deleting._id) ?? null);
      toast.success("Video deleted");
      setDeleting(null);
      loadOverview();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Couldn't delete the video");
    } finally {
      setDeleteBusy(false);
    }
  };

  const shell = (children: React.ReactNode) => (
    <main className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6">
      <PageHeader
        icon={BarChart3}
        title="Creator Studio"
        subtitle={user?.channelname ? `Channel analytics for ${user.channelname}` : "Analytics for your channel"}
        action={
          user?.channelname && (
            <div className="flex rounded-full border border-white/10 bg-white/[0.03] p-1" role="group" aria-label="Date range">
              {RANGES.map((r) => (
                <button
                  key={r}
                  onClick={() => setDays(r)}
                  aria-pressed={days === r}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
                    days === r ? "bg-white text-black" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {r} days
                </button>
              ))}
            </div>
          )
        }
      />
      {children}
    </main>
  );

  if (!user) {
    return shell(
      <EmptyState
        icon={BarChart3}
        title="See how your channel is doing"
        description="Sign in to view views, subscribers and likes for your videos."
      />
    );
  }

  if (!user.channelname) {
    return shell(
      <EmptyState
        icon={Film}
        title="Create a channel first"
        description="Use “Create channel” in the sidebar, upload a video, and your analytics will show up here."
      />
    );
  }

  const topMax = Math.max(1, ...(overview?.topVideos.map((t) => t.periodViews) ?? [1]));

  return shell(
    <div className="space-y-6">
      {/* Chart */}
      <section className="rounded-2xl border border-white/[0.07] bg-surface/60 p-2 sm:p-3">
        <div className="flex flex-col gap-1 sm:flex-row">
          {METRICS.map((m) => (
            <MetricTab
              key={m.key}
              active={metric === m.key}
              onClick={() => setMetric(m.key)}
              icon={m.icon}
              label={m.label}
              value={overview?.period[m.key].value ?? 0}
              change={overview && <Change {...overview.period[m.key]} />}
            />
          ))}
        </div>
        <div className="px-2 pb-2 pt-5 sm:px-3">
          {overview ? (
            <AreaChart data={overview.series[metric]} label={METRICS.find((m) => m.key === metric)!.label} />
          ) : (
            <div className="skeleton h-64 rounded-xl" />
          )}
        </div>
        <p className="px-4 pb-2 text-xs text-muted-foreground">
          Last {days} days, compared with the {days} days before. Repeat views by the same viewer within 30 minutes count once.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Lifetime */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Lifetime</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard icon={Eye} label="Views" value={overview?.totals.views ?? 0} />
            <StatCard icon={UserPlus} label="Subscribers" value={overview?.totals.subscribers ?? 0} />
            <StatCard icon={Film} label="Videos" value={overview?.totals.videos ?? 0} />
            <StatCard icon={ThumbsUp} label="Likes" value={overview?.totals.likes ?? 0} />
            <StatCard icon={MessageSquare} label="Comments" value={overview?.totals.comments ?? 0} />
            <div className="rounded-2xl border border-white/[0.07] bg-surface/60 p-4">
              <div className="text-xs font-medium text-muted-foreground">Like ratio</div>
              {(() => {
                const l = overview?.totals.likes ?? 0;
                const d = overview?.totals.dislikes ?? 0;
                const pct = l + d === 0 ? 0 : Math.round((l / (l + d)) * 100);
                return (
                  <>
                    <div className="mt-1.5 text-xl font-bold tabular-nums">{l + d === 0 ? "—" : `${pct}%`}</div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                      <div className="bg-gradient-brand h-full rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </section>

        {/* Top videos */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Top videos · {days} days
          </h2>
          <div className="space-y-1 rounded-2xl border border-white/[0.07] bg-surface/60 p-2">
            {!overview ? (
              [0, 1, 2].map((i) => <div key={i} className="skeleton h-14 rounded-xl" />)
            ) : overview.topVideos.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">No views in this period yet.</p>
            ) : (
              overview.topVideos.map(({ video, periodViews }, i) => (
                <Link
                  key={video._id}
                  href={`/watch/${video._id}`}
                  className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-white/[0.04]"
                >
                  <span className="w-4 text-center text-xs font-bold text-muted-foreground">{i + 1}</span>
                  <VideoThumbnail
                    filepath={video.filepath}
                    thumbnail={video.thumbnail}
                    frameAt={video.thumbnailTime}
                    preview={false}
                    className="w-24 shrink-0"
                    rounded="rounded-lg"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-medium">{video.videotitle}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
                        <div
                          className="bg-gradient-brand h-full rounded-full"
                          style={{ width: `${(periodViews / topMax) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums text-muted-foreground">{formatCount(periodViews)}</span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Content */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Your videos</h2>
          <Button asChild size="sm" variant="ghost" className="rounded-full">
            <Link href={`/channel/${user._id}`}>
              <Upload className="size-4" /> Upload
            </Link>
          </Button>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-white/[0.07] bg-surface/60">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-white/[0.07] text-left text-xs font-medium text-muted-foreground">
                <th className="px-4 py-3 font-medium">Video</th>
                <th className="px-3 py-3 font-medium">Category</th>
                <th className="px-3 py-3 text-right font-medium">Views</th>
                <th className="px-3 py-3 text-right font-medium">Likes</th>
                <th className="px-3 py-3 text-right font-medium">Comments</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {videos === null ? (
                [0, 1].map((i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-4 py-2">
                      <div className="skeleton h-14 rounded-xl" />
                    </td>
                  </tr>
                ))
              ) : videos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    No uploads yet.{" "}
                    <Link href={`/channel/${user._id}`} className="font-medium text-brand hover:underline">
                      Upload your first video
                    </Link>
                  </td>
                </tr>
              ) : (
                videos.map((v) => (
                  <tr key={v._id} className="group border-b border-white/[0.05] last:border-0 hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <VideoThumbnail
                          filepath={v.filepath}
                          thumbnail={v.thumbnail}
                          frameAt={v.thumbnailTime}
                          preview={false}
                          className="w-28 shrink-0"
                          rounded="rounded-lg"
                        />
                        <div className="min-w-0">
                          <p className="line-clamp-2 font-medium">{v.videotitle}</p>
                          <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                            {timeAgo(v.createdAt)}
                            {v.hls && (
                              <span className="rounded border border-white/15 px-1 text-[10px] font-semibold">HLS</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{v.category || "Other"}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{v.views.toLocaleString()}</td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {v.Like.toLocaleString()}
                      {v.Like + v.Dislike > 0 && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({Math.round((v.Like / (v.Like + v.Dislike)) * 100)}%)
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{(v.comments ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button asChild size="icon" variant="ghost" className="size-8 rounded-full" aria-label="Watch">
                          <Link href={`/watch/${v._id}`}>
                            <ExternalLink className="size-4" />
                          </Link>
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 rounded-full"
                          aria-label="Edit details"
                          onClick={() => setEditing(v)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 rounded-full text-red-400 hover:bg-red-500/10 hover:text-red-400"
                          aria-label="Delete video"
                          onClick={() => setDeleting(v)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <EditVideoDialog
        video={editing}
        onClose={() => setEditing(null)}
        onSaved={(updated) => setVideos((prev) => prev?.map((v) => (v._id === updated._id ? updated : v)) ?? null)}
      />

      <Dialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent className="rounded-2xl border-white/10 bg-popover/95 backdrop-blur-xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this video?</DialogTitle>
            <DialogDescription>
              “{deleting?.videotitle}” and its comments, likes and stats will be removed permanently.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" className="rounded-full" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              disabled={deleteBusy}
              className="rounded-full bg-red-500 font-semibold text-white hover:bg-red-500/90"
            >
              {deleteBusy ? "Deleting…" : "Delete forever"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
