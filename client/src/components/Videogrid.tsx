import React, { useEffect, useState } from "react";
import { Clapperboard } from "lucide-react";
import Videocard from "./videocard";
import EmptyState from "./EmptyState";
import { VideoGridSkeleton } from "./Skeletons";
import axiosInstance from "@/lib/axiosinstance";

const gridClass =
  "grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4";

const Videogrid = ({ videos: propVideos }: { videos?: any[] }) => {
  const [videos, setvideo] = useState<any[] | null>(propVideos || null);
  const [loading, setloading] = useState(!propVideos);

  useEffect(() => {
    if (propVideos) {
      setvideo(propVideos);
      return;
    }
    const fetchvideo = async () => {
      try {
        const res = await axiosInstance.get("/video/getall");
        setvideo(res.data);
      } catch (error) {
        console.log(error);
      } finally {
        setloading(false);
      }
    };
    fetchvideo();
  }, [propVideos]);

  if (loading) {
    return (
      <div className={gridClass}>
        <VideoGridSkeleton />
      </div>
    );
  }

  if (!videos || videos.length === 0) {
    return (
      <EmptyState
        icon={Clapperboard}
        title="No videos yet"
        description="Uploaded videos will show up here. Create a channel and upload your first one."
      />
    );
  }

  return (
    <div className={gridClass}>
      {videos.map((video: any, i: number) => (
        <div
          key={video._id}
          className="animate-fade-up"
          style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
        >
          <Videocard video={video} />
        </div>
      ))}
    </div>
  );
};

export default Videogrid;
