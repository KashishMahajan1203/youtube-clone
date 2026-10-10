import HistoryContent from "@/components/HistoryContent";
import PageHeader from "@/components/PageHeader";
import { History } from "lucide-react";

const index = () => {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <PageHeader icon={History} title="Watch history" subtitle="Everything you've watched, most recent first." />
      <HistoryContent />
    </main>
  );
};

export default index;
