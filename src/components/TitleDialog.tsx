"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import type { TitleWithLinks } from "@/lib/services/titles";
import type { TitleInput, TitleStatusValue, TitleTypeValue } from "@/lib/validators";
import { MAX_LINKS_PER_TITLE } from "@/lib/services/links";
import { STATUS_LABELS, TYPE_LABELS } from "./StatusBadge";
import { LinkList, type DraftLink } from "./LinkList";

type TitleDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  initialTitle?: TitleWithLinks | null;
  onClose: () => void;
  onSaveCreate: (
    input: TitleInput,
    draftLinks: DraftLink[]
  ) => Promise<{ ok: boolean; error?: string; field?: string }>;
  onSaveEdit: (
    titleId: number,
    input: TitleInput
  ) => Promise<{ ok: boolean; error?: string; field?: string }>;
  onDeleteTitle?: (titleId: number) => Promise<{ ok: boolean; error?: string }>;
  onAddLink?: (
    titleId: number,
    input: { label: string; url: string }
  ) => Promise<{ ok: boolean; error?: string }>;
  onUpdateLink?: (
    linkId: number,
    input: { label: string; url: string }
  ) => Promise<{ ok: boolean; error?: string }>;
  onDeleteLink?: (linkId: number) => Promise<{ ok: boolean; error?: string }>;
};

