import axiosInstance from "./axiosinstance";

// Real YouTube videos, fetched through our server (which holds the API key).
// They share the shape of our own videos, plus `source: "youtube"`.

export type Page = { videos: any[]; nextPageToken: string | null };

export const isYouTube = (video: any) => video?.source === "youtube";

export const videoHref = (video: any) =>
  isYouTube(video) ? `/watch/yt/${video.youtubeId}` : `/watch/${video?._id}`;

/** Human-readable reason, or null when YouTube simply isn't set up. */
export function youTubeErrorMessage(error: any): string | null {
  const code = error?.response?.data?.code;
  if (code === "YOUTUBE_NOT_CONFIGURED") return null;
  return error?.response?.data?.message || "Couldn't load videos from YouTube.";
}

export async function fetchTrending(category?: string, pageToken?: string | null): Promise<Page> {
  const res = await axiosInstance.get("/youtube/trending", {
    params: { category: category && category !== "All" ? category : undefined, pageToken: pageToken || undefined },
  });
  return res.data;
}

export async function searchYouTube(
  q: string,
  opts: { pageToken?: string | null; order?: string; uploadDate?: string } = {}
): Promise<Page> {
  const res = await axiosInstance.get("/youtube/search", {
    params: {
      q,
      pageToken: opts.pageToken || undefined,
      order: opts.order,
      uploadDate: opts.uploadDate && opts.uploadDate !== "any" ? opts.uploadDate : undefined,
    },
  });
  return res.data;
}

export async function fetchYouTubeVideo(id: string) {
  return (await axiosInstance.get(`/youtube/video/${id}`)).data;
}

export async function fetchRelated(id: string): Promise<any[]> {
  return (await axiosInstance.get(`/youtube/video/${id}/related`)).data;
}

export async function fetchComments(id: string, pageToken?: string | null) {
  return (
    await axiosInstance.get(`/youtube/video/${id}/comments`, {
      params: { pageToken: pageToken || undefined },
    })
  ).data as {
    comments: any[];
    nextPageToken: string | null;
    disabled: boolean;
  };
}

export async function fetchSuggestions(q: string): Promise<string[]> {
  try {
    return (await axiosInstance.get("/youtube/suggest", { params: { q } })).data;
  } catch {
    return [];
  }
}
