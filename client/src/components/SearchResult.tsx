import React, { useEffect, useMemo, useState } from "react";
import { Search, SearchX } from "lucide-react";
import axiosInstance from "@/lib/axiosinstance";
import VideoRow from "./VideoRow";
import EmptyState from "./EmptyState";
import { VideoRowSkeleton } from "./Skeletons";

const SearchResult = ({ query }: { query: string }) => {
  const [allVideos, setAllVideos] = useState<any[] | null>(null);

  useEffect(() => {
    axiosInstance
      .get("/video/getall")
      .then((res) => setAllVideos(res.data))
      .catch((error) => {
        console.error("Search failed:", error);
        setAllVideos([]);
      });
  }, []);

  const results = useMemo(() => {
    if (!allVideos) return null;
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    return allVideos.filter((vid) => {
      const haystack = `${vid.videotitle} ${vid.videochanel} ${vid.category || ""} ${vid.description || ""}`.toLowerCase();
      return terms.every((t) => haystack.includes(t));
    });
  }, [allVideos, query]);

  if (!query.trim()) {
    return (
      <EmptyState
        icon={Search}
        title="Search YourTube"
        description="Enter a search term to find videos and channels."
      />
    );
  }

  if (!results) {
    return <VideoRowSkeleton />;
  }

  if (results.length === 0) {
    return (
      <EmptyState
        icon={SearchX}
        title="No results found"
        description="Try different keywords or check your spelling."
      />
    );
  }

  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">
        {results.length} {results.length === 1 ? "result" : "results"}
      </p>
      <div className="space-y-2">
        {results.map((video: any) => (
          <VideoRow key={video._id} video={video} />
        ))}
      </div>
    </div>
  );
};

export default SearchResult;
