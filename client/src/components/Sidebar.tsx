import {
  Home,
  Clock,
  ThumbsUp,
  History,
  UserCircle,
  X,
  Download,
  Plus,
  PlaySquare,
  ListVideo,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { Button } from "./ui/button";
import Channeldialogue from "./channeldialogue";
import Logo from "./Logo";
import ChannelAvatar from "./ChannelAvatar";
import { useSubscribedChannels } from "@/hooks/useSubscribedChannels";
import { useUser } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen?: boolean;
  closeSidebar?: () => void;
}

function NavItem({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-10 items-center gap-3.5 rounded-xl px-3 text-sm font-medium transition-colors",
        active
          ? "bg-white/[0.07] text-foreground"
          : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
      )}
    >
      {active && (
        <span className="bg-gradient-brand absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full" />
      )}
      <Icon
        className={cn(
          "size-[18px] shrink-0 transition-colors",
          active ? "text-brand" : "text-muted-foreground group-hover:text-foreground"
        )}
      />
      {label}
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pb-1.5 pt-5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
      {children}
    </p>
  );
}

const Sidebar = ({ isOpen, closeSidebar }: SidebarProps) => {
  const { user, demoLogin } = useUser();
  const router = useRouter();
  const [isdialogeopen, setisdialogeopen] = useState(false);

  // Close the mobile drawer after navigating.
  useEffect(() => {
    closeSidebar?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.asPath]);

  const isActive = (href: string) =>
    href === "/" ? router.pathname === "/" : router.asPath.startsWith(href);

  const channelHref = user ? `/channel/${user._id}` : "";
  const channels = useSubscribedChannels();

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={closeSidebar}
      />

      <aside
        className={cn(
          "flex w-64 shrink-0 flex-col border-r border-white/[0.06] bg-background",
          // Mobile: slide-in drawer
          "fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "-translate-x-full",
          // Desktop: sticky rail under the header
          "lg:sticky lg:top-16 lg:z-auto lg:h-[calc(100vh-4rem)] lg:translate-x-0 lg:bg-transparent"
        )}
      >
        <div className="flex h-16 items-center justify-between px-4 lg:hidden">
          <Logo />
          <Button
            variant="ghost"
            size="icon"
            onClick={closeSidebar}
            className="rounded-full"
            aria-label="Close menu"
          >
            <X className="size-5" />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3">
          <div className="space-y-0.5">
            <NavItem href="/" icon={Home} label="Home" active={isActive("/")} />
            <NavItem
              href="/subscriptions"
              icon={PlaySquare}
              label="Subscriptions"
              active={isActive("/subscriptions")}
            />
          </div>

          {channels && channels.length > 0 && (
            <>
              <SectionLabel>Subscriptions</SectionLabel>
              <div className="space-y-0.5">
                {channels.slice(0, 7).map((c) => {
                  const href = `/channel/${c._id}`;
                  return (
                    <Link
                      key={c._id}
                      href={href}
                      className={cn(
                        "flex h-10 items-center gap-3 rounded-xl px-3 text-sm transition-colors",
                        isActive(href)
                          ? "bg-white/[0.07] text-foreground"
                          : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
                      )}
                    >
                      <ChannelAvatar
                        name={c.channelname || c.name}
                        src={c.image}
                        className="size-6 text-[10px]"
                      />
                      <span className="truncate">{c.channelname || c.name}</span>
                    </Link>
                  );
                })}
                {channels.length > 7 && (
                  <Link
                    href="/subscriptions"
                    className="flex h-9 items-center px-3 text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    Show all {channels.length}
                  </Link>
                )}
              </div>
            </>
          )}

          {user ? (
            <>
              <SectionLabel>You</SectionLabel>
              <div className="space-y-0.5">
                {user?.channelname ? (
                  <NavItem
                    href={channelHref}
                    icon={UserCircle}
                    label="Your channel"
                    active={isActive(channelHref)}
                  />
                ) : (
                  <button
                    onClick={() => setisdialogeopen(true)}
                    className="flex h-10 w-full items-center gap-3.5 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
                  >
                    <Plus className="size-[18px]" />
                    Create channel
                  </button>
                )}
                <NavItem href="/history" icon={History} label="History" active={isActive("/history")} />
                <NavItem href="/liked" icon={ThumbsUp} label="Liked videos" active={isActive("/liked")} />
                <NavItem href="/watch-later" icon={Clock} label="Watch later" active={isActive("/watch-later")} />
                <NavItem href="/playlists" icon={ListVideo} label="Playlists" active={isActive("/playlist")} />
                <NavItem href="/downloads" icon={Download} label="Downloads" active={isActive("/downloads")} />
              </div>

            </>
          ) : (
            <div className="mt-6 rounded-2xl border border-white/10 bg-surface p-4">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Sign in to like videos, comment, and keep your watch history.
              </p>
              <Button
                size="sm"
                onClick={() => demoLogin()}
                className="bg-gradient-brand mt-3 h-8 w-full rounded-full text-xs font-semibold text-white hover:opacity-95"
              >
                Try the demo account
              </Button>
              <p className="mt-2 text-center text-[11px] text-muted-foreground/70">
                No sign-up needed
              </p>
            </div>
          )}
        </nav>

        <div className="border-t border-white/[0.06] px-6 py-4">
          <p className="text-xs text-muted-foreground">
            Built by{" "}
            <span className="font-semibold text-foreground">Kashish Mahajan</span>
          </p>
          <div className="mt-2.5 flex items-center gap-2">
            <a
              href="https://github.com/KashishMahajan1203"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub profile"
              title="GitHub"
              className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-muted-foreground transition-colors hover:bg-white/[0.08] hover:text-foreground"
            >
              <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
                <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.7 5.4-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
              </svg>
            </a>
            <a
              href="https://www.linkedin.com/in/kashish-mahajan12"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn profile"
              title="LinkedIn"
              className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-muted-foreground transition-colors hover:bg-white/[0.08] hover:text-foreground"
            >
              <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
                <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
              </svg>
            </a>
          </div>
         
        </div>

        <Channeldialogue
          isopen={isdialogeopen}
          onclose={() => setisdialogeopen(false)}
          mode="create"
        />
      </aside>
    </>
  );
};

export default Sidebar;
