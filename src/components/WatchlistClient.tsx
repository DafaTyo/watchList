"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Film,
  Layers,
  LogOut,
  Menu,
  Play,
  Plus,
  Search,
  Sparkles,
  Star,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import type { SessionUser } from "@/lib/session";
import {
  pickFeaturedTitle,
  type TitleWithLinks,
  type WatchlistStats,
} from "@/lib/services/titles";
import type { TitleInput, TitleStatusValue, TitleTypeValue } from "@/lib/validators";
import {
  createTitleAction,
  updateTitleAction,
  updateTitleStatusAction,
  updateTitleNotesAction,
  deleteTitleAction,
  incrementEpisodeAction,
  decrementEpisodeAction,
} from "@/actions/titles";
import {
  createWatchLinkAction,
  updateWatchLinkAction,
  deleteWatchLinkAction,
} from "@/actions/links";
import { StatCard } from "./StatCard";
import { PosterImage } from "./PosterImage";
import { STATUS_LABELS, STATUS_STYLES, TYPE_LABELS } from "./StatusBadge";
import { TitleRow } from "./TitleRow";
import { EmptyState } from "./EmptyState";
import { DetailPanel } from "./DetailPanel";
import { TitleDialog } from "./TitleDialog";
import type { DraftLink } from "./LinkList";

type WatchlistClientProps = {
  user: SessionUser;
  initialTitles: TitleWithLinks[];
  initialStats: WatchlistStats;
};

type SortKey = "updated_at" | "name" | "rating";

