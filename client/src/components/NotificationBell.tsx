import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, BellOff, CheckCheck, MessageSquare, UserPlus } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import ChannelAvatar from "./ChannelAvatar";
import axiosInstance from "@/lib/axiosinstance";
import { getSocket } from "@/lib/socket";
import { getToken } from "@/lib/session";
import { mediaUrl, timeAgo } from "@/lib/media";
import { cn } from "@/lib/utils";

interface Notification {
  _id: string;
  type: "upload" | "subscribe" | "reply";
  actor?: string;
  actorName: string;
  actorImage?: string;
  video?: string;
  videoTitle?: string;
  thumbnail?: string;
  text?: string;
  read: boolean;
  createdAt: string;
}

const describe = (n: Notification) =>
  n.type === "upload"
    ? `${n.actorName} uploaded: ${n.videoTitle}`
    : n.type === "reply"
      ? `${n.actorName} replied: "${n.text}"`
      : `${n.actorName} subscribed to your channel`;

const hrefFor = (n: Notification) =>
  n.type !== "subscribe" && n.video ? `/watch/${n.video}` : n.actor ? `/channel/${n.actor}` : "#";

export default function NotificationBell({ userId }: { userId: string }) {
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(() => {
    axiosInstance
      .get(`/notification/${userId}`)
      .then((res) => {
        setItems(res.data.items);
        setUnread(res.data.unread);
      })
      .catch((err) => console.error("Failed to load notifications:", err))
      .finally(() => setLoaded(true));
  }, [userId]);

  useEffect(() => {
    load();
    const socket = getSocket();
    if (!socket) return;

    // Re-register after reconnects so the server room membership survives.
    const register = () => socket.emit("register", getToken());
    register();
    socket.on("connect", register);

    const onNotification = (n: Notification) => {
      setItems((prev) => [n, ...prev].slice(0, 30));
      setUnread((u) => u + 1);
      toast(describe(n), {
        action: {
          label: n.type === "upload" ? "Watch" : n.type === "reply" ? "Reply" : "View",
          onClick: () => (window.location.href = hrefFor(n)),
        },
      });
    };
    socket.on("notification", onNotification);

    return () => {
      socket.off("connect", register);
      socket.off("notification", onNotification);
      socket.emit("unregister");
    };
  }, [userId, load]);

  const markAllRead = async () => {
    if (unread === 0) return;
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await axiosInstance.post(`/notification/${userId}/read`, {});
    } catch (err) {
      console.error(err);
    }
  };

  const markOneRead = (n: Notification) => {
    if (n.read) return;
    setUnread((u) => Math.max(0, u - 1));
    setItems((prev) => prev.map((x) => (x._id === n._id ? { ...x, read: true } : x)));
    axiosInstance.post(`/notification/${userId}/read`, { ids: [n._id] }).catch(() => {});
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="relative flex size-10 items-center justify-center rounded-full transition-colors hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        >
          <Bell className="size-5" />
          {unread > 0 && (
            <span className="bg-gradient-brand absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums text-white ring-2 ring-background">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[min(380px,calc(100vw-24px))] rounded-2xl border-white/10 bg-popover/95 p-0 backdrop-blur-xl"
      >
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          {unread > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <CheckCheck className="size-3.5" /> Mark all read
            </button>
          )}
        </div>

        <div className="max-h-[420px] overflow-y-auto p-1.5">
          {loaded && items.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-10 text-center">
              <BellOff className="mb-3 size-8 text-muted-foreground/50" />
              <p className="text-sm font-medium">No notifications yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Subscribe to channels to hear about new uploads.
              </p>
            </div>
          ) : (
            items.map((n) => (
              <Link
                key={n._id}
                href={hrefFor(n)}
                onClick={() => markOneRead(n)}
                className={cn(
                  "flex gap-3 rounded-xl p-2.5 transition-colors hover:bg-white/[0.05]",
                  !n.read && "bg-white/[0.03]"
                )}
              >
                <span
                  className={cn(
                    "mt-3.5 size-1.5 shrink-0 rounded-full",
                    n.read ? "bg-transparent" : "bg-brand"
                  )}
                />
                <ChannelAvatar name={n.actorName} src={n.actorImage} className="size-9" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-3 text-sm leading-snug">
                    {n.type === "subscribe" && (
                      <UserPlus className="mr-1 inline size-3.5 text-brand" />
                    )}
                    {n.type === "reply" && (
                      <MessageSquare className="mr-1 inline size-3.5 text-brand" />
                    )}
                    {describe(n)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{timeAgo(n.createdAt)}</p>
                </div>
                {n.type !== "subscribe" && n.thumbnail && (
                  <img
                    src={mediaUrl(n.thumbnail)}
                    alt=""
                    className="aspect-video w-20 shrink-0 self-start rounded-md object-cover"
                  />
                )}
              </Link>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
