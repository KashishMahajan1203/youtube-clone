// YouTube Data API v3 client. The key stays on the server; responses are
// cached in memory because the daily quota is small (search costs 100 units,
// everything else 1 unit, out of 10,000 per day by default).

const API = "https://www.googleapis.com/youtube/v3";

export class YouTubeError extends Error {
  constructor(message, status = 502, code = "YOUTUBE_ERROR", reason = "") {
    super(message);
    this.status = status;
    this.code = code;
    this.reason = reason;
  }
}

export const isYouTubeEnabled = () => !!process.env.YOUTUBE_API_KEY;
const region = () => process.env.YOUTUBE_REGION || "IN";

// Our categories → YouTube video category ids.
const CATEGORY_IDS = {
  Music: "10",
  Gaming: "20",
  Education: "27",
  Technology: "28",
  Entertainment: "24",
  Comedy: "23",
  Sports: "17",
  News: "25",
  Travel: "19",
  Food: "26",
  Lifestyle: "22",
  Science: "28",
};
const CATEGORY_NAMES = {
  1: "Entertainment",
  2: "Lifestyle",
  10: "Music",
  15: "Lifestyle",
  17: "Sports",
  19: "Travel",
  20: "Gaming",
  22: "Lifestyle",
  23: "Comedy",
  24: "Entertainment",
  25: "News",
  26: "Lifestyle",
  27: "Education",
  28: "Technology",
  29: "News",
};

/* ---------- cache ---------- */
const cache = new Map();
const CACHE_MAX = 500;

async function cached(key, ttlMs, load) {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  const value = await load();
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(key, { value, expires: Date.now() + ttlMs });
  return value;
}

async function call(endpoint, params) {
  if (!isYouTubeEnabled()) {
    throw new YouTubeError("YouTube is not configured on the server", 503, "YOUTUBE_NOT_CONFIGURED");
  }
  const url = new URL(`${API}/${endpoint}`);
  for (const [k, v] of Object.entries({ ...params, key: process.env.YOUTUBE_API_KEY })) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
  }
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const reason = data?.error?.errors?.[0]?.reason || "";
    const message = data?.error?.message || "YouTube request failed";
    console.error(`[youtube] ${endpoint} ${res.status} ${reason}: ${message}`);
    if (reason === "quotaExceeded" || reason === "dailyLimitExceeded") {
      throw new YouTubeError("YouTube daily quota exceeded, try again tomorrow", 429, "YOUTUBE_QUOTA", reason);
    }
    if (/API key/i.test(message) || reason === "keyInvalid" || reason === "accessNotConfigured") {
      throw new YouTubeError("YouTube API key is invalid or the API is not enabled", 503, "YOUTUBE_KEY_INVALID", reason);
    }
    if (res.status === 404) throw new YouTubeError("Not found on YouTube", 404, "NOT_FOUND", reason);
    throw new YouTubeError(message, 502, "YOUTUBE_ERROR", reason);
  }
  return data;
}

/* ---------- normalisation ---------- */

// "PT1H2M3S" → 3723
function parseDuration(iso = "") {
  const m = /P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso);
  if (!m) return 0;
  const [, d = 0, h = 0, min = 0, s = 0] = m.map((x) => Number(x) || 0);
  return d * 86400 + h * 3600 + min * 60 + s;
}

function bestThumb(thumbs = {}) {
  const t = thumbs.maxres || thumbs.standard || thumbs.high || thumbs.medium || thumbs.default;
  return t?.url || "";
}

// Shape a YouTube video like our own video documents so the UI can render both.
function toVideo(item) {
  const s = item.snippet || {};
  const stats = item.statistics || {};
  const id = typeof item.id === "string" ? item.id : item.id?.videoId;
  return {
    _id: `yt_${id}`,
    source: "youtube",
    youtubeId: id,
    videotitle: s.title || "",
    videochanel: s.channelTitle || "",
    channelId: s.channelId || "",
    description: s.description || "",
    category: CATEGORY_NAMES[s.categoryId] || "Other",
    thumbnail: bestThumb(s.thumbnails),
    duration: parseDuration(item.contentDetails?.duration),
    live: s.liveBroadcastContent === "live",
    views: Number(stats.viewCount) || 0,
    Like: Number(stats.likeCount) || 0,
    commentCount: Number(stats.commentCount) || 0,
    createdAt: s.publishedAt,
  };
}

