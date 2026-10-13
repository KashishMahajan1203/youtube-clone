import axiosInstance from "./axiosinstance";

// Client-side search shared by the header suggestions and the results page.

const STOPWORDS = new Set(["a", "an", "the", "of", "in", "on", "and", "to", "for", "is", "with"]);

export function tokenize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

function queryTerms(query: string) {
  const terms = tokenize(query);
  const meaningful = terms.filter((t) => !STOPWORDS.has(t));
  return meaningful.length ? meaningful : terms;
}

function editDistance(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 2) return 3;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    prev = cur;
  }
  return prev[b.length];
}

// 1 = exact/prefix/substring hit, 0.6 = close spelling, 0 = no match.
function termMatch(term: string, words: string[], text: string) {
  // Very short terms only match the start of a word, so "b" doesn't hit "ambience".
  if (term.length < 3) return words.some((w) => w.startsWith(term)) ? 1 : 0;
  if (text.includes(term)) return 1;
  if (term.length < 5) return 0;
  const allowed = term.length >= 8 ? 2 : 1;
  for (const w of words) {
    if (editDistance(term, w) <= allowed) return 0.6;
    // Typo in a word that is still being typed: "jelyf" ~ "jellyf…".
    if (w.length > term.length) {
      // Compare against prefixes one letter shorter/longer to allow a missing or extra letter.
      for (const len of [term.length, term.length + 1, term.length - 1]) {
        if (editDistance(term, w.slice(0, len)) <= allowed) return 0.5;
      }
    }
  }
  return 0;
}

const FIELDS: { get: (v: any) => string; weight: number }[] = [
  { get: (v) => v.videotitle || "", weight: 4 },
  { get: (v) => v.videochanel || "", weight: 3 },
  { get: (v) => v.category || "", weight: 2 },
  { get: (v) => v.description || "", weight: 1 },
];

export function scoreVideo(video: any, query: string) {
  const terms = queryTerms(query);
  if (!terms.length) return { matched: 0, score: 0 };
  const fields = FIELDS.map((f) => {
    const text = f.get(video).toLowerCase();
    return { text, words: tokenize(text), weight: f.weight };
  });

  let matched = 0;
  let score = 0;
  for (const term of terms) {
    let best = 0;
    for (const f of fields) best = Math.max(best, termMatch(term, f.words, f.text) * f.weight);
    if (best > 0) {
      matched++;
      score += best;
    }
  }
  // Whole phrase in the title ranks highest.
  const phrase = query.trim().toLowerCase();
  if (terms.length > 1 && fields[0].text.includes(phrase)) score += 6;
  // Ties go to more popular videos.
  score += Math.log10((video.views ?? 0) + 1) * 0.1;
  return { matched, score };
}

export function searchVideos(videos: any[], query: string) {
  return videos
    .map((video) => ({ video, ...scoreVideo(video, query) }))
    .filter((r) => r.matched > 0)
    .sort((a, b) => b.matched - a.matched || b.score - a.score)
    .map((r) => r.video);
}

// Suggestions for the header dropdown, built from titles, channels and
// categories, most relevant first.
export function suggest(videos: any[], query: string, limit = 8) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const seen = new Set<string>();
  const ranked: { text: string; rank: number }[] = [];
  const add = (raw: string, rank: number) => {
    const text = raw.trim().toLowerCase();
    if (!text || seen.has(text) || text === q) return;
    seen.add(text);
    ranked.push({ text, rank });
  };

  for (const v of videos) {
    for (const source of [v.videochanel, v.videotitle, v.category]) {
      if (!source) continue;
      const s = source.toLowerCase();
      if (s.startsWith(q)) add(source, 0);
      else if (s.includes(` ${q}`)) add(source, 1);
    }
  }
  if (ranked.length < limit) {
    const needed = queryTerms(query).length;
    for (const v of searchVideos(videos, query)) {
      if (scoreVideo(v, query).matched === needed) add(v.videotitle, 2);
    }
  }
  return ranked
    .sort((a, b) => a.rank - b.rank || a.text.length - b.text.length)
    .slice(0, limit)
    .map((r) => r.text);
}

// Shared, lazily loaded video list so the header doesn't refetch on every keystroke.
let videosPromise: Promise<any[]> | null = null;
export function loadVideos() {
  if (!videosPromise) {
    videosPromise = axiosInstance
      .get("/video/getall")
      .then((res) => (Array.isArray(res.data) ? res.data : []))
      .catch((error) => {
        videosPromise = null;
        throw error;
      });
    // Refresh the cache after a minute so new uploads show up.
    setTimeout(() => (videosPromise = null), 60_000);
  }
  return videosPromise;
}

// Recent searches, kept per browser like YouTube's search history.
const HISTORY_KEY = "search-history";
const HISTORY_MAX = 20;

export function getSearchHistory(): string[] {
  try {
    const list = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(list) ? list.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

function saveHistory(list: string[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, HISTORY_MAX)));
  } catch {
    // Storage unavailable (private mode); history is a convenience only.
  }
}

export function addSearchHistory(query: string) {
  const q = query.trim();
  if (!q) return;
  saveHistory([q, ...getSearchHistory().filter((s) => s.toLowerCase() !== q.toLowerCase())]);
}

export function removeSearchHistory(query: string) {
  saveHistory(getSearchHistory().filter((s) => s !== query));
}
