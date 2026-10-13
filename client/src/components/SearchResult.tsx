import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Search, SearchX, SlidersHorizontal } from "lucide-react";
import VideoRow from "./VideoRow";
import EmptyState from "./EmptyState";
import ChannelAvatar from "./ChannelAvatar";
import { VideoRowSkeleton } from "./Skeletons";
import { categoryOf } from "./category-tabs";
import { CATEGORIES } from "@/lib/categories";
import { loadVideos, searchVideos, tokenize } from "@/lib/search";
import { formatCount } from "@/lib/media";
import { searchYouTube, youTubeErrorMessage } from "@/lib/youtube";
import { cn } from "@/lib/utils";

type UploadDate = "any" | "hour" | "today" | "week" | "month" | "year";
type SortBy = "relevance" | "date" | "views" | "likes";

const UPLOAD_DATES: { key: UploadDate; label: string; ms: number }[] = [
  { key: "any", label: "Any time", ms: Infinity },
  { key: "hour", label: "Last hour", ms: 3_600_000 },
  { key: "today", label: "Today", ms: 86_400_000 },
  { key: "week", label: "This week", ms: 7 * 86_400_000 },
  { key: "month", label: "This month", ms: 30 * 86_400_000 },
  { key: "year", label: "This year", ms: 365 * 86_400_000 },
];

const SORTS: { key: SortBy; label: string }[] = [
  { key: "relevance", label: "Relevance" },
  { key: "date", label: "Upload date" },
  { key: "views", label: "View count" },
  { key: "likes", label: "Rating" },
];

const ALL = "All";

const YT_ORDER: Record<SortBy, string> = {
  relevance: "relevance",
  date: "date",
  views: "viewCount",
  likes: "rating",
};

const time = (v: any) => new Date(v.createdAt).getTime();
function sortList(list: any[], sortBy: SortBy) {
  switch (sortBy) {
    case "date":
      return [...list].sort((a, b) => time(b) - time(a));
    case "views":
      return [...list].sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
    case "likes":
      return [...list].sort((a, b) => (b.Like ?? 0) - (a.Like ?? 0));
    default:
      return list;
  }
}

type YtState = {
  key: string;
  videos: any[];
  next: string | null;
  loadingMore: boolean;
  enabled: boolean;
  error: string | null;
};

