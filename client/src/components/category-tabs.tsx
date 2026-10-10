"use client";

import { ArrowDownUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/lib/categories";

export type SortKey = "latest" | "popular" | "liked" | "oldest";

const sortOptions: { key: SortKey; label: string }[] = [
  { key: "latest", label: "Latest" },
  { key: "popular", label: "Most viewed" },
  { key: "liked", label: "Most liked" },
  { key: "oldest", label: "Oldest" },
];

export const ALL = "All";

// Videos uploaded before categories existed have none; treat them as "Other".
export const categoryOf = (video: any) => video?.category || "Other";

export function sortVideos(videos: any[], key: SortKey) {
  const list = [...videos];
  const time = (v: any) => new Date(v.createdAt).getTime();
  switch (key) {
    case "popular":
      return list.sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
    case "liked":
      return list.sort((a, b) => (b.Like ?? 0) - (a.Like ?? 0));
    case "oldest":
      return list.sort((a, b) => time(a) - time(b));
    default:
      return list.sort((a, b) => time(b) - time(a));
  }
}

// Categories that actually have videos, in the canonical order.
export function availableCategories(videos: any[]) {
  const present = new Set(videos.map(categoryOf));
  return CATEGORIES.filter((c) => present.has(c));
}

export default function CategoryTabs({
  categories,
  category,
  onCategoryChange,
  sort,
  onSortChange,
}: {
  categories: readonly string[];
  category: string;
  onCategoryChange: (category: string) => void;
  sort: SortKey;
  onSortChange: (key: SortKey) => void;
}) {
  return (
    <div className="glass sticky top-16 z-20 -mx-4 mb-6 px-4 py-3 sm:-mx-6 sm:px-6">
      <div className="flex items-center gap-3">
        <div className="scrollbar-hide flex min-w-0 flex-1 gap-2 overflow-x-auto" role="tablist">
          {[ALL, ...categories].map((c) => {
            const active = category === c;
            return (
              <button
                key={c}
                role="tab"
                aria-selected={active}
                onClick={() => onCategoryChange(c)}
                className={cn(
                  "h-9 shrink-0 rounded-full px-4 text-sm font-medium transition-all",
                  active
                    ? "bg-foreground text-background shadow-md"
                    : "border border-white/10 bg-white/[0.04] text-foreground/80 hover:bg-white/[0.08] hover:text-foreground"
                )}
              >
                {c}
              </button>
            );
          })}
        </div>

        <label className="relative flex h-9 shrink-0 items-center rounded-full border border-white/10 bg-white/[0.04] transition-colors hover:bg-white/[0.08]">
          <ArrowDownUp className="pointer-events-none absolute left-3 size-3.5 text-muted-foreground" />
          <span className="sr-only">Sort videos</span>
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortKey)}
            className="h-full cursor-pointer appearance-none rounded-full bg-transparent pl-8 pr-4 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {sortOptions.map((o) => (
              <option key={o.key} value={o.key} className="bg-popover text-foreground">
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