async function videosById(ids) {
  if (!ids.length) return [];
  const data = await call("videos", {
    part: "snippet,statistics,contentDetails",
    id: ids.join(","),
    maxResults: 50,
  });
  // Keep the order the ids were given in (search relevance).
  const byId = new Map(data.items.map((it) => [it.id, toVideo(it)]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
}

/* ---------- public API ---------- */

export function trending({ category, pageToken } = {}) {
  const categoryId = CATEGORY_IDS[category];
  const key = `trending:${region()}:${categoryId || ""}:${pageToken || ""}`;
  return cached(key, 30 * 60_000, async () => {
    try {
      const data = await call("videos", {
        part: "snippet,statistics,contentDetails",
        chart: "mostPopular",
        regionCode: region(),
        videoCategoryId: categoryId,
        maxResults: 24,
        pageToken,
      });
      return { videos: data.items.map(toVideo), nextPageToken: data.nextPageToken || null };
    } catch (error) {
      // Some categories have no chart in some regions; treat as empty.
      if (error.code === "NOT_FOUND" || error.reason === "videoChartNotFound") {
        return { videos: [], nextPageToken: null };
      }
      throw error;
    }
  });
}

const ORDERS = new Set(["relevance", "date", "viewCount", "rating"]);
const PUBLISHED_WITHIN = {
  hour: 3_600_000,
  today: 86_400_000,
  week: 7 * 86_400_000,
  month: 30 * 86_400_000,
  year: 365 * 86_400_000,
};

export function search({ q, pageToken, order, uploadDate } = {}) {
  const query = String(q || "").trim().slice(0, 200);
  if (!query) return Promise.resolve({ videos: [], nextPageToken: null });
  const sort = ORDERS.has(order) ? order : "relevance";
  const within = PUBLISHED_WITHIN[uploadDate];
  // Round to the hour so the cache key stays stable.
  const publishedAfter = within
    ? new Date(Math.floor((Date.now() - within) / 3_600_000) * 3_600_000).toISOString()
    : undefined;
  const key = `search:${region()}:${query.toLowerCase()}:${sort}:${uploadDate || ""}:${pageToken || ""}`;
  return cached(key, 15 * 60_000, async () => {
    const data = await call("search", {
      part: "snippet",
      type: "video",
      q: query,
      order: sort,
      publishedAfter,
      regionCode: region(),
      safeSearch: "moderate",
      maxResults: 20,
      pageToken,
    });
    const ids = data.items.map((it) => it.id?.videoId).filter(Boolean);
    return { videos: await videosById(ids), nextPageToken: data.nextPageToken || null };
  });
}

export function getVideo(id) {
  return cached(`video:${id}`, 10 * 60_000, async () => {
    const [video] = await videosById([id]);
    if (!video) throw new YouTubeError("Video not found", 404, "NOT_FOUND");
    return video;
  });
}

// YouTube removed "related videos" from the API, so "up next" is popular
// videos in the same category.
export async function related(id) {
  const video = await getVideo(id);
  const { videos } = await trending({ category: video.category });
  const list = videos.length ? videos : (await trending()).videos;
  return list.filter((v) => v.youtubeId !== id);
}

export function comments(id, { pageToken, order } = {}) {
  const sort = order === "time" ? "time" : "relevance";
  return cached(`comments:${id}:${sort}:${pageToken || ""}`, 10 * 60_000, async () => {
    try {
      const data = await call("commentThreads", {
        part: "snippet",
        videoId: id,
        order: sort,
        maxResults: 20,
        textFormat: "plainText",
        pageToken,
      });
      return {
        comments: data.items.map((it) => {
          const c = it.snippet.topLevelComment.snippet;
          return {
            id: it.id,
            author: c.authorDisplayName,
            authorImage: c.authorProfileImageUrl,
            text: c.textDisplay,
            likes: c.likeCount || 0,
            replies: it.snippet.totalReplyCount || 0,
            createdAt: c.publishedAt,
          };
        }),
        nextPageToken: data.nextPageToken || null,
        disabled: false,
      };
    } catch (error) {
      // Comments turned off for this video.
      if (error.reason === "commentsDisabled") {
        return { comments: [], nextPageToken: null, disabled: true };
      }
      throw error;
    }
  });
}

// Search-as-you-type suggestions from YouTube's public suggest endpoint (no
// key or quota needed). Unofficial, so failures just return nothing.
export function suggestions(q) {
  const query = String(q || "").trim().slice(0, 100);
  if (!query) return Promise.resolve([]);
  return cached(`suggest:${query.toLowerCase()}`, 60 * 60_000, async () => {
    try {
      const url = new URL("https://suggestqueries.google.com/complete/search");
      url.search = new URLSearchParams({ client: "firefox", ds: "yt", hl: "en", gl: region(), q: query });
      const res = await fetch(url, { signal: AbortSignal.timeout(4_000) });
      if (!res.ok) return [];
      const text = new TextDecoder("utf-8").decode(await res.arrayBuffer());
      const data = JSON.parse(text);
      return Array.isArray(data?.[1]) ? data[1].filter((s) => typeof s === "string").slice(0, 10) : [];
    } catch {
      return [];
    }
  });
}
