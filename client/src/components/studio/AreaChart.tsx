import { useId, useMemo, useState } from "react";
import { formatCount } from "@/lib/media";

export interface Point {
  date: string; // YYYY-MM-DD
  value: number;
}

// Round the axis maximum up to a "nice" number (1, 2, 2.5, 5 × 10^n).
function niceMax(max: number) {
  if (max <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(max));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * pow >= max)!;
  return step * pow;
}

const dayLabel = (date: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en", opts);

/**
 * Responsive area chart. The SVG stretches to fill its box; labels and the
 * hover tooltip are HTML so text never gets distorted.
 */
export default function AreaChart({ data, label }: { data: Point[]; label: string }) {
  const gradientId = useId();
  const [hover, setHover] = useState<number | null>(null);

  const { max, line, area } = useMemo(() => {
    const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
    const n = Math.max(data.length - 1, 1);
    const pts = data.map((d, i) => [(i / n) * 100, 100 - (d.value / max) * 100]);
    const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
    return { max, line, area: `${line} L100,100 L0,100 Z` };
  }, [data]);

  if (data.length === 0) return null;
  const n = Math.max(data.length - 1, 1);
  const ticks = [1, 0.75, 0.5, 0.25, 0];
  // About six date labels along the bottom, whatever the range.
  const every = Math.max(1, Math.ceil(data.length / 6));
  const active = hover !== null ? data[hover] : null;

  return (
    <div className="flex gap-3">
      <div className="relative flex h-64 w-10 shrink-0 flex-col justify-between pb-6 text-right text-[11px] tabular-nums text-muted-foreground">
        {ticks.map((t) => (
          <span key={t} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">
            {formatCount(max * t)}
          </span>
        ))}
      </div>

      <div className="min-w-0 flex-1">
        <div
          className="relative h-58"
          onMouseLeave={() => setHover(null)}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            setHover(Math.min(data.length - 1, Math.max(0, Math.round(x * n))));
          }}
          role="img"
          aria-label={`${label} per day`}
        >
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
            <defs>
              <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.35" />
                <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {ticks.map((t) => (
              <line
                key={t}
                x1="0"
                x2="100"
                y1={100 - t * 100}
                y2={100 - t * 100}
                stroke="currentColor"
                className="text-white/[0.07]"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <path d={area} fill={`url(#${gradientId})`} />
            <path
              d={line}
              fill="none"
              stroke="var(--brand)"
              strokeWidth="2"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {active && hover !== null && (
            <>
              <div
                className="pointer-events-none absolute inset-y-0 w-px bg-white/20"
                style={{ left: `${(hover / n) * 100}%` }}
              />
              <div
                className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-brand"
                style={{ left: `${(hover / n) * 100}%`, top: `${100 - (active.value / max) * 100}%` }}
              />
              <div
                className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-white/10 bg-popover/95 px-2.5 py-1.5 text-xs shadow-xl backdrop-blur"
                style={{ left: `clamp(48px, ${(hover / n) * 100}%, calc(100% - 48px))` }}
              >
                <div className="text-muted-foreground">
                  {dayLabel(active.date, { weekday: "short", day: "numeric", month: "short" })}
                </div>
                <div className="font-semibold tabular-nums">
                  {active.value.toLocaleString()} {label.toLowerCase()}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="relative mt-2 h-4 text-[11px] text-muted-foreground">
          {data.map((d, i) =>
            (i % every === 0 && data.length - 1 - i >= every / 2) || i === data.length - 1 ? (
              <span
                key={d.date}
                className="absolute -translate-x-1/2 whitespace-nowrap first:translate-x-0 last:-translate-x-full"
                style={{ left: `${(i / n) * 100}%` }}
              >
                {dayLabel(d.date, { day: "numeric", month: "short" })}
              </span>
            ) : null
          )}
        </div>
      </div>
    </div>
  );
}
