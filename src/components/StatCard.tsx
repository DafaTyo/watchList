import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: number;
  icon: LucideIcon;
  compact?: boolean;
};

export function StatCard({ label, value, icon: Icon, compact = false }: StatCardProps) {
  if (compact) {
    return (
      <div className="bg-stat-card rounded-card shadow-card px-4 py-3 flex items-center justify-between gap-3 flex-1 min-w-0 border border-line/60">
        <div className="min-w-0">
          <div className="text-2xl font-semibold text-ink leading-none transition-opacity duration-150">
            {value}
          </div>
          <div className="text-[11px] font-medium text-ink-muted mt-1 truncate">
            {label}
          </div>
        </div>
        <div className="w-8 h-8 rounded-pill bg-surface-soft flex items-center justify-center shrink-0 text-teal-600">
          <Icon className="w-4 h-4" aria-hidden="true" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-stat-card rounded-card shadow-card p-4 w-36 sm:w-40 flex flex-col justify-between min-h-28 border border-line/60">
      <div className="flex items-start justify-between gap-2">
        <span className="text-3xl sm:text-4xl font-semibold text-ink leading-none transition-opacity duration-150">
          {value}
        </span>
        <span className="w-8 h-8 rounded-pill bg-surface-soft flex items-center justify-center text-teal-600 shrink-0">
          <Icon className="w-4 h-4" aria-hidden="true" />
        </span>
      </div>
      <span className="text-xs font-medium text-ink-muted mt-3 leading-tight">
        {label}
      </span>
    </div>
  );
}

