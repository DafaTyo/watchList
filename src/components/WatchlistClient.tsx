"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Compass,
  ExternalLink,
  Film,
  Layers,
  ListVideo,
  Loader2,
  LogOut,
  Maximize2,
  Menu,
  Minimize2,
  Play,
  Plus,
  Search,
  Sparkles,
  Star,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import type { SessionUser } from "@/lib/session";
import {
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
import { logoutAction } from "@/actions/auth";
import { StatCard } from "./StatCard";
import { PosterImage } from "./PosterImage";
import { StatusBadge, STATUS_LABELS, STATUS_STYLES, TYPE_LABELS } from "./StatusBadge";
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

const SPOTLIGHT_ROTATION_MS = 5000;
const MAX_SPOTLIGHT_ITEMS = 8;

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

  // Spotlight auto-rotating carousel state
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const [spotlightPaused, setSpotlightPaused] = useState(false);
  const [spotlightMinimized, setSpotlightMinimized] = useState(false);

  // User menu & error banner
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mutatingTitleId, setMutatingTitleId] = useState<number | null>(null);

  const currentYear = new Date().getFullYear();

  const selectedTitle = useMemo(
    () => titles.find((t) => t.id === selectedTitleId) ?? null,
    [titles, selectedTitleId]
  );

  // Build spotlight pool: prioritize `watching` sorted by updatedAt desc, then fill with newest updated titles
  const spotlightPool = useMemo(() => {
    if (titles.length === 0) return [];
    const sorted = [...titles].sort((a, b) => {
      const diff = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      if (diff !== 0) return diff;
      return b.id - a.id;
    });
    const watching = sorted.filter((t) => t.status === "watching");
    const others = sorted.filter((t) => t.status !== "watching");
    return [...watching, ...others].slice(0, MAX_SPOTLIGHT_ITEMS);
  }, [titles]);

  const safeSpotlightIndex =
    spotlightPool.length > 0 ? spotlightIndex % spotlightPool.length : 0;
  const featuredTitle = spotlightPool[safeSpotlightIndex] ?? null;

  // Auto-rotate spotlight every 5 seconds unless paused or reduced-motion is preferred
  useEffect(() => {
    if (spotlightPool.length <= 1 || spotlightPaused) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      setSpotlightIndex((prev) => (prev + 1) % spotlightPool.length);
    }, SPOTLIGHT_ROTATION_MS);

    return () => window.clearInterval(timer);
  }, [spotlightPool.length, spotlightPaused]);

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

  // Dynamic stats scoped to current searchQuery + typeFilter so header numbers react live to filters
  const scopedStats = useMemo<WatchlistStats>(() => {
    const q = searchQuery.trim().toLowerCase();
    const next: WatchlistStats = {
      completed: 0,
      planned: 0,
      watching: 0,
      on_hold: 0,
      dropped: 0,
      total: 0,
    };
    for (const item of titles) {
      if (typeFilter !== "all" && item.type !== typeFilter) continue;
      if (q && !item.name.toLowerCase().includes(q)) continue;
      next[item.status] += 1;
      next.total += 1;
    }
    return next;
  }, [titles, typeFilter, searchQuery]);

  const hasActiveFilter =
    statusFilter !== "all" ||
    typeFilter !== "all" ||
    searchQuery.trim().length > 0;

  function toggleStatusFilter(target: TitleStatusValue) {
    setStatusFilter((prev) => (prev === target ? "all" : target));
  }

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
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logoutAction();
      await authClient.signOut().catch(() => {});
    } finally {
      router.replace("/login");
      router.refresh();
    }
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
    setMutatingTitleId(titleId);
    const res = await incrementEpisodeAction(titleId);
    setBusy(false);
    setMutatingTitleId(null);
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
    setMutatingTitleId(titleId);
    const res = await decrementEpisodeAction(titleId);
    setBusy(false);
    setMutatingTitleId(null);
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

  function prevSpotlight() {
    if (spotlightPool.length <= 1) return;
    setSpotlightIndex(
      (prev) => (prev - 1 + spotlightPool.length) % spotlightPool.length
    );
  }

  function nextSpotlight() {
    if (spotlightPool.length <= 1) return;
    setSpotlightIndex((prev) => (prev + 1) % spotlightPool.length);
  }

  return (
    <div
      className={`min-h-dvh ${
        spotlightMinimized ? "" : "lg:h-dvh"
      } w-full max-w-[1440px] mx-auto p-3 sm:p-4 lg:p-6 flex flex-col gap-4 lg:gap-5 overflow-x-hidden`}
    >
      {/* TOP NAVIGATION HEADER (Unified with Dashboard) */}
      <header className="rounded-card bg-surface shadow-card border border-line/60 px-3.5 sm:px-6 py-3 sm:py-3.5 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 shrink-0">
        <div className="order-1 flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-icon bg-ink text-surface flex items-center justify-center shadow-xs shrink-0"
            aria-label="Nixtio Watch"
          >
            <Film className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <span className="font-display text-sm sm:text-lg font-bold uppercase tracking-wider text-ink block leading-none truncate">
              Nixtio Watch
            </span>
            <span className="text-[11px] sm:text-xs text-ink-muted block truncate mt-0.5">
              Koleksi & Progres Watchlist
            </span>
          </div>
        </div>

        {/* Navigation Switcher: Full-width 2-col on mobile, centered pill on md+ */}
        <nav
          aria-label="Navigasi utama"
          className="order-3 md:order-2 w-full md:w-auto grid grid-cols-2 md:flex items-center gap-1.5 bg-surface-soft p-1.5 rounded-pill border border-line"
        >
          <Link
            href="/dashboard"
            className="min-h-10 px-3 sm:px-4 rounded-pill text-ink-muted hover:text-ink hover:bg-surface text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-1.5 transition"
          >
            <Compass className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="truncate">Dashboard</span>
          </Link>
          <Link
            href="/watchlist"
            aria-current="page"
            className="min-h-10 px-3 sm:px-4 rounded-pill bg-ink text-surface text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-1.5 shadow-xs transition"
          >
            <ListVideo className="w-4 h-4 text-teal-400 shrink-0" aria-hidden="true" />
            <span className="truncate">Watchlist</span>
            <span className="px-2 py-0.5 rounded-pill bg-teal-400 text-ink text-[11px] font-bold tabular-nums">
              {stats.total}
            </span>
          </Link>
        </nav>

        {/* Right Actions: Quick Add + Account Menu */}
        <div className="order-2 md:order-3 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={openCreateDialog}
            className="min-h-10 sm:min-h-11 px-3.5 sm:px-4 rounded-pill bg-cta-gradient text-ink text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 shadow-card hover:opacity-95 active:scale-95 cursor-pointer transition"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Tambah Watchlist</span>
            <span className="sm:hidden">Tambah</span>
          </button>

          <div className="relative z-30">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-label="Menu akun"
              className="relative z-40 w-10 h-10 sm:w-11 sm:h-11 rounded-icon bg-surface-soft border border-line text-ink flex items-center justify-center hover:bg-line/50 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-teal-600 transition"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>

            {menuOpen && (
              <>
                <div
                  aria-hidden="true"
                  onClick={() => setMenuOpen(false)}
                  className="fixed inset-0 z-30"
                />
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-60 rounded-card bg-surface shadow-hero border border-line p-3 z-40 space-y-2 animate-dialog-in"
                >
                  <div className="px-2 py-1.5 border-b border-line">
                    <div className="text-xs font-bold text-ink truncate">
                      {user.name}
                    </div>
                    <div className="text-[11px] text-ink-muted truncate">
                      {user.email}
                    </div>
                  </div>
                  <Link
                    href="/dashboard"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="w-full min-h-11 px-3 rounded-pill text-xs font-semibold text-ink hover:bg-surface-soft flex items-center gap-2 transition"
                  >
                    <Compass className="w-4 h-4 text-teal-600" aria-hidden="true" />
                    <span>Eksplorasi Dashboard TMDB</span>
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={loggingOut}
                    onClick={handleLogout}
                    className="w-full min-h-11 px-3 rounded-pill text-xs font-semibold text-red-500 hover:bg-error-bg active:scale-[0.98] disabled:opacity-60 flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 transition"
                  >
                    {loggingOut ? (
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <LogOut className="w-4 h-4" aria-hidden="true" />
                    )}
                    <span>{loggingOut ? "Keluar..." : "Keluar dari Akun"}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* WORKSPACE: 50:50 NORMAL OR FULL-WIDTH WHEN SPOTLIGHT MINIMIZED */}
      <div
        className={`flex-1 min-h-0 flex flex-col ${
          spotlightMinimized ? "gap-3" : "lg:flex-row gap-4 lg:gap-6"
        }`}
      >
        {spotlightMinimized ? (
          /* MINIMIZED SPOTLIGHT COMPACT BAR */
          <section
            aria-label="Sorotan Watchlist (Minimize)"
            onMouseEnter={() => setSpotlightPaused(true)}
            onMouseLeave={() => setSpotlightPaused(false)}
            className="w-full rounded-card bg-hero-gradient shadow-card px-3.5 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-3 shrink-0 animate-panel-in"
          >
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <span className="hidden xs:inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-pill bg-surface/95 text-ink text-xs font-bold shrink-0 shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" aria-hidden="true" />
                <span className="hidden sm:inline">Sorotan</span>
              </span>

              {featuredTitle ? (
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => setSelectedTitleId(featuredTitle.id)}
                    className="flex items-center gap-2 min-w-0 bg-surface/95 hover:bg-surface px-2.5 sm:px-3 py-1 rounded-pill shadow-xs cursor-pointer transition max-w-full"
                  >
                    <PosterImage
                      posterUrl={featuredTitle.posterUrl}
                      name={featuredTitle.name}
                      className="w-7 h-7 rounded-pill shrink-0"
                      fallbackTextClassName="text-[10px] font-bold"
                    />
                    <span className="text-xs sm:text-sm font-bold text-ink truncate">
                      {featuredTitle.name}
                    </span>
                    <span className="hidden sm:inline-block text-[11px] font-semibold text-ink-muted shrink-0">
                      ({STATUS_LABELS[featuredTitle.status as TitleStatusValue]})
                    </span>
                  </button>

                  {spotlightPool.length > 1 && (
                    <div className="hidden md:flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={prevSpotlight}
                        aria-label="Sorotan sebelumnya"
                        className="w-8 h-8 rounded-pill bg-surface/85 hover:bg-surface text-ink flex items-center justify-center cursor-pointer transition"
                      >
                        <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={nextSpotlight}
                        aria-label="Sorotan berikutnya"
                        className="w-8 h-8 rounded-pill bg-surface/85 hover:bg-surface text-ink flex items-center justify-center cursor-pointer transition"
                      >
                        <ChevronRight className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-xs font-semibold text-surface truncate">
                  Belum ada judul sorotan
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="hidden lg:flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-pill bg-surface/90 text-ink text-xs font-bold shadow-xs">
                  Sedang ditonton: {stats.watching}
                </span>
                <span className="px-3 py-1.5 rounded-pill bg-surface/90 text-ink text-xs font-bold shadow-xs">
                  Total judul: {stats.total}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setSpotlightMinimized(false)}
                className="min-h-9 sm:min-h-10 px-3 sm:px-4 rounded-pill bg-surface hover:bg-teal-400 text-ink text-xs font-bold shadow-card inline-flex items-center gap-1.5 cursor-pointer transition"
              >
                <Maximize2 className="w-3.5 h-3.5 text-teal-600" aria-hidden="true" />
                <span className="hidden sm:inline">Normalkan Sorotan</span>
                <span className="sm:hidden">Normalkan</span>
              </button>
            </div>
          </section>
        ) : (
          /* NORMAL LEFT PANEL (50% on desktop): HERO VISUAL & ROTATING SPOTLIGHT */
          <section
            aria-label="Sorotan Watchlist"
            onMouseEnter={() => setSpotlightPaused(true)}
            onMouseLeave={() => setSpotlightPaused(false)}
            className="relative w-full lg:w-1/2 lg:flex-1 rounded-panel bg-hero-gradient shadow-hero p-4 sm:p-6 flex flex-col justify-between lg:min-h-0 overflow-hidden animate-panel-in"
          >
            {/* Top badge + Prev/Next + Minimize Button inside hero panel */}
            <div className="relative z-10 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-surface/95 text-ink text-xs font-bold shadow-xs truncate">
                  <Sparkles className="w-3.5 h-3.5 text-teal-600 shrink-0" aria-hidden="true" />
                  <span className="truncate">Sorotan Koleksi</span>
                </span>
                {spotlightPool.length > 1 && (
                  <span className="px-2.5 py-1 rounded-pill bg-ink/80 text-surface text-[11px] font-semibold tabular-nums shrink-0">
                    {safeSpotlightIndex + 1}/{spotlightPool.length}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                {spotlightPool.length > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={prevSpotlight}
                      aria-label="Sorotan sebelumnya"
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-pill bg-surface/90 hover:bg-surface active:scale-95 text-ink shadow-xs flex items-center justify-center cursor-pointer transition"
                    >
                      <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={nextSpotlight}
                      aria-label="Sorotan berikutnya"
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-pill bg-surface/90 hover:bg-surface active:scale-95 text-ink shadow-xs flex items-center justify-center cursor-pointer transition"
                    >
                      <ChevronRight className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setSpotlightMinimized(true)}
                  aria-label="Minimize panel sorotan"
                  title="Minimize panel sorotan agar daftar watchlist lebih luas"
                  className="min-h-8 sm:min-h-9 px-3 sm:px-3.5 rounded-pill bg-surface/95 hover:bg-surface text-ink text-xs font-bold shadow-card inline-flex items-center gap-1.5 cursor-pointer transition"
                >
                  <Minimize2 className="w-3.5 h-3.5 text-teal-600" aria-hidden="true" />
                  <span>Minimize</span>
                </button>
              </div>
            </div>

            {/* Center: Unified Clean Spotlight Card (Horizontal media layout on both mobile and desktop) */}
            <div className="relative z-10 my-3 flex-1 flex flex-col justify-center">
              {featuredTitle ? (
                <div
                  key={featuredTitle.id}
                  className="w-full flex flex-col animate-spotlight-in"
                >
                  {/* Unified White/Glass Card */}
                  <div className="w-full rounded-card bg-surface/95 backdrop-blur-xs shadow-hero border border-surface p-3.5 sm:p-5 flex flex-col gap-3.5">
                    <div className="flex flex-row items-start sm:items-stretch gap-3.5 sm:gap-5">
                      {/* Left: Poster Cover */}
                      <button
                        type="button"
                        onClick={() => setSelectedTitleId(featuredTitle.id)}
                        aria-label={`Lihat detail sorotan: ${featuredTitle.name}`}
                        className="group relative rounded-card overflow-hidden shadow-card border border-line shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-teal-400 transition-transform duration-300 ease-out hover:scale-[1.02]"
                      >
                        <PosterImage
                          posterUrl={featuredTitle.posterUrl}
                          name={featuredTitle.name}
                          className="w-24 h-36 sm:w-36 sm:h-52 lg:w-40 lg:h-56 rounded-card"
                          fallbackTextClassName="text-xl sm:text-2xl lg:text-3xl font-bold"
                        />
                        {featuredTitle.rating != null && (
                          <span className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 px-1.5 sm:px-2 py-0.5 rounded-pill bg-ink/90 text-surface text-[10px] sm:text-[11px] font-bold shadow-xs inline-flex items-center gap-0.5">
                            <Star
                              className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-orange-500 fill-orange-500"
                              aria-hidden="true"
                            />
                            {featuredTitle.rating}
                          </span>
                        )}
                      </button>

                      {/* Right: Structured Details */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between text-left">
                        <div>
                          {/* Status & Type Pills */}
                          <div className="flex flex-wrap items-center gap-1.5 mb-1.5 sm:mb-2">
                            <StatusBadge status={featuredTitle.status} />
                            <span className="px-2 sm:px-2.5 py-0.5 rounded-pill bg-surface-soft text-ink text-[11px] sm:text-xs font-semibold border border-line">
                              {TYPE_LABELS[featuredTitle.type as TitleTypeValue]}
                            </span>
                            {featuredTitle.year && (
                              <span className="px-2 sm:px-2.5 py-0.5 rounded-pill bg-surface-soft text-ink-muted text-[11px] sm:text-xs font-semibold">
                                {featuredTitle.year}
                              </span>
                            )}
                          </div>

                          {/* Title Name */}
                          <button
                            type="button"
                            onClick={() => setSelectedTitleId(featuredTitle.id)}
                            className="text-left group cursor-pointer focus-visible:outline-none max-w-full"
                          >
                            <h2 className="text-base sm:text-xl lg:text-2xl font-bold text-ink line-clamp-2 group-hover:text-teal-600 transition-colors leading-snug">
                              {featuredTitle.name}
                            </h2>
                          </button>

                          {/* Episode Progress Info */}
                          {(featuredTitle.type === "series" ||
                            featuredTitle.type === "anime") && (
                            <div className="mt-1.5 sm:mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-input bg-surface-soft text-[11px] sm:text-xs font-semibold text-ink">
                              <span>Progres:</span>
                              <span className="font-bold text-teal-600 tabular-nums">
                                Ep {featuredTitle.episodeCurrent} /{" "}
                                {featuredTitle.episodeTotal ?? "∞"}
                              </span>
                            </div>
                          )}

                          {/* Short Note Preview */}
                          {featuredTitle.notes ? (
                            <p className="mt-1.5 sm:mt-2 text-xs text-ink-muted line-clamp-2 leading-relaxed">
                              {featuredTitle.notes.length > 95
                                ? `${featuredTitle.notes.slice(0, 95).trim()}...`
                                : featuredTitle.notes}
                            </p>
                          ) : (
                            <p className="mt-1.5 sm:mt-2 text-xs text-ink-muted line-clamp-2">
                              Klik detail untuk memperbarui progres atau membuka link streaming.
                            </p>
                          )}
                        </div>

                        {/* Desktop Quick Watch Link & Detail CTA */}
                        <div className="hidden sm:flex mt-4 pt-3 border-t border-line flex-wrap items-center gap-2">
                          {featuredTitle.links[0] && (
                            <a
                              href={featuredTitle.links[0].url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="min-h-10 px-4 rounded-pill bg-cta-gradient text-ink text-xs font-bold inline-flex items-center gap-1.5 shadow-xs hover:opacity-95 active:scale-95 transition"
                            >
                              <span>Tonton di {featuredTitle.links[0].label}</span>
                              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedTitleId(featuredTitle.id)}
                            className="min-h-10 px-4 rounded-pill bg-ink text-surface text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs hover:bg-teal-600 active:scale-95 cursor-pointer transition"
                          >
                            <span>Detail & Catatan</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Mobile Full-Width CTA Row */}
                    <div className="flex sm:hidden pt-2.5 border-t border-line items-center gap-2">
                      {featuredTitle.links[0] && (
                        <a
                          href={featuredTitle.links[0].url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 min-h-10 px-3 rounded-pill bg-cta-gradient text-ink text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition truncate"
                        >
                          <span className="truncate">
                            Tonton ({featuredTitle.links[0].label})
                          </span>
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedTitleId(featuredTitle.id)}
                        className="flex-1 min-h-10 px-3 rounded-pill bg-ink text-surface text-xs font-semibold inline-flex items-center justify-center gap-1.5 shadow-xs active:scale-95 cursor-pointer transition"
                      >
                        <span>Detail & Catatan</span>
                      </button>
                    </div>
                  </div>

                  {/* Carousel indicator dots with smooth progress fill */}
                  {spotlightPool.length > 1 && (
                    <div
                      role="tablist"
                      aria-label="Pilih judul sorotan"
                      className="flex items-center justify-center gap-1.5 mt-2.5"
                    >
                      {spotlightPool.map((item, idx) => {
                        const active = idx === safeSpotlightIndex;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            aria-label={`Sorotan ${idx + 1}: ${item.name}`}
                            onClick={() => setSpotlightIndex(idx)}
                            className="py-1.5 px-1 cursor-pointer focus-visible:outline-none"
                          >
                            <span
                              className={`relative block h-2 rounded-pill overflow-hidden transition-all duration-300 ${
                                active
                                  ? "w-8 bg-surface/50 shadow-xs"
                                  : "w-2 bg-surface/60 hover:bg-surface"
                              }`}
                            >
                              {active && (
                                <span
                                  key={`${featuredTitle.id}-${spotlightPaused ? "paused" : "run"}`}
                                  className={`block h-full w-full rounded-pill bg-teal-400 ${
                                    spotlightPaused ? "" : "animate-spotlight-bar"
                                  }`}
                                />
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mx-auto flex flex-col items-center justify-center py-6 px-6 rounded-card bg-surface/90 backdrop-blur-xs shadow-card max-w-xs text-center">
                  <div className="w-12 h-12 rounded-pill bg-teal-400/30 text-ink flex items-center justify-center mb-2">
                    <Film className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <p className="text-sm font-bold text-ink">Belum Ada Sorotan</p>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Tambahkan judul pertama Anda untuk melihat sorotan koleksi di sini.
                  </p>
                </div>
              )}
            </div>

            {/* Bottom StatCards: Sedang ditonton & Total judul */}
            <div className="relative z-10 grid grid-cols-2 gap-3">
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
        )}

        {/* RIGHT PANEL (50% on desktop or 100% when spotlight is minimized): STATS, FILTER & PILL LIST */}
        <section
          aria-label="Panel Watchlist"
          className={`w-full ${
            spotlightMinimized
              ? "flex-1"
              : "lg:w-1/2 lg:flex-1 lg:h-full lg:overflow-hidden"
          } rounded-panel bg-surface shadow-card p-5 sm:p-7 flex flex-col border border-line/60 transition-all duration-300`}
        >
        {bannerError && (
          <div
            role="alert"
            className="mb-3 p-3 rounded-input bg-error-bg text-status-dropped-fg text-xs font-medium flex items-center justify-between gap-2 shrink-0"
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
          <div
            className={`flex flex-col flex-1 ${
              spotlightMinimized ? "" : "min-h-0"
            } animate-panel-in`}
          >
            {/* Dynamic Top Header + Interactive Statistics Block */}
            <div
              className={`pb-4 border-b border-line ${
                spotlightMinimized ? "" : "shrink-0"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-xl sm:text-2xl font-bold uppercase tracking-[0.04em] text-ink">
                    Watchlist {currentYear}
                  </h1>
                  {typeFilter !== "all" && (
                    <span className="px-2.5 py-0.5 rounded-pill bg-teal-400/25 text-ink text-xs font-bold">
                      {TYPE_LABELS[typeFilter]}
                    </span>
                  )}
                  {statusFilter !== "all" && (
                    <span className="px-2.5 py-0.5 rounded-pill bg-ink text-surface text-xs font-semibold">
                      Filter: {STATUS_LABELS[statusFilter]}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {hasActiveFilter && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setStatusFilter("all");
                        setTypeFilter("all");
                      }}
                      className="px-3 py-1 rounded-pill bg-teal-400/25 hover:bg-teal-400/40 text-xs font-bold text-ink cursor-pointer transition"
                    >
                      Reset Filter
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSpotlightMinimized((v) => !v)}
                    className="px-3 py-1 rounded-pill bg-surface-soft hover:bg-line/70 text-xs font-semibold text-ink inline-flex items-center gap-1.5 cursor-pointer transition"
                  >
                    {spotlightMinimized ? (
                      <>
                        <Maximize2 className="w-3.5 h-3.5 text-teal-600" aria-hidden="true" />
                        <span>Normalkan Sorotan</span>
                      </>
                    ) : (
                      <>
                        <Minimize2 className="w-3.5 h-3.5 text-teal-600" aria-hidden="true" />
                        <span>Minimize Sorotan</span>
                      </>
                    )}
                  </button>
                  <span className="px-3 py-1 rounded-pill bg-surface-soft text-xs font-semibold text-ink-muted tabular-nums">
                    {filteredTitles.length} dari {stats.total} judul
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                {/* Interactive Big Numbers: Click to filter by Selesai or Rencana */}
                <div className="grid grid-cols-2 gap-3 flex-1 max-w-sm">
                  <button
                    type="button"
                    onClick={() => toggleStatusFilter("completed")}
                    aria-pressed={statusFilter === "completed"}
                    title="Klik untuk memfilter judul yang Selesai ditonton"
                    className={`group text-left rounded-input p-2.5 -m-1 transition cursor-pointer ${
                      statusFilter === "completed"
                        ? "bg-teal-400/20 ring-2 ring-teal-500"
                        : "hover:bg-surface-soft"
                    }`}
                  >
                    <span className="flex items-center justify-between text-[11px] font-bold text-ink-muted group-hover:text-ink uppercase tracking-wider">
                      <span>Selesai</span>
                      <span className="text-[10px] text-teal-600 opacity-0 group-hover:opacity-100 transition">
                        {statusFilter === "completed" ? "Aktif" : "Filter"}
                      </span>
                    </span>
                    <span
                      data-testid="stat-completed"
                      className="block text-4xl sm:text-5xl font-bold text-ink leading-none mt-1 tabular-nums transition-transform duration-150 group-hover:translate-x-0.5"
                    >
                      {scopedStats.completed}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleStatusFilter("planned")}
                    aria-pressed={statusFilter === "planned"}
                    title="Klik untuk memfilter judul dalam Rencana tontonan"
                    className={`group text-left rounded-input p-2.5 -m-1 transition cursor-pointer ${
                      statusFilter === "planned"
                        ? "bg-teal-400/20 ring-2 ring-teal-500"
                        : "hover:bg-surface-soft"
                    }`}
                  >
                    <span className="flex items-center justify-between text-[11px] font-bold text-ink-muted group-hover:text-ink uppercase tracking-wider">
                      <span>Rencana</span>
                      <span className="text-[10px] text-teal-600 opacity-0 group-hover:opacity-100 transition">
                        {statusFilter === "planned" ? "Aktif" : "Filter"}
                      </span>
                    </span>
                    <span
                      data-testid="stat-planned"
                      className="block text-4xl sm:text-5xl font-bold text-ink leading-none mt-1 tabular-nums transition-transform duration-150 group-hover:translate-x-0.5"
                    >
                      {scopedStats.planned}
                    </span>
                  </button>
                </div>

                {/* Interactive Status Chips: Click to filter by Menonton, Ditahan, or Dibuang */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    data-testid="chip-watching"
                    onClick={() => toggleStatusFilter("watching")}
                    aria-pressed={statusFilter === "watching"}
                    title="Klik untuk memfilter judul yang sedang ditonton"
                    className={`px-3 py-1.5 rounded-pill text-xs font-semibold cursor-pointer transition active:scale-95 ${
                      STATUS_STYLES.watching
                    } ${
                      statusFilter === "watching"
                        ? "ring-2 ring-ink shadow-xs font-bold"
                        : "hover:opacity-85"
                    }`}
                  >
                    Menonton: {scopedStats.watching}
                  </button>
                  <button
                    type="button"
                    data-testid="chip-on_hold"
                    onClick={() => toggleStatusFilter("on_hold")}
                    aria-pressed={statusFilter === "on_hold"}
                    title="Klik untuk memfilter judul yang ditahan"
                    className={`px-3 py-1.5 rounded-pill text-xs font-semibold cursor-pointer transition active:scale-95 ${
                      STATUS_STYLES.on_hold
                    } ${
                      statusFilter === "on_hold"
                        ? "ring-2 ring-ink shadow-xs font-bold"
                        : "hover:opacity-85"
                    }`}
                  >
                    Ditahan: {scopedStats.on_hold}
                  </button>
                  <button
                    type="button"
                    data-testid="chip-dropped"
                    onClick={() => toggleStatusFilter("dropped")}
                    aria-pressed={statusFilter === "dropped"}
                    title="Klik untuk memfilter judul yang dibuang"
                    className={`px-3 py-1.5 rounded-pill text-xs font-semibold cursor-pointer transition active:scale-95 ${
                      STATUS_STYLES.dropped
                    } ${
                      statusFilter === "dropped"
                        ? "ring-2 ring-ink shadow-xs font-bold"
                        : "hover:opacity-85"
                    }`}
                  >
                    Dibuang: {scopedStats.dropped}
                  </button>
                </div>
              </div>
            </div>

            {/* Streamlined Search, Type & Sort Row + Status Chips (PRD F7, DESIGN.md §6.6) */}
            <div
              className={`mt-3 space-y-2.5 ${
                spotlightMinimized ? "" : "shrink-0"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="relative w-full sm:flex-1 min-w-0">
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
                    placeholder="Cari film, serial, anime..."
                    className="w-full h-10 sm:h-11 pl-10 pr-3.5 rounded-input bg-surface-soft text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-teal-600 transition"
                  />
                </div>

                <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
                  <div className="min-w-0">
                    <label htmlFor="watchlist-type" className="sr-only">
                      Filter tipe tontonan
                    </label>
                    <select
                      id="watchlist-type"
                      value={typeFilter}
                      onChange={(e) =>
                        setTypeFilter(e.target.value as TitleTypeValue | "all")
                      }
                      className="w-full h-10 sm:h-11 px-3 rounded-input bg-surface-soft text-xs font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-teal-600 cursor-pointer"
                    >
                      <option value="all">Semua Tipe</option>
                      <option value="movie">{TYPE_LABELS.movie}</option>
                      <option value="series">{TYPE_LABELS.series}</option>
                      <option value="anime">{TYPE_LABELS.anime}</option>
                    </select>
                  </div>

                  <div className="min-w-0">
                    <label htmlFor="watchlist-sort" className="sr-only">
                      Urutkan berdasarkan
                    </label>
                    <select
                      id="watchlist-sort"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortKey)}
                      className="w-full h-10 sm:h-11 px-3 rounded-input bg-surface-soft text-xs font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-teal-600 cursor-pointer"
                    >
                      <option value="updated_at">Terbaru Diubah</option>
                      <option value="name">Judul (A–Z)</option>
                      <option value="rating">Rating Tertinggi</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Status filter chips with live dynamic counts */}
              <div
                role="group"
                aria-label="Filter status"
                className="flex items-center gap-1.5 overflow-x-auto pb-1"
              >
                {(
                  [
                    { key: "all", label: "Semua", count: scopedStats.total },
                    {
                      key: "watching",
                      label: STATUS_LABELS.watching,
                      count: scopedStats.watching,
                    },
                    {
                      key: "planned",
                      label: STATUS_LABELS.planned,
                      count: scopedStats.planned,
                    },
                    {
                      key: "completed",
                      label: STATUS_LABELS.completed,
                      count: scopedStats.completed,
                    },
                    {
                      key: "on_hold",
                      label: STATUS_LABELS.on_hold,
                      count: scopedStats.on_hold,
                    },
                    {
                      key: "dropped",
                      label: STATUS_LABELS.dropped,
                      count: scopedStats.dropped,
                    },
                  ] as const
                ).map((item) => {
                  const active = statusFilter === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setStatusFilter(item.key)}
                      className={`min-h-10 px-3.5 rounded-pill text-xs font-semibold whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 transition ${
                        active
                          ? "bg-ink text-surface shadow-xs"
                          : "bg-surface-soft text-ink-muted hover:text-ink"
                      }`}
                    >
                      <span>{item.label}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-pill text-[11px] tabular-nums ${
                          active
                            ? "bg-surface/20 text-surface font-bold"
                            : "bg-surface text-ink-muted"
                        }`}
                      >
                        {item.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pill List Area — scrolls inside panel when Spotlight is normal (static header), or scrolls naturally with the page when Spotlight is minimized */}
            <div
              className={`mt-3 flex-1 ${
                spotlightMinimized
                  ? filteredTitles.length > 0
                    ? "grid grid-cols-1 lg:grid-cols-2 gap-x-4 gap-y-2.5 content-start pb-2"
                    : "pb-2"
                  : "lg:overflow-y-auto pr-1 pb-4 space-y-2.5"
              }`}
            >
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
                filteredTitles.map((title, idx) => (
                  <TitleRow
                    key={title.id}
                    index={idx}
                    title={title}
                    selected={selectedTitleId === title.id}
                    busy={busy}
                    isMutating={mutatingTitleId === title.id}
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
                className="w-full h-14 rounded-pill bg-cta-gradient text-ink font-semibold text-base flex items-center justify-between px-6 shadow-card hover:shadow-hero hover:-translate-y-0.5 active:scale-[0.99] cursor-pointer focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-teal-600 focus-visible:ring-offset-2 transition-all duration-200"
              >
                <span>Tambah Judul</span>
                <span className="w-9 h-9 rounded-pill bg-ink text-surface flex items-center justify-center">
                  <Plus className="w-5 h-5" aria-hidden="true" />
                </span>
              </button>
            </div>
          </div>
        )}
        </section>
      </div>

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