export function TitleDialog({
  open,
  mode,
  initialTitle,
  onClose,
  onSaveCreate,
  onSaveEdit,
  onDeleteTitle,
  onAddLink,
  onUpdateLink,
  onDeleteLink,
}: TitleDialogProps) {
  const titleIdAttr = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(initialTitle?.name ?? "");
  const [type, setType] = useState<TitleTypeValue>(
    (initialTitle?.type as TitleTypeValue) ?? "series"
  );
  const [status, setStatus] = useState<TitleStatusValue>(
    (initialTitle?.status as TitleStatusValue) ?? "planned"
  );
  const [year, setYear] = useState(
    initialTitle?.year != null ? String(initialTitle.year) : ""
  );
  const [rating, setRating] = useState(
    initialTitle?.rating != null ? String(initialTitle.rating) : ""
  );
  const [posterUrl, setPosterUrl] = useState(initialTitle?.posterUrl ?? "");
  const [episodeCurrent, setEpisodeCurrent] = useState(
    initialTitle?.episodeCurrent != null ? String(initialTitle.episodeCurrent) : "0"
  );
  const [episodeTotal, setEpisodeTotal] = useState(
    initialTitle?.episodeTotal != null ? String(initialTitle.episodeTotal) : ""
  );
  const [notes, setNotes] = useState(initialTitle?.notes ?? "");

  // Draft links for "create" mode
  const [draftLinks, setDraftLinks] = useState<DraftLink[]>([]);
  const [draftLabel, setDraftLabel] = useState("");
  const [draftUrl, setDraftUrl] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previousActive = document.activeElement as HTMLElement | null;
    const timer = window.setTimeout(() => {
      firstInputRef.current?.focus();
    }, 30);

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown);
      previousActive?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const isEpisodic = type === "series" || type === "anime";

  function addDraftLink() {
    setError(null);
    const lbl = draftLabel.trim();
    const u = draftUrl.trim();
    if (!lbl || !u) {
      setError("Label dan URL link wajib diisi.");
      return;
    }
    if (lbl.length > 40) {
      setError("Label link maksimal 40 karakter.");
      return;
    }
    try {
      const parsed = new URL(u);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        setError("URL link wajib memakai skema http:// atau https://");
        return;
      }
    } catch {
      setError("URL link tidak valid.");
      return;
    }
    if (draftLinks.length >= MAX_LINKS_PER_TITLE) {
      setError(`Maksimal ${MAX_LINKS_PER_TITLE} link per judul.`);
      return;
    }
    setDraftLinks((prev) => [...prev, { label: lbl, url: u }]);
    setDraftLabel("");
    setDraftUrl("");
  }

  function removeDraftLink(idx: number) {
    setDraftLinks((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldError(undefined);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Judul wajib diisi.");
      setFieldError("name");
      return;
    }

    const parsedYear = year.trim() ? Number(year.trim()) : null;
    if (parsedYear != null && (!Number.isInteger(parsedYear) || parsedYear < 1888 || parsedYear > 2100)) {
      setError("Tahun harus antara 1888 dan 2100.");
      setFieldError("year");
      return;
    }

    const parsedRating = rating.trim() ? Number(rating.trim()) : null;
    if (parsedRating != null && (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 10)) {
      setError("Rating harus berupa angka 1 hingga 10.");
      setFieldError("rating");
      return;
    }

    const parsedCurrent = isEpisodic
      ? episodeCurrent.trim()
        ? Number(episodeCurrent.trim())
        : 0
      : 0;
    const parsedTotal =
      isEpisodic && episodeTotal.trim() ? Number(episodeTotal.trim()) : null;

    if (isEpisodic && (!Number.isInteger(parsedCurrent) || parsedCurrent < 0)) {
      setError("Episode saat ini minimal 0.");
      setFieldError("episodeCurrent");
      return;
    }

    if (isEpisodic && parsedTotal != null && (!Number.isInteger(parsedTotal) || parsedTotal < 1)) {
      setError("Total episode minimal 1.");
      setFieldError("episodeTotal");
      return;
    }

    if (isEpisodic && parsedTotal != null && parsedCurrent > parsedTotal) {
      setError("Total episode tidak boleh lebih kecil dari progres episode saat ini.");
      setFieldError("episodeTotal");
      return;
    }

    // If user typed a draft link in create mode without clicking +Tambah, include it if valid
    const finalDraftLinks = [...draftLinks];
    if (mode === "create" && (draftLabel.trim() || draftUrl.trim())) {
      const lbl = draftLabel.trim();
      const u = draftUrl.trim();
      if (!lbl || !u) {
        setError("Lengkapi label dan URL link yang sedang diketik, atau kosongkan keduanya.");
        return;
      }
      try {
        const parsed = new URL(u);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          setError("URL link wajib memakai skema http:// atau https://");
          return;
        }
      } catch {
        setError("URL link wajib memakai skema http:// atau https://");
        return;
      }
      if (finalDraftLinks.length >= MAX_LINKS_PER_TITLE) {
        setError(`Maksimal ${MAX_LINKS_PER_TITLE} link per judul.`);
        return;
      }
      finalDraftLinks.push({ label: lbl, url: u });
    }

    const payload: TitleInput = {
      name: trimmedName,
      type,
      status,
      year: parsedYear,
      rating: parsedRating,
      posterUrl: posterUrl.trim() || null,
      episodeCurrent: isEpisodic ? parsedCurrent : 0,
      episodeTotal: isEpisodic ? parsedTotal : null,
      notes: notes.trim() ? notes : null,
    };

    setSaving(true);
    if (mode === "create") {
      const res = await onSaveCreate(payload, finalDraftLinks);
      setSaving(false);
      if (!res.ok) {
        setError(res.error || "Gagal menyimpan judul.");
        setFieldError(res.field);
        return;
      }
      onClose();
    } else if (initialTitle) {
      const res = await onSaveEdit(initialTitle.id, payload);
      setSaving(false);
      if (!res.ok) {
        setError(res.error || "Gagal memperbarui judul.");
        setFieldError(res.field);
        return;
      }
      onClose();
    }
  }

  async function handleConfirmDelete() {
    if (!initialTitle || !onDeleteTitle) return;
    setSaving(true);
    const res = await onDeleteTitle(initialTitle.id);
    setSaving(false);
    if (!res.ok) {
      setError(res.error || "Gagal menghapus judul.");
      return;
    }
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-ink/50 backdrop-blur-xs p-0 md:p-4 animate-backdrop-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleIdAttr}
        className="w-full md:max-w-[520px] max-h-[92dvh] bg-surface rounded-t-sheet md:rounded-card shadow-hero flex flex-col overflow-hidden border border-line animate-dialog-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line shrink-0">
          <h2 id={titleIdAttr} className="text-lg font-bold text-ink">
            {mode === "create" ? "Tambah Judul Baru" : "Ubah Judul"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog"
            className="w-11 h-11 rounded-pill bg-surface-soft hover:bg-line/60 flex items-center justify-center text-ink cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 transition"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div
              id="title-dialog-error"
              role="alert"
              className="p-3.5 rounded-input bg-error-bg text-status-dropped-fg text-sm font-medium border border-red-500/20"
            >
              {error}
            </div>
          )}

          <form id="title-dialog-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label
                htmlFor="title-name"
                className="block text-sm font-medium text-ink mb-1.5"
              >
                Judul Tontonan <span className="text-red-500">*</span>
              </label>
              <input
                ref={firstInputRef}
                id="title-name"
                name="name"
                type="text"
                required
                maxLength={200}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mis. Spirited Away, Attack on Titan"
                aria-invalid={fieldError === "name"}
                aria-describedby={error ? "title-dialog-error" : undefined}
                className="w-full h-12 px-4 rounded-input bg-surface-soft text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="title-type"
                  className="block text-sm font-medium text-ink mb-1.5"
                >
                  Tipe
                </label>
                <select
                  id="title-type"
                  name="type"
                  value={type}
                  onChange={(e) => setType(e.target.value as TitleTypeValue)}
                  className="w-full h-12 px-4 rounded-input bg-surface-soft text-sm text-ink focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  {(Object.keys(TYPE_LABELS) as TitleTypeValue[]).map((t) => (
                    <option key={t} value={t}>
                      {TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="title-status"
                  className="block text-sm font-medium text-ink mb-1.5"
                >
                  Status
                </label>
                <select
                  id="title-status"
                  name="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TitleStatusValue)}
                  className="w-full h-12 px-4 rounded-input bg-surface-soft text-sm text-ink focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  {(Object.keys(STATUS_LABELS) as TitleStatusValue[]).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="title-year"
                  className="block text-sm font-medium text-ink mb-1.5"
                >
                  Tahun Rilis
                </label>
                <input
                  id="title-year"
                  name="year"
                  type="number"
                  min={1888}
                  max={2100}
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="2026"
                  aria-invalid={fieldError === "year"}
                  aria-describedby={error ? "title-dialog-error" : undefined}
                  className="w-full h-12 px-4 rounded-input bg-surface-soft text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div>
                <label
                  htmlFor="title-rating"
                  className="block text-sm font-medium text-ink mb-1.5"
                >
                  Rating (1–10)
                </label>
                <input
                  id="title-rating"
                  name="rating"
                  type="number"
                  min={1}
                  max={10}
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  placeholder="Opsional"
                  aria-invalid={fieldError === "rating"}
                  aria-describedby={error ? "title-dialog-error" : undefined}
                  className="w-full h-12 px-4 rounded-input bg-surface-soft text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
            </div>

            {isEpisodic && (
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-card bg-surface-soft/60 border border-line">
                <div>
                  <label
                    htmlFor="title-ep-current"
                    className="block text-xs font-semibold text-ink mb-1"
                  >
                    Episode Ditonton
                  </label>
                  <input
                    id="title-ep-current"
                    name="episodeCurrent"
                    type="number"
                    min={0}
                    value={episodeCurrent}
                    onChange={(e) => setEpisodeCurrent(e.target.value)}
                    aria-invalid={fieldError === "episodeCurrent"}
                    aria-describedby={error ? "title-dialog-error" : undefined}
                    className="w-full h-11 px-3 rounded-input bg-surface text-sm text-ink border border-line focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
                <div>
                  <label
                    htmlFor="title-ep-total"
                    className="block text-xs font-semibold text-ink mb-1"
                  >
                    Total Episode
                  </label>
                  <input
                    id="title-ep-total"
                    name="episodeTotal"
                    type="number"
                    min={1}
                    value={episodeTotal}
                    onChange={(e) => setEpisodeTotal(e.target.value)}
                    placeholder="Kosong = belum tahu"
                    aria-invalid={fieldError === "episodeTotal"}
                    aria-describedby={error ? "title-dialog-error" : undefined}
                    className="w-full h-11 px-3 rounded-input bg-surface text-sm text-ink border border-line placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="title-poster"
                className="block text-sm font-medium text-ink mb-1.5"
              >
                URL Poster (wajib https://)
              </label>
              <input
                id="title-poster"
                name="posterUrl"
                type="url"
                maxLength={2048}
                value={posterUrl}
                onChange={(e) => setPosterUrl(e.target.value)}
                placeholder="https://..."
                aria-invalid={fieldError === "posterUrl"}
                aria-describedby={error ? "title-dialog-error" : undefined}
                className="w-full h-12 px-4 rounded-input bg-surface-soft text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <div>
              <label
                htmlFor="title-notes"
                className="block text-sm font-medium text-ink mb-1.5"
              >
                Catatan (maks 2.000 karakter)
              </label>
              <textarea
                id="title-notes"
                name="notes"
                rows={3}
                maxLength={2000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Tulis kesan, pengingat jam tayang, atau URL referensi..."
                aria-invalid={fieldError === "notes"}
                aria-describedby={error ? "title-dialog-error" : undefined}
                className="w-full p-3.5 rounded-input bg-surface-soft text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
          </form>

          {/* Links section */}
          <div className="pt-2 border-t border-line">
            {mode === "create" ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    Link Tempat Menonton ({draftLinks.length}/{MAX_LINKS_PER_TITLE})
                  </span>
                </div>

                {draftLinks.length > 0 && (
                  <ul className="space-y-1.5">
                    {draftLinks.map((dl, idx) => (
                      <li
                        key={idx}
                        className="flex items-center justify-between gap-2 pl-3.5 pr-1.5 py-1 rounded-pill bg-surface-soft border border-line text-xs"
                      >
                        <div className="min-w-0 flex-1 truncate">
                          <span className="font-semibold text-ink">{dl.label}</span>{" "}
                          <span className="text-ink-muted">({dl.url})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeDraftLink(idx)}
                          aria-label={`Hapus link ${dl.label}`}
                          className="w-11 h-11 rounded-pill inline-flex items-center justify-center text-red-500 hover:bg-error-bg cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {draftLinks.length < MAX_LINKS_PER_TITLE && (
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end bg-surface-soft/60 p-3 rounded-card border border-line">
                    <div className="sm:col-span-4">
                      <label
                        htmlFor="draft-link-label"
                        className="block text-xs font-medium text-ink mb-1"
                      >
                        Label
                      </label>
                      <input
                        id="draft-link-label"
                        type="text"
                        maxLength={40}
                        placeholder="Netflix"
                        value={draftLabel}
                        onChange={(e) => setDraftLabel(e.target.value)}
                        className="w-full h-11 px-3 rounded-input bg-surface text-xs text-ink border border-line focus:outline-none focus:ring-2 focus:ring-teal-600"
                      />
                    </div>
                    <div className="sm:col-span-6">
                      <label
                        htmlFor="draft-link-url"
                        className="block text-xs font-medium text-ink mb-1"
                      >
                        URL (http/https)
                      </label>
                      <input
                        id="draft-link-url"
                        type="url"
                        maxLength={2048}
                        placeholder="https://..."
                        value={draftUrl}
                        onChange={(e) => setDraftUrl(e.target.value)}
                        className="w-full h-11 px-3 rounded-input bg-surface text-xs text-ink border border-line focus:outline-none focus:ring-2 focus:ring-teal-600"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <button
                        type="button"
                        onClick={addDraftLink}
                        aria-label="Tambah link ke daftar"
                        className="w-full h-11 rounded-pill bg-ink text-surface text-xs font-semibold flex items-center justify-center gap-1 hover:bg-teal-600 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 transition"
                      >
                        <Plus className="w-4 h-4" aria-hidden="true" />
                        <span className="sm:hidden">Tambah Link</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              initialTitle &&
              onAddLink &&
              onUpdateLink &&
              onDeleteLink && (
                <LinkList
                  links={initialTitle.links}
                  onAddLink={(inp) => onAddLink(initialTitle.id, inp)}
                  onUpdateLink={onUpdateLink}
                  onDeleteLink={onDeleteLink}
                  disabled={saving}
                />
              )
            )}
          </div>

          {/* Delete confirmation box in edit mode */}
          {mode === "edit" && initialTitle && onDeleteTitle && (
            <div className="pt-3 border-t border-line">
              {!confirmingDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  className="min-h-11 px-4 rounded-pill text-sm font-semibold text-red-500 hover:bg-error-bg inline-flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 transition"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                  <span>Hapus Judul Ini</span>
                </button>
              ) : (
                <div
                  role="alert"
                  className="p-4 rounded-card bg-error-bg border border-red-500/30 space-y-3"
                >
                  <p className="text-sm text-ink font-medium">
                    Yakin ingin menghapus{" "}
                    <strong className="font-bold">&ldquo;{initialTitle.name}&rdquo;</strong> beserta{" "}
                    <strong className="font-bold">{initialTitle.links.length} link</strong> terkait secara permanen?
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={handleConfirmDelete}
                      className="min-h-11 px-4 rounded-pill bg-red-500 text-surface text-xs font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                    >
                      {saving ? "Menghapus..." : "Ya, Hapus Permanen"}
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => setConfirmingDelete(false)}
                      className="min-h-11 px-4 rounded-pill bg-surface border border-line text-ink text-xs font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-line bg-surface flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="min-h-12 px-5 rounded-pill bg-surface-soft hover:bg-line/70 text-sm font-semibold text-ink cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 transition"
          >
            Batal
          </button>
          <button
            type="submit"
            form="title-dialog-form"
            disabled={saving}
            className="min-h-12 px-6 rounded-pill bg-cta-gradient text-sm font-semibold text-ink shadow-card hover:opacity-95 disabled:opacity-60 cursor-pointer focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-teal-600 focus-visible:ring-offset-2 transition"
          >
            {saving
              ? "Menyimpan..."
              : mode === "create"
                ? "Simpan Judul"
                : "Simpan Perubahan"}
          </button>
        </div>
      </div>
    </div>
  );
}

