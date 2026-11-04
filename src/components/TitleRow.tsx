"use client";

import { Link as LinkIcon, Plus, Star } from "lucide-react";
import type { TitleWithLinks } from "@/lib/services/titles";
import type { TitleStatusValue, TitleTypeValue } from "@/lib/validators";
import { PosterImage } from "./PosterImage";
import { STATUS_LABELS, STATUS_STYLES, TYPE_LABELS } from "./StatusBadge";

type TitleRowProps = {
  title: TitleWithLinks;
  selected?: boolean;
  busy?: boolean;
  onSelect: (title: TitleWithLinks) => void;
  onQuickIncrement: (titleId: number) => void;
};

export function TitleRow({
  title,
  selected = false,
  busy = false,
  onSelect,
  onQuickIncrement,
}: TitleRowProps) {
  const status = title.status as TitleStatusValue;
  const type = title.type as TitleTypeValue;
  const isEpisodic = type === "series" || type === "anime";
  const canIncrement =
    isEpisodic &&
    (title.episodeTotal === null || title.episodeCurrent < title.episodeTotal);

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(title);
    }
  }

  return (
    <div className="pt-2.5">
      <div className="flex items-center justify-center mb-0.5">
        <span className="text-[11px] font-medium text-ink-muted leading-none">
          {STATUS_LABELS[status]}
        </span>
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(title)}
        onKeyDown={handleKeyDown}
        aria-label={`${title.name}, status ${STATUS_LABELS[status]}`}
        className={`relative group flex items-center justify-between gap-3 px-3 py-2 min-h-16 sm:min-h-14 rounded-pill bg-surface-soft border transition duration-150 cursor-pointer hover:-translate-y-0.5 hover:shadow-card focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-teal-600 focus-visible:ring-offset-2 ${
          selected ? "border-teal-500 shadow-card bg-surface" : "border-line"
        }`}
      >
        {/* Top-left floating status badge */}
        <span
          className={`absolute -top-2.5 left-4 px-2 py-0.5 rounded-pill text-[10px] font-bold leading-none shadow-xs ${STATUS_STYLES[status]}`}
        >
          {STATUS_LABELS[status]}
        </span>

        {/* Left: poster avatar + title info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <PosterImage
            posterUrl={title.posterUrl}
            name={title.name}
            className="w-10 h-10 rounded-pill shrink-0"
            fallbackTextClassName="text-xs font-bold"
          />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-ink truncate">
              {title.name}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-ink-muted truncate">
              <span>{TYPE_LABELS[type]}</span>
              {title.year && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{title.year}</span>
                </>
              )}
              {title.rating != null && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-0.5 text-ink font-medium">
                    <Star
                      className="w-3 h-3 text-orange-500 fill-orange-500"
                      aria-hidden="true"
                    />
                    {title.rating}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: episode progress, quick +1, link indicator */}
        <div className="flex items-center gap-1.5 shrink-0">
          {title.links.length > 0 && (
            <span
              title={`${title.links.length} link menonton`}
              aria-label={`${title.links.length} link menonton`}
              className="w-7 h-7 rounded-pill bg-surface flex items-center justify-center text-teal-600 border border-line"
            >
              <LinkIcon className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
          )}

          {isEpisodic && (
            <span className="px-2.5 py-1 rounded-pill bg-surface text-xs font-semibold text-ink border border-line tabular-nums">
              {title.episodeCurrent}/{title.episodeTotal ?? "∞"}
            </span>
          )}

          {isEpisodic && canIncrement && (
            <button
              type="button"
              disabled={busy}
              onClick={(e) => {
                e.stopPropagation();
                onQuickIncrement(title.id);
              }}
              aria-label={`Tambah 1 episode untuk ${title.name}`}
              className="min-w-11 min-h-11 px-2.5 rounded-pill bg-ink text-surface text-xs font-semibold inline-flex items-center justify-center gap-0.5 hover:bg-teal-600 disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 transition"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>1</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

