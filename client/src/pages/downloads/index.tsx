import DownloadContent from "@/components/DownloadContent";
import PageHeader from "@/components/PageHeader";
import { Download } from "lucide-react";

export default function DownloadsPage() {
    return (
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
            <PageHeader icon={Download} title="Downloads" subtitle="Videos saved to your account for offline viewing." />
            <DownloadContent />
        </main>
    );
}
