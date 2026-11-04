"use client";

import { useState } from "react";
import {
  ChevronLeft,
  Minus,
  Pencil,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import type { TitleWithLinks } from "@/lib/services/titles";
import type { TitleStatusValue, TitleTypeValue } from "@/lib/validators";
import { PosterImage } from "./PosterImage";
import { STATUS_LABELS, STATUS_STYLES, TYPE_LABELS } from "./StatusBadge";
import { SafeLinkifiedText } from "./SafeLinkifiedText";
import { LinkList } from "./LinkList";

type DetailPanelProps = {
  title: TitleWithLinks;
  busy: boolean;
  onBack: () => void;
  onEditClick: (title: TitleWithLinks) => void;
  onStatusChange: (
    titleId: number,
    status: TitleStatusValue
  ) => Promise<{ ok: boolean; error?: string }>;
  onIncrementEpisode: (titleId: number) => Promise<{ ok: boolean; error?: string }>;
  onDecrementEpisode: (titleId: number) => Promise<{ ok: boolean; error?: string }>;
  onSaveNotes: (
    titleId: number,
    notes: string | null
  ) => Promise<{ ok: boolean; error?: string }>;
  onDeleteTitle: (titleId: number) => Promise<{ ok: boolean; error?: string }>;
  onAddLink: (
    titleId: number,
    input: { label: string; url: string }
  ) => Promise<{ ok: boolean; error?: string }>;
  onUpdateLink: (
    linkId: number,
    input: { label: string; url: string }
  ) => Promise<{ ok: boolean; error?: string }>;
  onDeleteLink: (linkId: number) => Promise<{ ok: boolean; error?: string }>;
};

export function DetailPanel({
  title,
  busy,
  onBack,
  onEditClick,
  onStatusChange,
  onIncrementEpisode,
  onDecrementEpisode,
  onSaveNotes,
  onDeleteTitle,
  onAddLink,
  onUpdateLink,
  onDeleteLink,
}: DetailPanelProps) {
  const status = title.status as TitleStatusValue;
  const type = title.type as TitleTypeValue;
  const isEpisodic = type === "series" || type === "anime";

  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState(title.notes ?? "");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canIncrement =
    isEpisodic &&
    (title.episodeTotal === null || title.episodeCurrent < title.episodeTotal);
  const canDecrement = isEpisodic && title.episodeCurrent > 0;

  async function handleStatusSelect(newStatus: TitleStatusValue) {
    setError(null);
    const res = await onStatusChange(title.id, newStatus);
    if (!res.ok) {
      setError(res.error || "Gagal mengubah status.");
    }
  }

  async function handlePlusOne() {
    setError(null);
    const res = await onIncrementEpisode(title.id);
    if (!res.ok) {
      setError(res.error || "Gagal menambah episode.");
    }
  }

  async function handleMinusOne() {
    setError(null);
    const res = await onDecrementEpisode(title.id);
    if (!res.ok) {
      setError(res.error || "Gagal mengurangi episode.");
    }
  }

  async function handleNotesSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await onSaveNotes(title.id, notesDraft.trim() ? notesDraft : null);
    if (!res.ok) {
      setError(res.error || "Gagal menyimpan catatan.");
      return;
    }
    setEditingNotes(false);
  }

  async function handleConfirmDelete() {
    setError(null);
    const res = await onDeleteTitle(title.id);
    if (!res.ok) {
      setError(res.error || "Gagal menghapus judul.");
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-2 pb-4 border-b border-line shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="min-h-11 px-3.5 rounded-pill bg-surface-soft hover:bg-line/70 text-sm font-semibold text-ink inline-flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 transition"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          <span>Kembali ke Daftar</span>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onEditClick(title)}
            aria-label={`Ubah detail ${title.name}`}
            className="min-h-11 px-3.5 rounded-pill bg-surface-soft hover:bg-line/70 text-xs font-semibold text-ink inline-flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 transition"
          >
            <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Ubah</span>
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDelete((v) => !v)}
            aria-label={`Hapus ${title.name}`}
            className="w-11 h-11 rounded-pill bg-surface-soft hover:bg-error-bg text-red-500 inline-flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 transition"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
        {error && (
          <div
            role="alert"
            className="p-3.5 rounded-input bg-error-bg text-status-dropped-fg text-xs font-medium"
          >
            {error}
          </div>
        )}

        {confirmingDelete && (
          <div
            role="alert"
            className="p-4 rounded-card bg-error-bg border border-red-500/30 space-y-3"
          >
            <p className="text-sm text-ink font-medium">
              Hapus <strong className="font-bold">&ldquo;{title.name}&rdquo;</strong> beserta{" "}
              <strong className="font-bold">{title.links.length} link</strong> tempat menontonnya?
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={handleConfirmDelete}
                className="min-h-11 px-4 rounded-pill bg-red-500 text-surface text-xs font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
              >
                {busy ? "Menghapus..." : "Ya, Hapus Permanen"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmingDelete(false)}
                className="min-h-11 px-4 rounded-pill bg-surface border border-line text-ink text-xs font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {/* Title summary card */}
        <div className="flex items-start gap-4">
          <PosterImage
            posterUrl={title.posterUrl}
            name={title.name}
            className="w-20 h-28 rounded-card shrink-0 shadow-card"
            fallbackTextClassName="text-lg font-bold"
          />
          <div className="min-w-0 flex-1 space-y-2">
            <span
              className={`inline-flex px-2.5 py-0.5 rounded-pill text-xs font-semibold ${STATUS_STYLES[status]}`}
            >
              {STATUS_LABELS[status]}
            </span>
            <h2 className="text-lg font-bold text-ink leading-snug break-words">
              {title.name}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
              <span className="font-medium text-ink">{TYPE_LABELS[type]}</span>
              {title.year && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{title.year}</span>
                </>
              )}
              {title.rating != null && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-ink">
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

        {/* Status selector pills */}
        <div>
          <span className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-2">
            Status Tontonan
          </span>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(STATUS_LABELS) as TitleStatusValue[]).map((s) => {
              const active = s === status;
              return (
                <button
                  key={s}
                  type="button"
                  disabled={busy}
                  onClick={() => handleStatusSelect(s)}
                  className={`min-h-11 px-3.5 rounded-pill text-xs font-semibold transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                    active
                      ? `${STATUS_STYLES[s]} ring-2 ring-ink`
                      : "bg-surface-soft text-ink-muted hover:text-ink"
                  }`}
                >
                  {STATUS_LABELS[s]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Episode progress controls (only for series/anime) */}
        {isEpisodic && (
          <div className="p-4 rounded-card bg-surface-soft border border-line flex items-center justify-between gap-3">
            <div>
              <span className="block text-xs font-medium text-ink-muted">
                Progres Episode
              </span>
              <span className="text-2xl font-bold text-ink tabular-nums">
                {title.episodeCurrent}{" "}
                <span className="text-sm font-normal text-ink-muted">
                  / {title.episodeTotal ?? "∞"} ep
                </span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={busy || !canDecrement}
                onClick={handleMinusOne}
                aria-label="Kurangi 1 episode"
                className="w-11 h-11 rounded-pill bg-surface border border-line text-ink inline-flex items-center justify-center hover:bg-line/50 disabled:opacity-40 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 transition"
              >
                <Minus className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                disabled={busy || !canIncrement}
                onClick={handlePlusOne}
                aria-label="Tambah 1 episode"
                className="min-h-11 px-4 rounded-pill bg-cta-gradient text-ink font-semibold text-sm inline-flex items-center gap-1 shadow-card disabled:opacity-40 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 transition"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>1 Ep</span>
              </button>
            </div>
          </div>
        )}

        {/* Notes section with safe linkify */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Catatan Pribadi
            </h3>
            {!editingNotes && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setNotesDraft(title.notes ?? "");
                  setEditingNotes(true);
                }}
                className="min-h-11 px-3 rounded-pill bg-surface-soft hover:bg-line/60 text-xs font-semibold text-ink inline-flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 transition"
              >
                <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{title.notes ? "Ubah Catatan" : "Tambah Catatan"}</span>
              </button>
            )}
          </div>

          {editingNotes ? (
            <form onSubmit={handleNotesSubmit} className="space-y-2">
              <label htmlFor="detail-notes-input" className="sr-only">
                Catatan Pribadi
              </label>
              <textarea
                id="detail-notes-input"
                rows={4}
                maxLength={2000}
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                placeholder="Tulis catatan atau tempelkan URL..."
                className="w-full p-3.5 rounded-input bg-surface-soft text-sm text-ink border border-line focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setEditingNotes(false)}
                  className="min-h-11 px-4 rounded-pill bg-surface border border-line text-xs font-medium text-ink cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="min-h-11 px-4 rounded-pill bg-cta-gradient text-xs font-semibold text-ink cursor-pointer"
                >
                  Simpan Catatan
                </button>
              </div>
            </form>
          ) : title.notes ? (
            <div className="p-3.5 rounded-card bg-surface-soft border border-line text-sm text-ink">
              <SafeLinkifiedText text={title.notes} />
            </div>
          ) : (
            <p className="text-xs text-ink-muted py-1">
              Belum ada catatan untuk judul ini.
            </p>
          )}
        </div>

        {/* Watch links CRUD */}
        <div className="pt-2 border-t border-line">
          <LinkList
            links={title.links}
            onAddLink={(inp) => onAddLink(title.id, inp)}
            onUpdateLink={onUpdateLink}
            onDeleteLink={onDeleteLink}
            disabled={busy}
          />
        </div>
      </div>
    </div>
  );
}

