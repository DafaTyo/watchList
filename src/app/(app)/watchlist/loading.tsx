export default function WatchlistLoading() {
  return (
    <div className="min-h-dvh lg:h-dvh w-full max-w-[1440px] mx-auto p-3 sm:p-4 lg:p-6 flex flex-col lg:flex-row gap-4 lg:gap-6">
      <div className="w-full lg:w-1/2 lg:flex-1 rounded-panel bg-hero-gradient shadow-hero p-6 flex flex-col justify-between min-h-[260px] md:min-h-[320px] animate-pulse">
        <div className="flex justify-between">
          <div className="w-11 h-11 rounded-icon bg-surface/40" />
          <div className="w-11 h-11 rounded-icon bg-surface/40" />
        </div>
        <div className="w-48 h-64 mx-auto rounded-card bg-surface/40" />
        <div className="flex justify-between gap-4">
          <div className="w-36 h-24 rounded-card bg-surface/60" />
          <div className="w-36 h-24 rounded-card bg-surface/60" />
        </div>
      </div>

      <div className="w-full lg:w-1/2 lg:flex-1 rounded-panel bg-surface shadow-card p-6 flex flex-col justify-between space-y-4">
        <div className="space-y-4">
          <div className="h-8 w-48 rounded-pill bg-surface-soft animate-pulse" />
          <div className="grid grid-cols-2 gap-4 py-3 border-y border-line">
            <div className="h-14 rounded-card bg-surface-soft animate-pulse" />
            <div className="h-14 rounded-card bg-surface-soft animate-pulse" />
          </div>
          <div className="h-11 rounded-input bg-surface-soft animate-pulse" />
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-[72px] rounded-pill bg-surface-soft animate-pulse"
              />
            ))}
          </div>
        </div>
        <div className="h-14 rounded-pill bg-surface-soft animate-pulse" />
      </div>
    </div>
  );
}