const SearchResult = ({ query }: { query: string }) => {
  const [allVideos, setAllVideos] = useState<any[] | null>(null);
  const [category, setCategory] = useState(ALL);
  const [uploadDate, setUploadDate] = useState<UploadDate>("any");
  const [sortBy, setSortBy] = useState<SortBy>("relevance");
  const [showFilters, setShowFilters] = useState(false);
  const [now] = useState(() => Date.now());

  // A new search starts with fresh filters.
  const [filtersFor, setFiltersFor] = useState(query);
  if (filtersFor !== query) {
    setFiltersFor(query);
    setCategory(ALL);
    setUploadDate("any");
    setSortBy("relevance");
  }

  useEffect(() => {
    loadVideos()
      .then(setAllVideos)
      .catch((error) => {
        console.error("Search failed:", error);
        setAllVideos([]);
      });
  }, []);

  // YouTube results for the current query and server-side filters. The first
  // page is "loading" until the state catches up with the request key.
  const ytKey = `${query.trim()}|${sortBy}|${uploadDate}`;
  const [yt, setYt] = useState<YtState>({
    key: "",
    videos: [],
    next: null,
    loadingMore: false,
    enabled: true,
    error: null,
  });

  useEffect(() => {
    if (!query.trim()) return;
    let cancelled = false;
    searchYouTube(query.trim(), { order: YT_ORDER[sortBy], uploadDate })
      .then((page) => {
        if (cancelled) return;
        setYt({ key: ytKey, videos: page.videos, next: page.nextPageToken, loadingMore: false, enabled: true, error: null });
      })
      .catch((error) => {
        if (cancelled) return;
        const message = youTubeErrorMessage(error);
        setYt({ key: ytKey, videos: [], next: null, loadingMore: false, enabled: message !== null, error: message });
      });
    return () => {
      cancelled = true;
    };
  }, [ytKey, query, sortBy, uploadDate]);

  const ytReady = yt.key === ytKey;

  const loadMore = () => {
    if (!ytReady || !yt.next || yt.loadingMore) return;
    const key = ytKey;
    setYt((s) => ({ ...s, loadingMore: true }));
    searchYouTube(query.trim(), { order: YT_ORDER[sortBy], uploadDate, pageToken: yt.next })
      .then((page) =>
        setYt((s) => {
          if (s.key !== key) return s;
          const seen = new Set(s.videos.map((v) => v._id));
          return {
            ...s,
            videos: [...s.videos, ...page.videos.filter((v) => !seen.has(v._id))],
            next: page.nextPageToken,
            loadingMore: false,
          };
        })
      )
      .catch((error) =>
        setYt((s) => (s.key !== key ? s : { ...s, loadingMore: false, next: null, error: youTubeErrorMessage(error) }))
      );
  };

  // Infinite scroll for YouTube results.
  const sentinel = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef(loadMore);
  useEffect(() => {
    loadMoreRef.current = loadMore;
  });
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !ytReady || !yt.next) return;
    const observer = new IntersectionObserver(
      (entries) => entries[0].isIntersecting && loadMoreRef.current(),
      { rootMargin: "800px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ytReady, yt.next]);

  const matches = useMemo(
    () => (allVideos ? searchVideos(allVideos, query) : null),
    [allVideos, query]
  );

  // Channels whose name matches the query get a card above the videos.
  const channel = useMemo(() => {
    if (!allVideos) return null;
    const q = tokenize(query).join(" ");
    if (!q) return null;
    const hit = allVideos.find((v) => {
      const name = tokenize(v.videochanel || "").join(" ");
      return name && (name === q || name.startsWith(q + " ") || (q.length >= 4 && name.includes(q)));
    });
    if (!hit) return null;
    const videos = allVideos.filter((v) => v.videochanel === hit.videochanel);
    return {
      name: hit.videochanel as string,
      id: hit.uploader as string | undefined,
      count: videos.length,
      views: videos.reduce((n, v) => n + (v.views ?? 0), 0),
    };
  }, [allVideos, query]);

  const categories = useMemo(() => {
    const present = new Set([...(matches || []), ...(ytReady ? yt.videos : [])].map(categoryOf));
    return CATEGORIES.filter((c) => present.has(c));
  }, [matches, ytReady, yt.videos]);

  const results = useMemo(() => {
    if (!matches) return null;
    const maxAge = UPLOAD_DATES.find((d) => d.key === uploadDate)!.ms;
    const list = matches.filter(
      (v) =>
        (category === ALL || categoryOf(v) === category) &&
        now - new Date(v.createdAt).getTime() <= maxAge
    );
    // YouTube already applied the upload date filter and sort order.
    const fromYouTube = (ytReady ? yt.videos : []).filter(
      (v) => category === ALL || categoryOf(v) === category
    );
    if (sortBy === "relevance") return [...list, ...fromYouTube];
    return sortList([...list, ...fromYouTube], sortBy);
  }, [matches, category, uploadDate, sortBy, now, ytReady, yt.videos]);

  if (!query.trim()) {
    return (
      <EmptyState
        icon={Search}
        title="Search YourTube"
        description="Enter a search term to find videos and channels."
      />
    );
  }

  if (!results || (results.length === 0 && !ytReady)) {
    return <VideoRowSkeleton />;
  }

  const filtered = category !== ALL || uploadDate !== "any";

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <div className="scrollbar-hide flex min-w-0 flex-1 gap-2 overflow-x-auto">
          {[ALL, ...categories].map((c) => (
            <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
              {c}
            </Chip>
          ))}
        </div>
        <button
          onClick={() => setShowFilters((s) => !s)}
          aria-expanded={showFilters}
          className={cn(
            "flex h-9 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors",
            showFilters ? "bg-white/[0.12]" : "hover:bg-white/[0.08]"
          )}
        >
          <SlidersHorizontal className="size-4" />
          Filters
        </button>
      </div>

      {showFilters && (
        <div className="animate-fade-up mb-6 grid gap-6 rounded-2xl border border-white/10 bg-surface/60 p-5 sm:grid-cols-2">
          <FilterGroup
            title="Upload date"
            options={UPLOAD_DATES}
            value={uploadDate}
            onChange={setUploadDate}
          />
          <FilterGroup title="Sort by" options={SORTS} value={sortBy} onChange={setSortBy} />
        </div>
      )}

      {channel && category === ALL && (
        <div className="mb-4 flex items-center gap-4 border-b border-white/[0.06] pb-6 sm:gap-8">
          <Link
            href={channel.id ? `/channel/${channel.id}` : "#"}
            className="flex w-40 shrink-0 justify-center sm:w-60 md:w-72"
          >
            <ChannelAvatar name={channel.name} className="size-20 text-3xl sm:size-28 sm:text-4xl" />
          </Link>
          <div className="min-w-0 flex-1">
            <Link href={channel.id ? `/channel/${channel.id}` : "#"}>
              <h2 className="truncate text-lg font-semibold sm:text-xl">{channel.name}</h2>
            </Link>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              {channel.count} {channel.count === 1 ? "video" : "videos"} ·{" "}
              {formatCount(channel.views)} views
            </p>
            {channel.id && (
              <Link
                href={`/channel/${channel.id}`}
                className="mt-3 inline-flex h-9 items-center rounded-full bg-white px-4 text-sm font-semibold text-black hover:bg-white/90"
              >
                View channel
              </Link>
            )}
          </div>
        </div>
      )}

      {results.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No results found"
          description={
            filtered
              ? "No videos match these filters. Try removing some."
              : "Try different keywords or remove search filters."
          }
          action={
            filtered ? (
              <button
                onClick={() => {
                  setCategory(ALL);
                  setUploadDate("any");
                }}
                className="h-9 rounded-full bg-white px-4 text-sm font-semibold text-black hover:bg-white/90"
              >
                Clear filters
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-2">
          {results.map((video: any) => (
            <VideoRow key={video._id} video={video} showDescription />
          ))}
        </div>
      )}

      {yt.error && ytReady && (
        <p className="mt-6 text-center text-sm text-muted-foreground">{yt.error}</p>
      )}
      <div ref={sentinel} />
      {results.length > 0 && (!ytReady || yt.loadingMore) && yt.enabled && (
        <div className="flex justify-center py-8">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
};

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "h-9 shrink-0 rounded-full px-4 text-sm font-medium transition-all",
        active
          ? "bg-foreground text-background"
          : "bg-white/[0.08] text-foreground/90 hover:bg-white/[0.14]"
      )}
    >
      {children}
    </button>
  );
}

function FilterGroup<K extends string>({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: { key: K; label: string }[];
  value: K;
  onChange: (key: K) => void;
}) {
  return (
    <div>
      <h3 className="mb-2 border-b border-white/10 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <ul className="space-y-1">
        {options.map((o) => (
          <li key={o.key}>
            <button
              onClick={() => onChange(o.key)}
              className={cn(
                "text-sm transition-colors",
                value === o.key
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {o.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default SearchResult;
