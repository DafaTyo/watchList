"use client";

import { Link as LinkIcon, Loader2, Plus, Star } from "lucide-react";
import type { TitleWithLinks } from "@/lib/services/titles";
import type { TitleStatusValue, TitleTypeValue } from "@/lib/validators";
import { PosterImage } from "./PosterImage";
import { STATUS_LABELS, STATUS_STYLES, TYPE_LABELS } from "./StatusBadge";

type TitleRowProps = {
  title: TitleWithLinks;
  index?: number;
  selected?: boolean;
  busy?: boolean;
  isMutating?: boolean;
  onSelect: (title: TitleWithLinks) => void;
  onQuickIncrement: (titleId: number) => void;
};

export function TitleRow({
  title,
  index = 0,
  selected = false,
  busy = false,
  isMutating = false,
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
    <div
      className="pt-2 animate-row-in"
      style={{ animationDelay: `${Math.min(index * 22, 220)}ms` }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(title)}
        onKeyDown={handleKeyDown}
        aria-label={`${title.name}, status ${STATUS_LABELS[status]}`}
        className={`relative group flex items-center justify-between gap-3.5 px-4 py-3 min-h-[72px] rounded-pill bg-surface-soft border transition-all duration-200 ease-out cursor-pointer hover:-translate-y-0.5 hover:shadow-card hover:bg-surface active:scale-[0.995] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-teal-600 focus-visible:ring-offset-2 ${
          selected
            ? "border-teal-500 shadow-card bg-surface"
            : "border-line"
        }`}
      >
        {/* Top-left floating status badge */}
        <span
          className={`absolute -top-2.5 left-5 px-2.5 py-0.5 rounded-pill text-[11px] font-bold leading-none shadow-xs transition-colors duration-200 ${STATUS_STYLES[status]}`}
        >
          {STATUS_LABELS[status]}
        </span>

        {/* Left: poster avatar + title info */}
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <PosterImage
            posterUrl={title.posterUrl}
            name={title.name}
            className="w-12 h-12 rounded-pill shrink-0 shadow-xs transition-transform duration-200 group-hover:scale-105"
            fallbackTextClassName="text-sm font-bold"
          />
          <div className="min-w-0 flex-1">
            <div className="text-[15px] sm:text-base font-bold text-ink truncate leading-snug group-hover:text-teal-600 transition-colors duration-150">
              {title.name}
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-[13px] text-ink-muted truncate mt-0.5">
              <span className="font-medium text-ink/80">{TYPE_LABELS[type]}</span>
              {title.year && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{title.year}</span>
                </>
              )}
              {title.rating != null && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-0.5 text-ink font-semibold">
                    <Star
                      className="w-3.5 h-3.5 text-orange-500 fill-orange-500"
                      aria-hidden="true"
                    />
                    {title.rating}/10
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: episode progress, quick +1, link indicator */}
        <div className="flex items-center gap-2 shrink-0">
          {title.links.length > 0 && (
            <span
              title={`${title.links.length} link menonton`}
              aria-label={`${title.links.length} link menonton`}
              className="w-8 h-8 rounded-pill bg-surface flex items-center justify-center text-teal-600 border border-line transition-transform duration-150 group-hover:scale-105"
            >
              <LinkIcon className="w-4 h-4" aria-hidden="true" />
            </span>
          )}

          {isEpisodic && (
            <span
              className={`px-3 py-1.5 rounded-pill bg-surface text-xs sm:text-[13px] font-bold text-ink border border-line tabular-nums transition-all duration-200 ${
                isMutating ? "skeleton-shimmer" : ""
              }`}
            >
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
              className="min-w-11 min-h-11 px-3 rounded-pill bg-ink text-surface text-xs font-bold inline-flex items-center justify-center gap-0.5 hover:bg-teal-600 active:scale-95 disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 transition-all duration-150"
            >
              {isMutating ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>1</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
