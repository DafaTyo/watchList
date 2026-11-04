import type { TitleStatusValue, TitleTypeValue } from "@/lib/validators";

export const STATUS_LABELS: Record<TitleStatusValue, string> = {
  planned: "Rencana",
  watching: "Menonton",
  completed: "Selesai",
  on_hold: "Ditahan",
  dropped: "Dibuang",
};

export const STATUS_STYLES: Record<TitleStatusValue, string> = {
  completed: "bg-teal-400 text-ink",
  watching: "bg-status-watching-bg text-status-watching-fg",
  planned: "bg-neutral-badge text-ink",
  on_hold: "bg-status-on-hold-bg text-status-on-hold-fg",
  dropped: "bg-status-dropped-bg text-status-dropped-fg",
};

export const TYPE_LABELS: Record<TitleTypeValue, string> = {
  movie: "Film",
  series: "Serial",
  anime: "Anime",
};

type StatusBadgeProps = {
  status: TitleStatusValue;
  size?: "sm" | "md";
  className?: string;
};

export function StatusBadge({
  status,
  size = "sm",
  className = "",
}: StatusBadgeProps) {
  const sizeClass =
    size === "sm"
      ? "px-2.5 py-0.5 text-[11px] font-semibold"
      : "px-3 py-1 text-xs font-semibold";

  return (
    <span
      className={`inline-flex items-center justify-center rounded-pill leading-tight ${STATUS_STYLES[status]} ${sizeClass} ${className}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

