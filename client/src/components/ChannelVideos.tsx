import { Clapperboard } from "lucide-react";
import Videogrid from "./Videogrid";
import EmptyState from "./EmptyState";

export default function ChannelVideos({ videos }: any) {
  if (videos.length === 0) {
    return (
      <EmptyState
        icon={Clapperboard}
        title="No videos uploaded yet"
        description="Videos published to this channel will appear here."
      />
    );
  }

  return <Videogrid videos={videos} />;
}
