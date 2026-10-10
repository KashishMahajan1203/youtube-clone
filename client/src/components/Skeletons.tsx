export function VideoCardSkeleton() {
  return (
    <div className="space-y-3">
      <div className="skeleton aspect-video rounded-xl" />
      <div className="flex gap-3">
        <div className="skeleton size-9 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2 pt-0.5">
          <div className="skeleton h-3.5 w-11/12 rounded" />
          <div className="skeleton h-3 w-2/3 rounded" />
          <div className="skeleton h-3 w-1/2 rounded" />
        </div>
      </div>
    </div>
  );
}

export function VideoGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <VideoCardSkeleton key={i} />
      ))}
    </>
  );
}

export function VideoRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="skeleton aspect-video w-44 shrink-0 rounded-xl sm:w-56" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="skeleton h-4 w-3/4 rounded" />
            <div className="skeleton h-3 w-1/3 rounded" />
            <div className="skeleton h-3 w-1/4 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
