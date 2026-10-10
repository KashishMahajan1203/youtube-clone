import LikedContent from "@/components/LikedContent";
import PageHeader from "@/components/PageHeader";
import { ThumbsUp } from "lucide-react";

const index = () => {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <PageHeader icon={ThumbsUp} title="Liked videos" subtitle="Videos you've given a thumbs-up." />
      <LikedContent />
    </main>
  );
};

export default index;
