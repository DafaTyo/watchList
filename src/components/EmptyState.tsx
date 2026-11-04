import { Film, Plus } from "lucide-react";

type EmptyStateProps = {
  hasAnyTitles: boolean;
  onAddClick: () => void;
  onResetFilters?: () => void;
};

export function EmptyState({
  hasAnyTitles,
  onAddClick,
  onResetFilters,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-8 px-4 rounded-card bg-surface-soft/70 border border-dashed border-line">
      <div className="w-12 h-12 rounded-pill bg-surface shadow-card flex items-center justify-center text-teal-600 mb-3">
        <Film className="w-6 h-6" aria-hidden="true" />
      </div>
      {hasAnyTitles ? (
        <>
          <h2 className="text-base font-semibold text-ink">
            Tidak ada judul yang cocok
          </h2>
          <p className="text-sm text-ink-muted mt-1 max-w-xs">
            Coba ubah kata kunci pencarian atau filter status/tipe, atau tambahkan judul baru.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
            {onResetFilters && (
              <button
                type="button"
                onClick={onResetFilters}
                className="min-h-11 px-4 rounded-pill bg-surface border border-line text-sm font-medium text-ink hover:bg-surface-soft cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 transition"
              >
                Reset Filter
              </button>
            )}
            <button
              type="button"
              onClick={onAddClick}
              className="min-h-11 px-4 rounded-pill bg-cta-gradient text-sm font-semibold text-ink inline-flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 transition"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Tambah Judul</span>
            </button>
          </div>
        </>
      ) : (
        <>
          <h2 className="text-base font-semibold text-ink">
            Watchlist Anda masih kosong
          </h2>
          <p className="text-sm text-ink-muted mt-1 max-w-xs">
            Mulai catat film, serial, atau anime yang ingin dan sedang Anda tonton beserta link tempat menontonnya.
          </p>
          <button
            type="button"
            onClick={onAddClick}
            className="mt-4 min-h-11 px-5 rounded-pill bg-cta-gradient text-sm font-semibold text-ink inline-flex items-center gap-2 shadow-card cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 transition"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Tambah Judul Pertama</span>
          </button>
        </>
      )}
    </div>
  );
}

