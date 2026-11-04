"use client";

export default function WatchlistError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-dvh flex items-center justify-center p-6">
      <div
        role="alert"
        className="w-full max-w-md rounded-card bg-surface shadow-card p-6 border border-line space-y-4 text-center"
      >
        <div className="p-4 rounded-input bg-error-bg text-status-dropped-fg text-sm font-medium">
          Gagal memuat halaman Watchlist: {error.message || "Kesalahan tidak diketahui."}
        </div>
        <button
          type="button"
          onClick={reset}
          className="min-h-11 px-6 rounded-pill bg-cta-gradient text-sm font-semibold text-ink shadow-card cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
        >
          Coba Lagi
        </button>
      </div>
    </div>
  );
}

