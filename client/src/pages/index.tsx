import CategoryTabs, {
  ALL,
  availableCategories,
  categoryOf,
  sortVideos,
  type SortKey,
} from "@/components/category-tabs";
import Videogrid from "@/components/Videogrid";
import EmptyState from "@/components/EmptyState";
import { VideoGridSkeleton } from "@/components/Skeletons";
import axiosInstance from "@/lib/axiosinstance";
import { CATEGORIES } from "@/lib/categories";
import { fetchTrending, youTubeErrorMessage } from "@/lib/youtube";
import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Shapes } from "lucide-react";

const gridClass =
  "grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4";

export default function Home() {
  const router = useRouter();
  const [videos, setVideos] = useState<any[] | null>(null);
  const [sort, setSort] = useState<SortKey>("latest");

  // Category lives in the URL (?category=Music) so it survives refresh and
  // can be linked to, e.g. from the category chip on a watch page.
  const category =
    typeof router.query.category === "string" ? router.query.category : ALL;
  const setCategory = (c: string) =>
    router.replace(c === ALL ? "/" : { pathname: "/", query: { category: c } }, undefined, {
      shallow: true,
      scroll: false,
    });

  useEffect(() => {
    axiosInstance
      .get("/video/getall")
      .then((res) => setVideos(res.data))
      .catch((error) => {
        console.log(error);
        setVideos([]);
      });
  }, []);

  // Trending videos from YouTube for the selected category, loaded page by
  // page. The first page is "loading" until the state catches up with the category.
  const [yt, setYt] = useState<{
    category: string | null;
    videos: any[];
    next: string | null;
    loadingMore: boolean;
    enabled: boolean;
    error: string | null;
  }>({ category: null, videos: [], next: null, loadingMore: false, enabled: true, error: null });

  useEffect(() => {
    if (!router.isReady) return;
    let cancelled = false;
    fetchTrending(category)
      .then((page) => {
        if (cancelled) return;
        setYt({ category, videos: page.videos, next: page.nextPageToken, loadingMore: false, enabled: true, error: null });
      })
      .catch((error) => {
        if (cancelled) return;
        const message = youTubeErrorMessage(error);
        setYt({ category, videos: [], next: null, loadingMore: false, enabled: message !== null, error: message });
      });
    return () => {
      cancelled = true;
    };
  }, [category, router.isReady]);

  const ytReady = yt.category === category;

  const loadMore = useCallback(() => {
    if (!ytReady || !yt.next || yt.loadingMore) return;
    const cat = category;
    setYt((s) => ({ ...s, loadingMore: true }));
    fetchTrending(cat, yt.next)
      .then((page) =>
        setYt((s) => {
          if (s.category !== cat) return s;
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
        setYt((s) => (s.category !== cat ? s : { ...s, loadingMore: false, next: null, error: youTubeErrorMessage(error) }))
      );
  }, [ytReady, yt.next, yt.loadingMore, category]);

  // Infinite scroll.
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !ytReady || !yt.next || yt.loadingMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "800px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ytReady, yt.next, yt.loadingMore, loadMore]);

  const categories = useMemo(() => {
    if (yt.enabled) return CATEGORIES.filter((c) => c !== "Other");
    return videos ? availableCategories(videos) : [];
  }, [videos, yt.enabled]);

  const shown = useMemo(() => {
    if (!videos) return null;
    const own = category === ALL ? videos : videos.filter((v) => categoryOf(v) === category);
    const trending = ytReady ? yt.videos : [];
    // By default our own uploads come first, then YouTube's trending order.
    if (sort === "latest") return [...sortVideos(own, sort), ...trending];
    return sortVideos([...own, ...trending], sort);
  }, [videos, yt.videos, ytReady, sort, category]);

  const waitingForFirstPage = !ytReady && yt.enabled;

  return (
    <main className="mx-auto w-full max-w-[1800px] px-4 pb-16 sm:px-6">
      <section className="animate-fade-up pb-2 pt-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Discover something <span className="text-gradient-brand">worth watching</span>
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          {!videos
            ? "Loading the latest uploads…"
            : yt.enabled
              ? "Uploads from creators on YourTube, plus what's trending on YouTube."
              : `${videos.length} ${videos.length === 1 ? "video" : "videos"} from creators on YourTube.`}
        </p>
      </section>

      <CategoryTabs
        categories={categories}
        category={category}
        onCategoryChange={setCategory}
        sort={sort}
        onSortChange={setSort}
      />

      {!shown || (shown.length === 0 && waitingForFirstPage) ? (
        <div className={gridClass}>
          <VideoGridSkeleton />
        </div>
      ) : shown.length === 0 && category !== ALL ? (
        <EmptyState
          icon={Shapes}
          title={`No ${category} videos yet`}
          description="Try another category, or upload the first one."
        />
      ) : (
        <Videogrid key={category} videos={shown} />
      )}

      {yt.error && (
        <p className="mt-8 text-center text-sm text-muted-foreground">{yt.error}</p>
      )}
      <div ref={sentinel} />
      {yt.loadingMore && (
        <div className="flex justify-center py-8">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}
    </main>
  );
}
