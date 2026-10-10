import VideoRow from "./VideoRow";

interface RelatedVideosProps {
  videos: Array<{
    _id: string;
    videotitle: string;
    videochanel: string;
    filepath?: string;
    views: number;
    createdAt: string;
  }>;
}

export default function RelatedVideos({ videos }: RelatedVideosProps) {
  if (videos.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-muted-foreground">
        No other videos yet.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {videos.map((video) => (
        <VideoRow key={video._id} video={video} compact />
      ))}
    </div>
  );
}
