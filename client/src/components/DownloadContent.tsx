import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import React, { useEffect, useState } from "react";
import Videogrid from "./Videogrid";
import { Crown, Download, Sparkles } from "lucide-react";
import EmptyState from "./EmptyState";
import { VideoGridSkeleton } from "./Skeletons";
import PremiumPayment from "./PremiumPayment";
import { Button } from "./ui/button";

export default function DownloadContent() {
    const { user } = useUser();
    const [videos, setVideos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDownloads = async () => {
            if (!user?._id) return;
            try {
                const res = await axiosInstance.get(`/download/getall/${user._id}`);
                // Map the response to match Videogrid expected format
                // The API returns [{ _id, videoid: { ...videoData }, viewer, ... }]
                // We need to extract videoid object and potentially keep the download ID if needed for deletion context
                // But Videogrid usually expects an array of video objects.
                const videoList = res.data.map((item: any) => ({
                    ...item.videoid,
                    downloadId: item._id // store the download record ID if needed later
                }));
                setVideos(videoList);
            } catch (error) {
                console.error("Error fetching downloads:", error);
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchDownloads();
        } else {
            setLoading(false);
        }
    }, [user]);

    if (!user) {
        return (
            <EmptyState
                icon={Download}
                title="Watch offline"
                description="Sign in to download videos and see them here."
            />
        );
    }

    if (loading) {
        return (
            <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
                <VideoGridSkeleton count={3} />
            </div>
        );
    }

    const upgrade = (label: string) => (
        <PremiumPayment
            trigger={
                <Button className="bg-gradient-brand h-10 gap-2 rounded-full px-5 font-semibold text-white shadow-lg shadow-brand/25 hover:opacity-95">
                    <Sparkles className="size-4" />
                    {label}
                </Button>
            }
        />
    );

    return (
        <div className="space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-surface p-5">
                <div className="flex items-center gap-3">
                    <div className={`flex size-10 items-center justify-center rounded-xl ${user?.isPremium ? "bg-amber-400/15 text-amber-300" : "bg-white/[0.06] text-muted-foreground"}`}>
                        {user?.isPremium ? <Crown className="size-5" /> : <Download className="size-5" />}
                    </div>
                    <div>
                        <p className="text-sm font-semibold">
                            {user?.isPremium ? "Premium plan" : "Free plan"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {user?.isPremium ? "Unlimited downloads available" : "1 download per day"}
                        </p>
                    </div>
                </div>
                {!user?.isPremium && upgrade("Upgrade for unlimited")}
            </div>

            {videos.length === 0 ? (
                <EmptyState
                    icon={Download}
                    title="No downloaded videos yet"
                    description="Download videos to watch them offline. Free users can download 1 video per day."
                />
            ) : (
                <Videogrid videos={videos} />
            )}
        </div>
    );
}
