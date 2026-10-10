import WatchLaterContent from "@/components/WatchLaterContent";
import PageHeader from "@/components/PageHeader";
import { Clock } from "lucide-react";

export default function WatchLaterPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <PageHeader icon={Clock} title="Watch later" subtitle="Your queue of videos saved for later." />
      <WatchLaterContent />
    </main>
  );
}
