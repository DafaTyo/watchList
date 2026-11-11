export default function DashboardLoading() {
  return (
    <div
      role="status"
      aria-label="Memuat dashboard rekomendasi..."
      className="min-h-dvh w-full max-w-[1440px] mx-auto p-3 sm:p-4 lg:p-6 space-y-5 overflow-x-hidden"
    >
      {/* Top Navbar Skeleton */}
      <div className="rounded-card bg-surface shadow-card border border-line/60 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-icon skeleton-shimmer" />
          <div className="space-y-1.5">
            <div className="h-4 w-32 rounded-pill skeleton-shimmer" />
            <div className="h-3 w-44 rounded-pill skeleton-shimmer" />
          </div>
        </div>
        <div className="h-11 w-56 rounded-pill skeleton-shimmer" />
        <div className="flex items-center gap-2">
          <div className="h-11 w-36 rounded-pill skeleton-shimmer hidden sm:block" />
          <div className="w-11 h-11 rounded-icon skeleton-shimmer" />
        </div>
      </div>

      {/* Hero Banner Skeleton */}
      <div className="rounded-panel bg-hero-gradient shadow-hero p-5 sm:p-8">
        <div className="flex flex-col md:flex-row items-center gap-6 lg:gap-10">
          <div className="w-40 h-60 sm:w-52 sm:h-76 rounded-card skeleton-shimmer-hero shrink-0" />
          <div className="flex-1 space-y-3 w-full">
            <div className="h-6 w-48 rounded-pill skeleton-shimmer-hero" />
            <div className="h-11 w-3/4 max-w-md rounded-card skeleton-shimmer-hero" />
            <div className="flex gap-2">
              <div className="h-6 w-20 rounded-pill skeleton-shimmer-hero" />
              <div className="h-6 w-24 rounded-pill skeleton-shimmer-hero" />
              <div className="h-6 w-20 rounded-pill skeleton-shimmer-hero" />
            </div>
            <div className="h-20 w-full max-w-2xl rounded-card skeleton-shimmer-hero" />
            <div className="flex gap-3 pt-1">
              <div className="h-11 w-44 rounded-pill skeleton-shimmer-hero" />
              <div className="h-11 w-36 rounded-pill skeleton-shimmer-hero" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Grid Skeleton */}
      <div className="rounded-panel bg-surface shadow-card border border-line/60 p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-line">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-11 w-32 rounded-pill skeleton-shimmer"
              />
            ))}
          </div>
          <div className="h-11 w-64 rounded-input skeleton-shimmer" />
        </div>

        <div className="flex gap-2 overflow-hidden">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="h-10 w-24 rounded-pill shrink-0 skeleton-shimmer"
            />
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="rounded-card bg-surface-soft/70 border border-line p-4 flex flex-col gap-3"
            >
              <div className="w-full h-64 rounded-card skeleton-shimmer" />
              <div className="h-5 w-3/4 rounded-pill skeleton-shimmer" />
              <div className="h-4 w-1/2 rounded-pill skeleton-shimmer" />
              <div className="h-10 w-full rounded-pill skeleton-shimmer mt-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

