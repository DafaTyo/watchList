"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
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

  // User menu & error banner
  const [menuOpen, setMenuOpen] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    <div className="min-h-dvh lg:h-dvh w-full max-w-[1440px] mx-auto p-3 sm:p-4 lg:p-6 flex flex-col lg:flex-row gap-4 lg:gap-6 overflow-x-hidden">
      {/* LEFT PANEL (50% on desktop): HERO VISUAL & ROTATING SPOTLIGHT */}
      <section
        aria-label="Sorotan Watchlist"
        onMouseEnter={() => setSpotlightPaused(true)}
        onMouseLeave={() => setSpotlightPaused(false)}
        className="relative w-full lg:w-1/2 lg:flex-1 rounded-panel bg-hero-gradient shadow-hero p-5 sm:p-7 flex flex-col justify-between min-h-[260px] md:min-h-[320px] lg:min-h-0 overflow-hidden"
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

        {/* Center: Rotating Featured Title Spotlight or Empty Hero Illustration */}
        <div className="relative z-10 my-3 md:my-5 flex flex-col items-center justify-center text-center">
          {featuredTitle ? (
            <div
              key={featuredTitle.id}
              className="w-full max-w-lg flex flex-col items-center transition-opacity duration-200"
            >
              {/* Main Spotlight Card */}
              <div className="flex flex-row md:flex-col items-center gap-4 md:gap-4 w-full bg-surface/20 md:bg-transparent backdrop-blur-xs md:backdrop-blur-none p-3.5 md:p-0 rounded-card">
                <div className="relative flex items-center justify-center">
                  {spotlightPool.length > 1 && (
                    <button
                      type="button"
                      onClick={prevSpotlight}
                      aria-label="Sorotan sebelumnya"
                      className="hidden md:flex absolute -left-14 top-1/2 -translate-y-1/2 w-11 h-11 rounded-pill bg-surface/85 hover:bg-surface text-ink shadow-card items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 transition"
                    >
                      <ChevronLeft className="w-5 h-5" aria-hidden="true" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedTitleId(featuredTitle.id)}
                    aria-label={`Lihat detail sorotan: ${featuredTitle.name}`}
                    className="group relative rounded-card overflow-hidden shadow-hero border-2 border-surface/60 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-teal-400 transition hover:scale-[1.01]"
                  >
                    <PosterImage
                      posterUrl={featuredTitle.posterUrl}
                      name={featuredTitle.name}
                      className="w-24 h-36 sm:w-32 sm:h-44 lg:w-52 lg:h-72 rounded-card"
                      fallbackTextClassName="text-2xl lg:text-4xl font-bold"
                    />
                  </button>

                  {spotlightPool.length > 1 && (
                    <button
                      type="button"
                      onClick={nextSpotlight}
                      aria-label="Sorotan berikutnya"
                      className="hidden md:flex absolute -right-14 top-1/2 -translate-y-1/2 w-11 h-11 rounded-pill bg-surface/85 hover:bg-surface text-ink shadow-card items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 transition"
                    >
                      <ChevronRight className="w-5 h-5" aria-hidden="true" />
                    </button>
                  )}
                </div>

                {/* Title Info & Quick Actions */}
                <div className="text-left md:text-center min-w-0 flex-1 md:flex-initial flex flex-col items-start md:items-center">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-surface/95 text-ink text-xs font-semibold shadow-xs mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-teal-600" aria-hidden="true" />
                    <span>
                      Sorotan {safeSpotlightIndex + 1}/{spotlightPool.length}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{STATUS_LABELS[featuredTitle.status as TitleStatusValue]}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedTitleId(featuredTitle.id)}
                    className="text-left md:text-center group cursor-pointer focus-visible:outline-none"
                  >
                    <h2 className="text-base sm:text-xl lg:text-2xl font-bold text-ink bg-surface/95 px-4 py-1.5 rounded-pill shadow-xs truncate max-w-[230px] sm:max-w-sm lg:max-w-md group-hover:text-teal-600 transition">
                      {featuredTitle.name}
                    </h2>
                  </button>

                  <div className="mt-2 inline-flex flex-wrap items-center gap-2 text-xs sm:text-[13px] font-semibold text-ink bg-surface/90 px-3.5 py-1 rounded-pill shadow-xs">
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
                            className="w-3.5 h-3.5 text-orange-500 fill-orange-500"
                            aria-hidden="true"
                          />
                          {featuredTitle.rating}/10
                        </span>
                      </>
                    )}
                  </div>

                  {/* Quick Watch Link or Open Detail CTA */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    {featuredTitle.links[0] && (
                      <a
                        href={featuredTitle.links[0].url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-11 px-4 rounded-pill bg-cta-gradient text-ink text-xs font-bold inline-flex items-center gap-1.5 shadow-card hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 transition"
                      >
                        <span>Tonton di {featuredTitle.links[0].label}</span>
                        <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedTitleId(featuredTitle.id)}
                      className="min-h-11 px-4 rounded-pill bg-ink text-surface text-xs font-semibold inline-flex items-center gap-1.5 shadow-card hover:bg-teal-600 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 transition"
                    >
                      <span>Detail & Catatan</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Carousel indicator dots */}
              {spotlightPool.length > 1 && (
                <div
                  role="tablist"
                  aria-label="Pilih judul sorotan"
                  className="flex items-center justify-center gap-1.5 mt-3"
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
                        className="py-2 px-1 cursor-pointer focus-visible:outline-none"
                      >
                        <span
                          className={`block h-2 rounded-pill transition-all duration-200 ${
                            active
                              ? "w-7 bg-teal-400 shadow-xs"
                              : "w-2 bg-surface/60 hover:bg-surface"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-5 px-6 rounded-card bg-surface/85 backdrop-blur-xs shadow-card max-w-xs">
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

      {/* RIGHT PANEL (50% on desktop): STATS, FILTER & PILL LIST (DESIGN.md §5–§6) */}
      <section
        aria-label="Panel Watchlist"
        className="w-full lg:w-1/2 lg:flex-1 rounded-panel bg-surface shadow-card p-5 sm:p-7 flex flex-col lg:h-full lg:overflow-hidden border border-line/60"
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
          <>
            {/* Compact Top Header + Big Statistics Block so the list gets much more vertical room */}
            <div className="pb-3.5 border-b border-line shrink-0">
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <h1 className="font-display text-xl sm:text-2xl font-bold uppercase tracking-[0.04em] text-ink">
                  Watchlist {currentYear}
                </h1>
                <span className="px-3 py-1 rounded-pill bg-surface-soft text-xs font-semibold text-ink-muted">
                  {filteredTitles.length} dari {stats.total} judul
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                {/* Two Big Numbers: Selesai | Rencana */}
                <div className="grid grid-cols-2 divide-x divide-line flex-1 max-w-xs">
                  <div className="pr-4">
                    <span className="block text-[11px] font-medium text-ink-muted uppercase tracking-wider">
                      Selesai
                    </span>
                    <span
                      data-testid="stat-completed"
                      className="block text-4xl sm:text-5xl font-bold text-ink leading-none mt-0.5 tabular-nums transition-opacity duration-150"
                    >
                      {stats.completed}
                    </span>
                  </div>
                  <div className="pl-4">
                    <span className="block text-[11px] font-medium text-ink-muted uppercase tracking-wider">
                      Rencana
                    </span>
                    <span
                      data-testid="stat-planned"
                      className="block text-4xl sm:text-5xl font-bold text-ink leading-none mt-0.5 tabular-nums transition-opacity duration-150"
                    >
                      {stats.planned}
                    </span>
                  </div>
                </div>

                {/* Other statuses as clickable chips */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    data-testid="chip-watching"
                    className={`px-2.5 py-1 rounded-pill text-xs font-semibold ${STATUS_STYLES.watching}`}
                  >
                    Menonton: {stats.watching}
                  </span>
                  <span
                    data-testid="chip-on_hold"
                    className={`px-2.5 py-1 rounded-pill text-xs font-semibold ${STATUS_STYLES.on_hold}`}
                  >
                    Ditahan: {stats.on_hold}
                  </span>
                  <span
                    data-testid="chip-dropped"
                    className={`px-2.5 py-1 rounded-pill text-xs font-semibold ${STATUS_STYLES.dropped}`}
                  >
                    Dibuang: {stats.dropped}
                  </span>
                </div>
              </div>
            </div>

            {/* Streamlined Search, Type & Sort Row + Status Chips (PRD F7, DESIGN.md §6.6) */}
            <div className="mt-3 space-y-2 shrink-0">
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                <div className="relative flex-1 min-w-[160px]">
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
                    className="w-full h-11 pl-10 pr-3.5 rounded-input bg-surface-soft text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-teal-600 transition"
                  />
                </div>

                <div>
                  <label htmlFor="watchlist-type" className="sr-only">
                    Filter tipe tontonan
                  </label>
                  <select
                    id="watchlist-type"
                    value={typeFilter}
                    onChange={(e) =>
                      setTypeFilter(e.target.value as TitleTypeValue | "all")
                    }
                    className="h-11 px-3 rounded-input bg-surface-soft text-xs font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-teal-600 cursor-pointer"
                  >
                    <option value="all">Semua Tipe</option>
                    <option value="movie">{TYPE_LABELS.movie}</option>
                    <option value="series">{TYPE_LABELS.series}</option>
                    <option value="anime">{TYPE_LABELS.anime}</option>
                  </select>
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

              {/* Status filter chips (single horizontal row) */}
              <div
                role="group"
                aria-label="Filter status"
                className="flex items-center gap-1.5 overflow-x-auto pb-1"
              >
                {(
                  [
                    { key: "all", label: "Semua" },
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
            </div>

            {/* Pill List Area — now wider and taller */}
            <div className="mt-2.5 flex-1 lg:overflow-y-auto space-y-2.5 pr-1 pb-4">
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
