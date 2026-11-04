export function TitleRowSkeleton() {
  return (
    <div className="pt-2" aria-hidden="true">
      <div className="relative flex items-center justify-between gap-3.5 px-4 py-3 min-h-[72px] rounded-pill bg-surface-soft/70 border border-line">
        {/* Top-left floating status badge skeleton */}
        <span className="absolute -top-2.5 left-5 h-4 w-16 rounded-pill skeleton-shimmer" />

        {/* Left: avatar + text lines */}
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <div className="w-12 h-12 rounded-pill shrink-0 skeleton-shimmer" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-3/5 max-w-[220px] rounded-pill skeleton-shimmer" />
            <div className="h-3 w-2/5 max-w-[140px] rounded-pill skeleton-shimmer" />
          </div>
        </div>

        {/* Right: episode badge + +1 button */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-pill skeleton-shimmer hidden sm:block" />
          <div className="w-14 h-8 rounded-pill skeleton-shimmer" />
          <div className="w-11 h-11 rounded-pill skeleton-shimmer" />
        </div>
      </div>
    </div>
  );
}

export default function WatchlistLoading() {
  return (
    <div
      role="status"
      aria-label="Memuat daftar tontonan..."
      className="min-h-dvh lg:h-dvh w-full max-w-[1440px] mx-auto p-3 sm:p-4 lg:p-6 flex flex-col lg:flex-row gap-4 lg:gap-6 overflow-x-hidden"
    >
      {/* LEFT PANEL SKELETON (50%) */}
      <div className="w-full lg:w-1/2 lg:flex-1 rounded-panel bg-hero-gradient shadow-hero p-5 sm:p-7 flex flex-col justify-between min-h-[260px] md:min-h-[320px] lg:min-h-0 overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-11 h-11 rounded-icon skeleton-shimmer-hero" />
            <div className="hidden sm:block h-4 w-28 rounded-pill skeleton-shimmer-hero" />
          </div>
          <div className="w-11 h-11 rounded-icon skeleton-shimmer-hero" />
        </div>

        {/* Center Spotlight Skeleton */}
        <div className="my-3 md:my-5 flex flex-col items-center justify-center">
          <div className="flex flex-row md:flex-col items-center gap-4 w-full max-w-lg bg-surface/20 md:bg-transparent p-3.5 md:p-0 rounded-card">
            <div className="relative flex items-center justify-center">
              <div className="hidden md:block absolute -left-14 w-11 h-11 rounded-pill skeleton-shimmer-hero" />
              <div className="w-24 h-36 sm:w-32 sm:h-44 lg:w-52 lg:h-72 rounded-card skeleton-shimmer-hero border-2 border-surface/40 shadow-hero shrink-0" />
              <div className="hidden md:block absolute -right-14 w-11 h-11 rounded-pill skeleton-shimmer-hero" />
            </div>

            <div className="flex-1 md:flex-initial flex flex-col items-start md:items-center space-y-2.5 w-full">
              <div className="h-6 w-36 rounded-pill skeleton-shimmer-hero" />
              <div className="h-9 w-52 sm:w-64 rounded-pill skeleton-shimmer-hero" />
              <div className="h-6 w-44 rounded-pill skeleton-shimmer-hero" />
              <div className="flex items-center gap-2 pt-1">
                <div className="h-11 w-36 rounded-pill skeleton-shimmer-hero" />
                <div className="h-11 w-32 rounded-pill skeleton-shimmer-hero" />
              </div>
            </div>
          </div>

          {/* Indicator dots skeleton */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className="w-8 h-2 rounded-pill skeleton-shimmer-hero" />
            <div className="w-2 h-2 rounded-pill skeleton-shimmer-hero" />
            <div className="w-2 h-2 rounded-pill skeleton-shimmer-hero" />
            <div className="w-2 h-2 rounded-pill skeleton-shimmer-hero" />
          </div>
        </div>

        {/* Bottom Floating StatCards Skeleton */}
        <div className="flex items-end justify-between gap-3">
          <div className="w-40 md:w-44 h-20 md:h-28 rounded-card bg-surface/80 p-4 flex flex-col justify-between shadow-card">
            <div className="w-9 h-9 rounded-icon skeleton-shimmer" />
            <div className="space-y-1.5">
              <div className="h-3 w-20 rounded-pill skeleton-shimmer" />
              <div className="h-7 w-12 rounded-pill skeleton-shimmer" />
            </div>
          </div>
          <div className="w-40 md:w-44 h-20 md:h-28 rounded-card bg-surface/80 p-4 flex flex-col justify-between shadow-card">
            <div className="w-9 h-9 rounded-icon skeleton-shimmer" />
            <div className="space-y-1.5">
              <div className="h-3 w-20 rounded-pill skeleton-shimmer" />
              <div className="h-7 w-12 rounded-pill skeleton-shimmer" />
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL SKELETON (50%) */}
      <div className="w-full lg:w-1/2 lg:flex-1 rounded-panel bg-surface shadow-card p-5 sm:p-7 flex flex-col justify-between lg:h-full lg:overflow-hidden border border-line/60">
        <div className="flex-1 flex flex-col min-h-0">
          {/* Header + Big Stats Skeleton */}
          <div className="pb-3.5 border-b border-line shrink-0 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-7 w-48 rounded-pill skeleton-shimmer" />
              <div className="h-6 w-28 rounded-pill skeleton-shimmer" />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div className="grid grid-cols-2 divide-x divide-line flex-1 max-w-xs">
                <div className="pr-4 space-y-1.5">
                  <div className="h-3 w-14 rounded-pill skeleton-shimmer" />
                  <div className="h-11 w-16 rounded-card skeleton-shimmer" />
                </div>
                <div className="pl-4 space-y-1.5">
                  <div className="h-3 w-14 rounded-pill skeleton-shimmer" />
                  <div className="h-11 w-16 rounded-card skeleton-shimmer" />
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-6 w-24 rounded-pill skeleton-shimmer" />
                <div className="h-6 w-20 rounded-pill skeleton-shimmer" />
                <div className="h-6 w-20 rounded-pill skeleton-shimmer" />
              </div>
            </div>
          </div>

          {/* Search & Filter Row Skeleton */}
          <div className="mt-3 space-y-2 shrink-0">
            <div className="flex items-center gap-2">
              <div className="h-11 flex-1 rounded-input skeleton-shimmer" />
              <div className="h-11 w-28 rounded-input skeleton-shimmer" />
              <div className="h-11 w-32 rounded-input skeleton-shimmer" />
            </div>
            <div className="flex items-center gap-1.5 overflow-hidden">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-11 w-20 rounded-pill shrink-0 skeleton-shimmer"
                />
              ))}
            </div>
          </div>

          {/* Pill List Skeletons */}
          <div className="mt-2.5 flex-1 overflow-hidden space-y-2.5 pr-1 pb-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <TitleRowSkeleton key={i} />
            ))}
          </div>
        </div>

        {/* Sticky CTA Skeleton */}
        <div className="pt-3 border-t border-line shrink-0">
          <div className="h-14 w-full rounded-pill skeleton-shimmer" />
        </div>
      </div>
    </div>
  );
}
