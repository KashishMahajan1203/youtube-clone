import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { History, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  addSearchHistory,
  getSearchHistory,
  loadVideos,
  removeSearchHistory,
  suggest,
} from "@/lib/search";
import { fetchSuggestions } from "@/lib/youtube";

type Item = { text: string; recent: boolean };

// YouTube-style search box: recent searches and live suggestions in a
// dropdown, keyboard navigation, clear button and a search button.
export default function SearchBox({
  autoFocus,
  onSearched,
}: {
  autoFocus?: boolean;
  onSearched?: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [videos, setVideos] = useState<any[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [remote, setRemote] = useState<{ q: string; list: string[] }>({ q: "", list: [] });
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // Keep the box in sync with the URL.
  const urlQuery =
    router.pathname === "/search" && typeof router.query.q === "string" ? router.query.q : null;
  const [syncedUrlQuery, setSyncedUrlQuery] = useState<string | null>(null);
  if (urlQuery !== syncedUrlQuery) {
    setSyncedUrlQuery(urlQuery);
    if (urlQuery !== null) setQuery(urlQuery);
  }

  // Focus with "/" like YouTube.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.key !== "/" || target.isContentEditable) return;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const openDropdown = () => {
    setHistory(getSearchHistory());
    setOpen(true);
    loadVideos().then(setVideos).catch(() => {});
  };

  // YouTube's own search suggestions, fetched shortly after typing stops.
  useEffect(() => {
    const q = query.trim();
    if (!q || !open) return;
    const timer = setTimeout(() => {
      fetchSuggestions(q).then((list) => setRemote({ q, list }));
    }, 150);
    return () => clearTimeout(timer);
  }, [query, open]);

  const items: Item[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const recent = history
      .filter((h) => !q || h.toLowerCase().startsWith(q))
      .slice(0, q ? 3 : 10)
      .map((text) => ({ text, recent: true }));
    const taken = new Set(recent.map((r) => r.text.toLowerCase()));
    const fromYouTube = remote.q === query.trim() ? remote.list : [];
    const live = [...fromYouTube, ...suggest(videos, query, 10)]
      .map((text) => text.toLowerCase())
      .filter((text) => !taken.has(text) && taken.add(text))
      .slice(0, 10 - recent.length)
      .map((text) => ({ text, recent: false }));
    return [...recent, ...live];
  }, [query, history, videos, remote]);

  const runSearch = (text: string) => {
    const q = text.trim();
    if (!q) return;
    setQuery(q);
    addSearchHistory(q);
    setOpen(false);
    inputRef.current?.blur();
    router.push(`/search?q=${encodeURIComponent(q)}`);
    onSearched?.();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    if (!open) return openDropdown();
    if (!items.length) return;
    const next =
      e.key === "ArrowDown"
        ? active + 1 >= items.length ? -1 : active + 1
        : active - 1 < -1 ? items.length - 1 : active - 1;
    setActive(next);
  };

  const removeRecent = (text: string) => {
    removeSearchHistory(text);
    setHistory(getSearchHistory());
    inputRef.current?.focus();
  };

  // Shown in the input while arrowing through suggestions, as on YouTube.
  const shown = active >= 0 && items[active] ? items[active].text : query;
  const showList = open && items.length > 0;

  return (
    <div ref={boxRef} className="relative flex flex-1">
      <form
        role="search"
        className="flex flex-1"
        onSubmit={(e) => {
          e.preventDefault();
          runSearch(shown);
        }}
      >
        <div
          className={cn(
            "group relative flex h-11 flex-1 items-center rounded-l-full border border-r-0 border-white/10 bg-white/[0.04] transition-all hover:border-white/15",
            "focus-within:border-brand/50 focus-within:bg-white/[0.06] focus-within:ring-4 focus-within:ring-brand/15"
          )}
        >
          <Search className="pointer-events-none ml-4 hidden size-4 shrink-0 text-muted-foreground group-focus-within:block" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={showList}
            aria-controls="search-suggestions"
            aria-autocomplete="list"
            autoComplete="off"
            spellCheck={false}
            placeholder="Search"
            value={shown}
            autoFocus={autoFocus}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(-1);
              if (!open) openDropdown();
            }}
            onFocus={openDropdown}
            onKeyDown={onKeyDown}
            className="h-full min-w-0 flex-1 bg-transparent px-4 text-[15px] outline-none placeholder:text-muted-foreground/80"
          />
          {shown ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setActive(-1);
                inputRef.current?.focus();
              }}
              className="mr-2 flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-white/10 hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="size-5" />
            </button>
          ) : (
            <kbd className="pointer-events-none mr-4 hidden rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground md:block">
              /
            </kbd>
          )}
        </div>
        <button
          type="submit"
          className="flex h-11 w-16 shrink-0 items-center justify-center rounded-r-full border border-white/10 bg-white/[0.08] transition-colors hover:bg-white/[0.14]"
          aria-label="Search"
          title="Search"
        >
          <Search className="size-5" />
        </button>
      </form>

      {showList && (
        <ul
          id="search-suggestions"
          role="listbox"
          className="absolute left-0 right-16 top-[calc(100%+6px)] z-50 overflow-hidden rounded-2xl border border-white/10 bg-popover/95 py-2 shadow-2xl shadow-black/50 backdrop-blur-xl"
        >
          {items.map((item, i) => (
            <li
              key={`${item.recent}-${item.text}`}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                // Keep focus in the input until the click lands.
                e.preventDefault();
                runSearch(item.text);
              }}
              className={cn(
                "flex cursor-pointer items-center gap-4 px-4 py-1.5 text-[15px]",
                i === active && "bg-white/[0.08]"
              )}
            >
              {item.recent ? (
                <History className="size-4 shrink-0 text-muted-foreground" />
              ) : (
                <Search className="size-4 shrink-0 text-muted-foreground" />
              )}
              <span className="min-w-0 flex-1 truncate">
                <Completion text={item.text} query={query} />
              </span>
              {item.recent && (
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    removeRecent(item.text);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// YouTube bolds the part of a suggestion the user hasn't typed yet.
function Completion({ text, query }: { text: string; query: string }) {
  const q = query.trim().toLowerCase();
  if (q && text.toLowerCase().startsWith(q)) {
    return (
      <>
        {text.slice(0, q.length)}
        <span className="font-semibold">{text.slice(q.length)}</span>
      </>
    );
  }
  return <span className="font-semibold">{text}</span>;
}