export function WatchlistClient({
  user,
  initialTitles,
  initialStats,
}: WatchlistClientProps) {
  const router = useRouter();
  const [titles, setTitles] = useState<TitleWithLinks[]>(initialTitles);
  const [stats, setStats] = useState<WatchlistStats>(initialStats);

  // Sync props when server component re-renders
  const [prevInitialTitles, setPrevInitialTitles] = useState(initialTitles);
  if (initialTitles !== prevInitialTitles) {
    setPrevInitialTitles(initialTitles);
    setTitles(initialTitles);
  }
  const [prevInitialStats, setPrevInitialStats] = useState(initialStats);
  if (initialStats !== prevInitialStats) {
    setPrevInitialStats(initialStats);
    setStats(initialStats);
  }

  // Search, filter, sort (client-side, PRD F7)
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TitleStatusValue | "all">("all");
  const [typeFilter, setTypeFilter] = useState<TitleTypeValue | "all">("all");
  const [sortBy, setSortBy] = useState<SortKey>("updated_at");

  // Selection & dialogs
  const [selectedTitleId, setSelectedTitleId] = useState<number | null>(null);
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [editingTitle, setEditingTitle] = useState<TitleWithLinks | null>(null);

  // User menu & error banner
  const [menuOpen, setMenuOpen] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const currentYear = new Date().getFullYear();

  const selectedTitle = useMemo(
    () => titles.find((t) => t.id === selectedTitleId) ?? null,
    [titles, selectedTitleId]
  );

  // Featured title on hero panel (PRD §6 rule)
  const featuredTitle = useMemo(() => pickFeaturedTitle(titles), [titles]);

  // Filtered and sorted list (PRD F7)
  const filteredTitles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = titles.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (typeFilter !== "all" && item.type !== typeFilter) return false;
      if (q && !item.name.toLowerCase().includes(q)) return false;
      return true;
    });

    list.sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name, "id", { sensitivity: "base" });
      }
      if (sortBy === "rating") {
        if (a.rating == null && b.rating == null) {
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        }
        if (a.rating == null) return 1;
        if (b.rating == null) return -1;
        if (b.rating !== a.rating) return b.rating - a.rating;
        return a.name.localeCompare(b.name, "id", { sensitivity: "base" });
      }
      // default: updated_at desc
      const diff = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      if (diff !== 0) return diff;
      return b.id - a.id;
    });

    return list;
  }, [titles, searchQuery, statusFilter, typeFilter, sortBy]);

  function recomputeStatsFromList(nextTitles: TitleWithLinks[]): WatchlistStats {
    const next: WatchlistStats = {
      completed: 0,
      planned: 0,
      watching: 0,
      on_hold: 0,
      dropped: 0,
      total: nextTitles.length,
    };
    for (const t of nextTitles) {
      next[t.status] += 1;
    }
    return next;
  }

  function applyUpdatedTitle(updated: TitleWithLinks) {
    setTitles((prev) => {
      const exists = prev.some((t) => t.id === updated.id);
      const next = exists
        ? prev.map((t) => (t.id === updated.id ? updated : t))
        : [updated, ...prev];
      setStats(recomputeStatsFromList(next));
      return next;
    });
  }

  function applyDeletedTitle(deletedId: number) {
    setTitles((prev) => {
      const next = prev.filter((t) => t.id !== deletedId);
      setStats(recomputeStatsFromList(next));
      return next;
    });
    if (selectedTitleId === deletedId) {
      setSelectedTitleId(null);
    }
  }

  async function handleLogout() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  async function handleSaveCreate(
    input: TitleInput,
    draftLinks: DraftLink[]
  ): Promise<{ ok: boolean; error?: string; field?: string }> {
    setBannerError(null);
    setBusy(true);
    const res = await createTitleAction(input);
    if (!res.ok) {
      setBusy(false);
      return res;
    }

    let finalTitle = res.data;
    for (const dl of draftLinks) {
      const linkRes = await createWatchLinkAction(finalTitle.id, {
        label: dl.label,
        url: dl.url,
      });
      if (linkRes.ok) {
        finalTitle = {
          ...finalTitle,
          updatedAt: new Date(),
          links: [...finalTitle.links, linkRes.data],
        };
      }
    }

    applyUpdatedTitle(finalTitle);
    setBusy(false);
    router.refresh();
    return { ok: true };
  }

  async function handleSaveEdit(
    titleId: number,
    input: TitleInput
  ): Promise<{ ok: boolean; error?: string; field?: string }> {
    setBannerError(null);
    setBusy(true);
    const res = await updateTitleAction(titleId, input);
    setBusy(false);
    if (!res.ok) return res;
    applyUpdatedTitle(res.data);
    router.refresh();
    return { ok: true };
  }

  async function handleDeleteTitle(
    titleId: number
  ): Promise<{ ok: boolean; error?: string }> {
    setBannerError(null);
    setBusy(true);
    const res = await deleteTitleAction(titleId);
    setBusy(false);
    if (!res.ok) {
      setBannerError(res.error);
      return res;
    }
    applyDeletedTitle(titleId);
    router.refresh();
    return { ok: true };
  }

  async function handleStatusChange(
    titleId: number,
    status: TitleStatusValue
  ): Promise<{ ok: boolean; error?: string }> {
    setBannerError(null);
    setBusy(true);
    const res = await updateTitleStatusAction(titleId, status);
    setBusy(false);
    if (!res.ok) {
      setBannerError(res.error);
      return res;
    }
    applyUpdatedTitle(res.data);
    router.refresh();
    return { ok: true };
  }

  async function handleIncrementEpisode(
    titleId: number
  ): Promise<{ ok: boolean; error?: string }> {
    setBannerError(null);
    setBusy(true);
    const res = await incrementEpisodeAction(titleId);
    setBusy(false);
    if (!res.ok) {
      setBannerError(res.error);
      return res;
    }
    applyUpdatedTitle(res.data);
    router.refresh();
    return { ok: true };
  }

  async function handleDecrementEpisode(
    titleId: number
  ): Promise<{ ok: boolean; error?: string }> {
    setBannerError(null);
    setBusy(true);
    const res = await decrementEpisodeAction(titleId);
    setBusy(false);
    if (!res.ok) {
      setBannerError(res.error);
      return res;
    }
    applyUpdatedTitle(res.data);
    router.refresh();
    return { ok: true };
  }

  async function handleSaveNotes(
    titleId: number,
    notes: string | null
  ): Promise<{ ok: boolean; error?: string }> {
    setBannerError(null);
    setBusy(true);
    const res = await updateTitleNotesAction(titleId, notes);
    setBusy(false);
    if (!res.ok) {
      setBannerError(res.error);
      return res;
    }
    applyUpdatedTitle(res.data);
    router.refresh();
    return { ok: true };
  }

  async function handleAddLink(
    titleId: number,
    input: { label: string; url: string }
  ): Promise<{ ok: boolean; error?: string }> {
    setBannerError(null);
    const res = await createWatchLinkAction(titleId, input);
    if (!res.ok) return res;
    const target = titles.find((t) => t.id === titleId);
    if (target) {
      const updated: TitleWithLinks = {
        ...target,
        updatedAt: new Date(),
        links: [...target.links, res.data],
      };
      applyUpdatedTitle(updated);
      if (editingTitle?.id === titleId) {
        setEditingTitle(updated);
      }
    }
    router.refresh();
    return { ok: true };
  }

  async function handleUpdateLink(
    linkId: number,
    input: { label: string; url: string }
  ): Promise<{ ok: boolean; error?: string }> {
    setBannerError(null);
    const res = await updateWatchLinkAction(linkId, input);
    if (!res.ok) return res;
    const target = titles.find((t) => t.links.some((l) => l.id === linkId));
    if (target) {
      const updated: TitleWithLinks = {
        ...target,
        updatedAt: new Date(),
        links: target.links.map((l) => (l.id === linkId ? res.data : l)),
      };
      applyUpdatedTitle(updated);
      if (editingTitle?.id === target.id) {
        setEditingTitle(updated);
      }
    }
    router.refresh();
    return { ok: true };
  }

  async function handleDeleteLink(
    linkId: number
  ): Promise<{ ok: boolean; error?: string }> {
    setBannerError(null);
    const res = await deleteWatchLinkAction(linkId);
    if (!res.ok) return res;
    const target = titles.find((t) => t.links.some((l) => l.id === linkId));
    if (target) {
      const updated: TitleWithLinks = {
        ...target,
        updatedAt: new Date(),
        links: target.links.filter((l) => l.id !== linkId),
      };
      applyUpdatedTitle(updated);
      if (editingTitle?.id === target.id) {
        setEditingTitle(updated);
      }
    }
    router.refresh();
    return { ok: true };
  }

  function openCreateDialog() {
    setEditingTitle(null);
    setDialogMode("create");
  }

  function openEditDialog(title: TitleWithLinks) {
    setEditingTitle(title);
    setDialogMode("edit");
  }

  function togglePanelTab() {
    if (selectedTitle) {
      setSelectedTitleId(null);
    } else if (featuredTitle) {
      setSelectedTitleId(featuredTitle.id);
    }
  }

  return (
    <div className="min-h-dvh lg:h-dvh w-full max-w-[1440px] mx-auto p-3 sm:p-4 lg:p-6 flex flex-col lg:flex-row gap-4 lg:gap-6 overflow-x-hidden">
      {/* LEFT PANEL: HERO VISUAL */}
      <section
        aria-label="Sorotan Watchlist"
        className="relative lg:flex-1 rounded-panel bg-hero-gradient shadow-hero p-5 sm:p-7 flex flex-col justify-between min-h-[220px] md:min-h-[280px] lg:min-h-0 overflow-hidden"
      >
        {/* Top bar: dark logo button + white menu button (DESIGN.md §6.1) */}
        <div className="relative z-10 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div
              className="w-11 h-11 rounded-icon bg-ink text-surface flex items-center justify-center shadow-card shrink-0"
              aria-label="Nixtio Watch"
            >
              <Film className="w-5 h-5" aria-hidden="true" />
            </div>
            <span className="hidden sm:inline-block text-xs font-bold uppercase tracking-widest text-surface drop-shadow-xs">
              Nixtio Watch
            </span>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-label="Menu akun"
              className="w-11 h-11 rounded-icon bg-surface text-ink flex items-center justify-center shadow-card hover:bg-surface-soft cursor-pointer focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-teal-600 transition"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-60 rounded-card bg-surface shadow-hero border border-line p-3 z-30 space-y-2"
              >
                <div className="px-2 py-1.5 border-b border-line">
                  <div className="text-xs font-bold text-ink truncate">
                    {user.name}
                  </div>
                  <div className="text-[11px] text-ink-muted truncate">
                    {user.email}
                  </div>
                </div>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="w-full min-h-11 px-3 rounded-pill text-xs font-semibold text-red-500 hover:bg-error-bg flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 transition"
                >
                  <LogOut className="w-4 h-4" aria-hidden="true" />
                  <span>Keluar dari Akun</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Center: Featured Title Poster or Empty Hero Illustration */}
        <div className="relative z-10 my-4 md:my-6 flex flex-col items-center justify-center text-center">
          {featuredTitle ? (
            <div className="flex flex-row md:flex-col items-center gap-4 md:gap-4 max-w-md w-full md:w-auto bg-surface/15 md:bg-transparent backdrop-blur-xs md:backdrop-blur-none p-3 md:p-0 rounded-card">
              <button
                type="button"
                onClick={() => setSelectedTitleId(featuredTitle.id)}
                aria-label={`Lihat detail sorotan: ${featuredTitle.name}`}
                className="group relative rounded-card overflow-hidden shadow-hero border-2 border-surface/50 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-teal-400 transition"
              >
                <PosterImage
                  posterUrl={featuredTitle.posterUrl}
                  name={featuredTitle.name}
                  className="w-20 h-28 sm:w-28 sm:h-40 lg:w-52 lg:h-72 rounded-card"
                  fallbackTextClassName="text-2xl lg:text-4xl font-bold"
                />
              </button>

              <div className="text-left md:text-center min-w-0 flex-1 md:flex-initial">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-surface/90 text-ink text-[11px] font-semibold shadow-xs mb-1.5">
                  <Sparkles className="w-3 h-3 text-teal-600" aria-hidden="true" />
                  <span>Judul Sorotan</span>
                  <span aria-hidden="true">·</span>
                  <span>{STATUS_LABELS[featuredTitle.status as TitleStatusValue]}</span>
                </div>
                <h2 className="text-base sm:text-lg lg:text-2xl font-bold text-ink bg-surface/85 px-3.5 py-1 rounded-pill shadow-xs truncate max-w-xs sm:max-w-sm">
                  {featuredTitle.name}
                </h2>
                <div className="mt-1.5 inline-flex items-center gap-2 text-xs font-semibold text-ink bg-surface/80 px-3 py-0.5 rounded-pill">
                  <span>{TYPE_LABELS[featuredTitle.type as TitleTypeValue]}</span>
                  {featuredTitle.year && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{featuredTitle.year}</span>
                    </>
                  )}
                  {(featuredTitle.type === "series" ||
                    featuredTitle.type === "anime") && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>
                        Ep {featuredTitle.episodeCurrent}/
                        {featuredTitle.episodeTotal ?? "∞"}
                      </span>
                    </>
                  )}
                  {featuredTitle.rating != null && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-0.5">
                        <Star
                          className="w-3 h-3 text-orange-500 fill-orange-500"
                          aria-hidden="true"
                        />
                        {featuredTitle.rating}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-4 px-6 rounded-card bg-surface/80 backdrop-blur-xs shadow-card max-w-xs">
              <div className="w-14 h-14 rounded-pill bg-teal-400/30 text-ink flex items-center justify-center mb-2">
                <Film className="w-7 h-7" aria-hidden="true" />
              </div>
              <p className="text-sm font-bold text-ink">Belum Ada Sorotan</p>
              <p className="text-xs text-ink-muted mt-0.5">
                Tambahkan judul pertama Anda untuk melihat poster sorotan di sini.
              </p>
            </div>
          )}
        </div>

        {/* Bottom Floating StatCards: Sedang ditonton & Total judul (PRD §6, DESIGN.md §6.2) */}
        <div className="relative z-10 flex items-end justify-between gap-3">
          <div className="flex md:hidden w-full gap-2.5">
            <StatCard
              compact
              label="Sedang ditonton"
              value={stats.watching}
              icon={Play}
            />
            <StatCard
              compact
              label="Total judul"
              value={stats.total}
              icon={Layers}
            />
          </div>

          <div className="hidden md:flex w-full items-end justify-between gap-4">
            <StatCard
              label="Sedang ditonton"
              value={stats.watching}
              icon={Play}
            />
            <StatCard label="Total judul" value={stats.total} icon={Layers} />
          </div>
        </div>

        {/* Curved edge toggle tab between panels on desktop (PRD §6, DESIGN.md §5) */}
        {(selectedTitle || featuredTitle) && (
          <button
            type="button"
            onClick={togglePanelTab}
            aria-label={
              selectedTitle ? "Kembali ke daftar judul" : "Buka detail judul sorotan"
            }
            title={
              selectedTitle ? "Kembali ke daftar judul" : "Buka detail judul sorotan"
            }
            className="hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 w-11 h-16 rounded-l-card bg-surface text-ink items-center justify-center shadow-card hover:bg-surface-soft cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 z-20"
          >
            {selectedTitle ? (
              <ChevronLeft className="w-5 h-5" aria-hidden="true" />
            ) : (
              <ChevronRight className="w-5 h-5" aria-hidden="true" />
            )}
          </button>
        )}
      </section>

      {/* RIGHT PANEL: INFORMATION, STATS, FILTER & PILL LIST (DESIGN.md §5–§6) */}
      <section
        aria-label="Panel Watchlist"
        className="w-full lg:w-[440px] xl:w-[460px] shrink-0 rounded-panel bg-surface shadow-card p-5 sm:p-7 flex flex-col lg:h-full lg:overflow-hidden border border-line/60"
      >
        {bannerError && (
          <div
            role="alert"
            className="mb-4 p-3 rounded-input bg-error-bg text-status-dropped-fg text-xs font-medium flex items-center justify-between gap-2 shrink-0"
          >
            <span>{bannerError}</span>
            <button
              type="button"
              onClick={() => {
                setBannerError(null);
                router.refresh();
              }}
              className="px-2.5 py-1 rounded-pill bg-surface text-ink text-[11px] font-semibold shrink-0 cursor-pointer"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {selectedTitle ? (
          <DetailPanel
            key={selectedTitle.id}
            title={selectedTitle}
            busy={busy}
            onBack={() => setSelectedTitleId(null)}
            onEditClick={openEditDialog}
            onStatusChange={handleStatusChange}
            onIncrementEpisode={handleIncrementEpisode}
            onDecrementEpisode={handleDecrementEpisode}
            onSaveNotes={handleSaveNotes}
            onDeleteTitle={handleDeleteTitle}
            onAddLink={handleAddLink}
            onUpdateLink={handleUpdateLink}
            onDeleteLink={handleDeleteLink}
          />
        ) : (
          <>
            {/* Panel Header ("WATCHLIST {YEAR}") */}
            <div className="flex items-center justify-between gap-2 shrink-0">
              <h1 className="font-display text-2xl sm:text-[28px] font-bold uppercase tracking-[0.04em] text-ink">
                Watchlist {currentYear}
              </h1>
              <span className="text-xs font-medium text-ink-muted">
                {stats.total}/500
              </span>
            </div>

            {/* Big Statistics Block: Selesai | Rencana + small status chips (PRD F8, DESIGN.md §6.3) */}
            <div className="mt-4 pt-3 pb-4 border-y border-line shrink-0">
              <div className="grid grid-cols-2 divide-x divide-line">
                <div className="pr-4">
                  <span className="block text-xs font-medium text-ink-muted">
                    Selesai
                  </span>
                  <span
                    data-testid="stat-completed"
                    className="block text-[44px] sm:text-[56px] font-bold text-ink leading-none mt-1 tabular-nums transition-opacity duration-150"
                  >
                    {stats.completed}
                  </span>
                </div>
                <div className="pl-4">
                  <span className="block text-xs font-medium text-ink-muted">
                    Rencana
                  </span>
                  <span
                    data-testid="stat-planned"
                    className="block text-[44px] sm:text-[56px] font-bold text-ink leading-none mt-1 tabular-nums transition-opacity duration-150"
                  >
                    {stats.planned}
                  </span>
                </div>
              </div>

              {/* Other statuses as small chips */}
              <div className="flex flex-wrap items-center gap-1.5 mt-3">
                <span
                  data-testid="chip-watching"
                  className={`px-3 py-1 rounded-pill text-xs font-semibold ${STATUS_STYLES.watching}`}
                >
                  Menonton: {stats.watching}
                </span>
                <span
                  data-testid="chip-on_hold"
                  className={`px-3 py-1 rounded-pill text-xs font-semibold ${STATUS_STYLES.on_hold}`}
                >
                  Ditahan: {stats.on_hold}
                </span>
                <span
                  data-testid="chip-dropped"
                  className={`px-3 py-1 rounded-pill text-xs font-semibold ${STATUS_STYLES.dropped}`}
                >
                  Dibuang: {stats.dropped}
                </span>
              </div>
            </div>

            {/* Search, Filter & Sort Controls (PRD F7, DESIGN.md §6.6) */}
            <div className="mt-4 space-y-2.5 shrink-0">
              <div className="flex items-center gap-2">
                <div className="relative flex-1 min-w-0">
                  <Search
                    className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <label htmlFor="watchlist-search" className="sr-only">
                    Cari judul tontonan
                  </label>
                  <input
                    id="watchlist-search"
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari judul..."
                    className="w-full h-11 pl-10 pr-3.5 rounded-input bg-surface-soft text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-teal-600 transition"
                  />
                </div>

                <div>
                  <label htmlFor="watchlist-sort" className="sr-only">
                    Urutkan berdasarkan
                  </label>
                  <select
                    id="watchlist-sort"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortKey)}
                    className="h-11 px-3 rounded-input bg-surface-soft text-xs font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-teal-600 cursor-pointer"
                  >
                    <option value="updated_at">Terbaru Diubah</option>
                    <option value="name">Judul (A–Z)</option>
                    <option value="rating">Rating Tertinggi</option>
                  </select>
                </div>
              </div>

              {/* Status filter chips (horizontally scrollable on mobile) */}
              <div
                role="group"
                aria-label="Filter status"
                className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar"
              >
                {(
                  [
                    { key: "all", label: "Semua Status" },
                    { key: "watching", label: STATUS_LABELS.watching },
                    { key: "planned", label: STATUS_LABELS.planned },
                    { key: "completed", label: STATUS_LABELS.completed },
                    { key: "on_hold", label: STATUS_LABELS.on_hold },
                    { key: "dropped", label: STATUS_LABELS.dropped },
                  ] as const
                ).map((item) => {
                  const active = statusFilter === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setStatusFilter(item.key)}
                      className={`min-h-11 px-3.5 rounded-pill text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 transition ${
                        active
                          ? "bg-ink text-surface"
                          : "bg-surface-soft text-ink-muted hover:text-ink"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              {/* Type filter chips */}
              <div
                role="group"
                aria-label="Filter tipe tontonan"
                className="flex items-center gap-1.5 overflow-x-auto pb-1"
              >
                {(
                  [
                    { key: "all", label: "Semua Tipe" },
                    { key: "movie", label: TYPE_LABELS.movie },
                    { key: "series", label: TYPE_LABELS.series },
                    { key: "anime", label: TYPE_LABELS.anime },
                  ] as const
                ).map((item) => {
                  const active = typeFilter === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setTypeFilter(item.key)}
                      className={`min-h-11 px-3.5 rounded-pill text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 transition ${
                        active
                          ? "bg-teal-500 text-ink"
                          : "bg-surface-soft text-ink-muted hover:text-ink"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pill List Area */}
            <div className="mt-3 flex-1 lg:overflow-y-auto space-y-2 pr-0.5 pb-4">
              {filteredTitles.length === 0 ? (
                <EmptyState
                  hasAnyTitles={titles.length > 0}
                  onAddClick={openCreateDialog}
                  onResetFilters={
                    titles.length > 0
                      ? () => {
                          setSearchQuery("");
                          setStatusFilter("all");
                          setTypeFilter("all");
                        }
                      : undefined
                  }
                />
              ) : (
                filteredTitles.map((title) => (
                  <TitleRow
                    key={title.id}
                    title={title}
                    selected={selectedTitleId === title.id}
                    busy={busy}
                    onSelect={(t) => setSelectedTitleId(t.id)}
                    onQuickIncrement={handleIncrementEpisode}
                  />
                ))
              )}
            </div>

            {/* Sticky / Fixed Bottom CTA ("Tambah Judul", DESIGN.md §6.5 & §8) */}
            <div className="pt-3 border-t border-line bg-surface sticky bottom-0 pb-[env(safe-area-inset-bottom)] shrink-0">
              <button
                type="button"
                onClick={openCreateDialog}
                className="w-full h-14 rounded-pill bg-cta-gradient text-ink font-semibold text-base flex items-center justify-between px-6 shadow-card cursor-pointer focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-teal-600 focus-visible:ring-offset-2 transition"
              >
                <span>Tambah Judul</span>
                <span className="w-9 h-9 rounded-pill bg-ink text-surface flex items-center justify-center">
                  <Plus className="w-5 h-5" aria-hidden="true" />
                </span>
              </button>
            </div>
          </>
        )}
      </section>

      {/* Responsive Modal / Bottom Sheet Dialog */}
      <TitleDialog
        key={`${dialogMode ?? "closed"}-${editingTitle?.id ?? "new"}`}
        open={dialogMode !== null}
        mode={dialogMode ?? "create"}
        initialTitle={editingTitle}
        onClose={() => {
          setDialogMode(null);
          setEditingTitle(null);
        }}
        onSaveCreate={handleSaveCreate}
        onSaveEdit={handleSaveEdit}
        onDeleteTitle={handleDeleteTitle}
        onAddLink={handleAddLink}
        onUpdateLink={handleUpdateLink}
        onDeleteLink={handleDeleteLink}
      />
    </div>
  );
}

