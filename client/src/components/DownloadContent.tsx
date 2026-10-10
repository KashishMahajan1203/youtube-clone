import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import React, { useEffect, useState } from "react";
import Videogrid from "./Videogrid";
import { Download } from "lucide-react";
import EmptyState from "./EmptyState";
import { VideoGridSkeleton } from "./Skeletons";

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

    if (videos.length === 0) {
        return (
            <EmptyState
                icon={Download}
                title="No downloaded videos yet"
                description="Hit “Download” under any video and it will show up here."
            />
        );
    }

    return <Videogrid videos={videos} />;
}
