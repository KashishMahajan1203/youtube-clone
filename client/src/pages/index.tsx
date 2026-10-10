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
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { Shapes } from "lucide-react";

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

  const categories = useMemo(
    () => (videos ? availableCategories(videos) : []),
    [videos]
  );

  const shown = useMemo(() => {
    if (!videos) return null;
    const filtered =
      category === ALL ? videos : videos.filter((v) => categoryOf(v) === category);
    return sortVideos(filtered, sort);
  }, [videos, sort, category]);

  return (
    <main className="mx-auto w-full max-w-[1800px] px-4 pb-16 sm:px-6">
      <section className="animate-fade-up pb-2 pt-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Discover something <span className="text-gradient-brand">worth watching</span>
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          {videos
            ? `${videos.length} ${videos.length === 1 ? "video" : "videos"} from creators on YourTube.`
            : "Loading the latest uploads…"}
        </p>
      </section>

      <CategoryTabs
        categories={categories}
        category={category}
        onCategoryChange={setCategory}
        sort={sort}
        onSortChange={setSort}
      />

      {!shown ? (
        <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
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
    </main>
  );
}
