"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  Check,
  Image as ImageIcon,
  Loader2,
  Plus,
  Sparkles,
  Star,
  Trash2,
  X,
} from "lucide-react";
import type { TitleWithLinks } from "@/lib/services/titles";
import type { TitleInput, TitleStatusValue, TitleTypeValue } from "@/lib/validators";
import type { TmdbMediaItem } from "@/lib/tmdb";
import { getTmdbDetailsAction, searchTmdbAction } from "@/actions/tmdb";
import { MAX_LINKS_PER_TITLE } from "@/lib/services/links";
import { STATUS_LABELS, TYPE_LABELS } from "./StatusBadge";
import { PosterImage } from "./PosterImage";
import { LinkList, type DraftLink } from "./LinkList";

export type TitlePrefill = {
  name?: string;
  type?: TitleTypeValue;
  status?: TitleStatusValue;
  year?: number | null;
  rating?: number | null;
  posterUrl?: string | null;
  episodeTotal?: number | null;
  notes?: string | null;
};

type TitleDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  initialTitle?: TitleWithLinks | null;
  prefill?: TitlePrefill | null;
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
  prefill,
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
  const suggestionBoxRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState(
    initialTitle?.name ?? prefill?.name ?? ""
  );
  const [type, setType] = useState<TitleTypeValue>(
    (initialTitle?.type as TitleTypeValue) ?? prefill?.type ?? "movie"
  );
  const [status, setStatus] = useState<TitleStatusValue>(
    (initialTitle?.status as TitleStatusValue) ?? prefill?.status ?? "planned"
  );
  const [year, setYear] = useState(
    initialTitle?.year != null
      ? String(initialTitle.year)
      : prefill?.year != null
        ? String(prefill.year)
        : ""
  );
  const [rating, setRating] = useState(
    initialTitle?.rating != null
      ? String(initialTitle.rating)
      : prefill?.rating != null
        ? String(prefill.rating)
        : ""
  );
  const [posterUrl, setPosterUrl] = useState(
    initialTitle?.posterUrl ?? prefill?.posterUrl ?? ""
  );
  const [episodeCurrent, setEpisodeCurrent] = useState(
    initialTitle?.episodeCurrent != null
      ? String(initialTitle.episodeCurrent)
      : "0"
  );
  const [episodeTotal, setEpisodeTotal] = useState(
    initialTitle?.episodeTotal != null
      ? String(initialTitle.episodeTotal)
      : prefill?.episodeTotal != null
        ? String(prefill.episodeTotal)
        : ""
  );
  const [notes, setNotes] = useState(
    initialTitle?.notes ?? prefill?.notes ?? ""
  );

  // TMDB Autocomplete Suggestion state
  const [suggestions, setSuggestions] = useState<TmdbMediaItem[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const [selectedTmdbItem, setSelectedTmdbItem] =
    useState<TmdbMediaItem | null>(null);
  const [showManualPosterInput, setShowManualPosterInput] = useState(false);
  const skipNextSearchRef = useRef(Boolean(prefill?.name || initialTitle?.name));

  // Draft links for "create" mode
  const [draftLinks, setDraftLinks] = useState<DraftLink[]>([]);
  const [draftLabel, setDraftLabel] = useState("");
  const [draftUrl, setDraftUrl] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Debounced TMDB autocomplete search when typing title
  useEffect(() => {
    if (!open) return;
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      return;
    }

    const q = name.trim();
    if (q.length < 1) {
      return;
    }

    let cancelled = false;

    const timer = window.setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const data = await searchTmdbAction(q);
        if (cancelled) return;
        const list = data.items ?? [];
        setSuggestions(list);
        setHighlightedIdx(list.length > 0 ? 0 : -1);

        // Automatically attach cover from top TMDB match if cover is still empty
        if (list[0]?.posterUrl) {
          setPosterUrl((prev) => prev.trim() || list[0].posterUrl || "");
        }
      } catch {
        // Ignore errors
      } finally {
        if (!cancelled) {
          setLoadingSuggestions(false);
        }
      }
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [name, open]);

  // Focus first input only once when dialog opens
  useEffect(() => {
    if (!open) return;
    const previousActive = document.activeElement as HTMLElement | null;
    const timer = window.setTimeout(() => {
      firstInputRef.current?.focus();
    }, 30);

    return () => {
      window.clearTimeout(timer);
      previousActive?.focus?.();
    };
  }, [open]);

  // Close suggestions when clicking outside the title/suggestion box
  useEffect(() => {
    if (!open || !showSuggestions) return;
    function handlePointerDown(e: MouseEvent) {
      if (
        suggestionBoxRef.current &&
        !suggestionBoxRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open, showSuggestions]);

  // Escape & Focus Trap
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        if (showSuggestions) {
          setShowSuggestions(false);
          return;
        }
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
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose, showSuggestions]);

  if (!open) return null;

  const isEpisodic = type === "series" || type === "anime";

  async function applyTmdbSuggestion(item: TmdbMediaItem) {
    skipNextSearchRef.current = true;
    setShowSuggestions(false);
    setLoadingSuggestions(false);
    setSuggestions([]);
    setSelectedTmdbItem(item);
    setName(item.title);
    setType(item.appType);
    if (item.year != null) {
      setYear(String(item.year));
    }
    if (item.rating != null) {
      setRating(String(item.rating));
    }
    if (item.posterUrl) {
      setPosterUrl(item.posterUrl);
    }
    if (item.episodeTotal != null) {
      setEpisodeTotal(String(item.episodeTotal));
    }

    // If TV/Anime and episodeTotal isn't in search result yet, fetch details in background
    if (item.mediaType === "tv" && item.episodeTotal == null) {
      try {
        const detailed = await getTmdbDetailsAction("tv", item.tmdbId);
        if (detailed?.episodeTotal != null) {
          setEpisodeTotal(String(detailed.episodeTotal));
        }
      } catch {
        // ignore
      }
    }
  }

  function handleNameInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIdx((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIdx(
        (prev) => (prev - 1 + suggestions.length) % suggestions.length
      );
    } else if (e.key === "Enter" && highlightedIdx >= 0) {
      const chosen = suggestions[highlightedIdx];
      if (chosen) {
        e.preventDefault();
        void applyTmdbSuggestion(chosen);
      }
    }
  }

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
    if (
      parsedYear != null &&
      (!Number.isInteger(parsedYear) || parsedYear < 1888 || parsedYear > 2100)
    ) {
      setError("Tahun harus antara 1888 dan 2100.");
      setFieldError("year");
      return;
    }

    const parsedRating = rating.trim() ? Number(rating.trim()) : null;
    if (
      parsedRating != null &&
      (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 10)
    ) {
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

    if (
      isEpisodic &&
      parsedTotal != null &&
      (!Number.isInteger(parsedTotal) || parsedTotal < 1)
    ) {
      setError("Total episode minimal 1.");
      setFieldError("episodeTotal");
      return;
    }

    if (isEpisodic && parsedTotal != null && parsedCurrent > parsedTotal) {
      setError(
        "Total episode tidak boleh lebih kecil dari progres episode saat ini."
      );
      setFieldError("episodeTotal");
      return;
    }

    const finalDraftLinks = [...draftLinks];
    if (mode === "create" && (draftLabel.trim() || draftUrl.trim())) {
      const lbl = draftLabel.trim();
      const u = draftUrl.trim();
      if (!lbl || !u) {
        setError(
          "Lengkapi label dan URL link yang sedang diketik, atau kosongkan keduanya."
        );
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

    // Automatically use top TMDB suggestion cover if posterUrl is still empty
    const resolvedPosterUrl =
      posterUrl.trim() || suggestions[0]?.posterUrl || null;

    const payload: TitleInput = {
      name: trimmedName,
      type,
      status,
      year: parsedYear,
      rating: parsedRating,
      posterUrl: resolvedPosterUrl,
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
        className="w-full md:max-w-[560px] max-h-[92dvh] bg-surface rounded-t-sheet md:rounded-card shadow-hero flex flex-col overflow-hidden border border-line animate-dialog-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line shrink-0">
          <div>
            <h2 id={titleIdAttr} className="text-lg font-bold text-ink">
              {mode === "create" ? "Tambah Judul ke Watchlist" : "Ubah Judul"}
            </h2>
            <p className="text-xs text-ink-muted mt-0.5">
              Ketik judul untuk melihat rekomendasi otomatis & cover dari TMDB
            </p>
          </div>
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

          <form
            id="title-dialog-form"
            onSubmit={handleSubmit}
            className="space-y-4"
            noValidate
          >
            {/* Title Input + Automatic Cover Preview Side-by-Side */}
            <div className="flex items-start gap-4">
              {/* Auto Cover Preview from TMDB */}
              <div className="shrink-0 flex flex-col items-center gap-1.5">
                <div className="relative w-20 h-28 rounded-card overflow-hidden shadow-card border border-line bg-surface-soft">
                  {posterUrl.trim() ? (
                    <PosterImage
                      posterUrl={posterUrl}
                      name={name || "Cover"}
                      className="w-full h-full"
                      fallbackTextClassName="text-base font-bold"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-ink-muted p-2 text-center">
                      <ImageIcon className="w-5 h-5 mb-1 opacity-60" aria-hidden="true" />
                      <span className="text-[10px] font-medium leading-tight">
                        Cover Otomatis
                      </span>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowManualPosterInput((v) => !v)}
                  className="text-[11px] font-semibold text-teal-600 hover:underline cursor-pointer"
                >
                  {showManualPosterInput ? "Sembunyikan URL" : "Ubah Cover"}
                </button>
              </div>

              {/* Title Field with TMDB Suggestion Dropdown */}
              <div className="flex-1 min-w-0 relative" ref={suggestionBoxRef}>
                <label
                  htmlFor="title-name"
                  className="block text-sm font-semibold text-ink mb-1.5"
                >
                  Judul Tontonan <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    ref={firstInputRef}
                    id="title-name"
                    name="name"
                    type="text"
                    required
                    maxLength={200}
                    autoComplete="off"
                    value={name}
                    onFocus={() => {
                      if (!selectedTmdbItem && suggestions.length > 0) {
                        setShowSuggestions(true);
                      }
                    }}
                    onChange={(e) => {
                      const val = e.target.value;
                      setName(val);
                      setSelectedTmdbItem(null);
                      if (val.trim().length < 1) {
                        setSuggestions([]);
                        setLoadingSuggestions(false);
                        setShowSuggestions(false);
                      } else {
                        setShowSuggestions(true);
                      }
                    }}
                    onKeyDown={handleNameInputKeyDown}
                    placeholder="Ketik judul film, serial, atau anime..."
                    role="combobox"
                    aria-controls="tmdb-suggestions-listbox"
                    aria-invalid={fieldError === "name"}
                    aria-describedby={error ? "title-dialog-error" : undefined}
                    aria-expanded={showSuggestions && suggestions.length > 0}
                    aria-autocomplete="list"
                    className="w-full h-12 pl-4 pr-10 rounded-input bg-surface-soft text-sm font-medium text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                  {loadingSuggestions && (
                    <Loader2
                      className="w-4 h-4 text-teal-600 animate-spin absolute right-3.5 top-1/2 -translate-y-1/2"
                      aria-hidden="true"
                    />
                  )}
                </div>

                {/* Selected TMDB confirmation pill */}
                {selectedTmdbItem && (
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-teal-400/20 text-ink text-xs font-semibold">
                    <Check className="w-3.5 h-3.5 text-teal-600" aria-hidden="true" />
                    <span>
                      Cover & data diambil otomatis dari TMDB (
                      {selectedTmdbItem.year ?? "—"})
                    </span>
                  </div>
                )}

                {/* TMDB Autocomplete Suggestion Dropdown */}
                {showSuggestions && (loadingSuggestions || suggestions.length > 0) && (
                  <div
                    id="tmdb-suggestions-listbox"
                    role="listbox"
                    aria-label="Saran judul dari TMDB"
                    className="mt-2 rounded-card bg-surface shadow-hero border-2 border-teal-500/40 overflow-hidden max-h-68 overflow-y-auto animate-dialog-in"
                  >
                    <div className="px-3 py-1.5 bg-surface-soft border-b border-line flex items-center justify-between text-[11px] font-semibold text-ink-muted">
                      <span className="inline-flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-teal-600" aria-hidden="true" />
                        {loadingSuggestions
                          ? "Mencari saran judul & cover di TMDB..."
                          : "Pilih saran judul (cover & tahun otomatis terisi)"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowSuggestions(false)}
                        className="text-ink hover:text-teal-600 cursor-pointer"
                      >
                        Tutup
                      </button>
                    </div>
                    {suggestions.length > 0 ? (
                      <ul className="divide-y divide-line">
                        {suggestions.map((item, idx) => {
                          const active = idx === highlightedIdx;
                          return (
                            <li key={`${item.mediaType}-${item.tmdbId}`}>
                              <button
                                type="button"
                                role="option"
                                aria-selected={active}
                                onClick={() => void applyTmdbSuggestion(item)}
                                onMouseEnter={() => setHighlightedIdx(idx)}
                                className={`w-full px-3.5 py-2.5 text-left flex items-center gap-3 cursor-pointer transition-colors ${
                                  active
                                    ? "bg-teal-400/15"
                                    : "hover:bg-surface-soft/70"
                                }`}
                              >
                                <PosterImage
                                  posterUrl={item.posterUrl}
                                  name={item.title}
                                  className="w-10 h-14 rounded-icon shrink-0 shadow-xs"
                                  fallbackTextClassName="text-xs font-bold"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-bold text-ink truncate">
                                    {item.title}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink-muted mt-0.5">
                                    <span className="px-2 py-0.5 rounded-pill bg-surface border border-line text-[11px] font-semibold text-ink">
                                      {TYPE_LABELS[item.appType]}
                                    </span>
                                    {item.year && <span>{item.year}</span>}
                                    {item.voteAverage > 0 && (
                                      <span className="inline-flex items-center gap-0.5 font-semibold text-ink">
                                        <Star
                                          className="w-3 h-3 text-orange-500 fill-orange-500"
                                          aria-hidden="true"
                                        />
                                        {item.voteAverage}
                                      </span>
                                    )}
                                    {item.genreNames.length > 0 && (
                                      <span className="truncate text-[11px]">
                                        · {item.genreNames.slice(0, 2).join(", ")}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <div className="p-4 text-xs text-ink-muted flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-teal-600" aria-hidden="true" />
                        <span>Memuat rekomendasi dari TMDB...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Optional Manual Poster Input (collapsed by default since cover is fetched automatically from TMDB) */}
            {showManualPosterInput && (
              <div className="p-3 rounded-card bg-surface-soft/70 border border-line">
                <label
                  htmlFor="title-poster"
                  className="block text-xs font-semibold text-ink mb-1"
                >
                  URL Cover Manual (opsional, otomatis diisi dari TMDB)
                </label>
                <input
                  id="title-poster"
                  name="posterUrl"
                  type="url"
                  maxLength={2048}
                  value={posterUrl}
                  onChange={(e) => setPosterUrl(e.target.value)}
                  placeholder="https://image.tmdb.org/..."
                  aria-invalid={fieldError === "posterUrl"}
                  className="w-full h-10 px-3 rounded-input bg-surface text-xs text-ink border border-line placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
            )}

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
                  onChange={(e) =>
                    setStatus(e.target.value as TitleStatusValue)
                  }
                  className="w-full h-12 px-4 rounded-input bg-surface-soft text-sm text-ink focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  {(Object.keys(STATUS_LABELS) as TitleStatusValue[]).map(
                    (s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    )
                  )}
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
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="title-notes"
                  className="block text-sm font-medium text-ink"
                >
                  Catatan (maks 2.000 karakter)
                </label>
                {selectedTmdbItem?.overview && !notes.trim() && (
                  <button
                    type="button"
                    onClick={() =>
                      setNotes(selectedTmdbItem.overview.slice(0, 2000))
                    }
                    className="text-xs font-semibold text-teal-600 hover:underline cursor-pointer"
                  >
                    + Isi sinopsis TMDB
                  </button>
                )}
              </div>
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
                    Link Tempat Menonton ({draftLinks.length}/
                    {MAX_LINKS_PER_TITLE})
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
                          <span className="font-semibold text-ink">
                            {dl.label}
                          </span>{" "}
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
                    <strong className="font-bold">
                      &ldquo;{initialTitle.name}&rdquo;
                    </strong>{" "}
                    beserta{" "}
                    <strong className="font-bold">
                      {initialTitle.links.length} link
                    </strong>{" "}
                    terkait secara permanen?
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
