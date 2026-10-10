import { formatDistanceToNowStrict } from "date-fns";

// Must match the base URL used by axiosInstance. `BACKEND_URL` (without the
// NEXT_PUBLIC_ prefix) is not exposed to the browser, so it can't be used here.
export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001";

export function mediaUrl(filepath?: string) {
  if (!filepath) return "";
  if (/^https?:\/\//.test(filepath)) return filepath;
  return `${BACKEND_URL}/${filepath.replace(/^\/+/, "").replace(/\\/g, "/")}`;
}

const compact = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatCount(n?: number) {
  return compact.format(n ?? 0);
}

export function formatViews(n?: number) {
  const v = n ?? 0;
  return `${formatCount(v)} ${v === 1 ? "view" : "views"}`;
}

export function formatDuration(seconds?: number) {
  if (!seconds || !isFinite(seconds)) return "";
  const s = Math.floor(seconds % 60);
  const m = Math.floor((seconds / 60) % 60);
  const h = Math.floor(seconds / 3600);
  const pad = (x: number) => x.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function timeAgo(date?: string | number | Date) {
  if (!date) return "";
  try {
    return `${formatDistanceToNowStrict(new Date(date))} ago`;
  } catch {
    return "";
  }
}
