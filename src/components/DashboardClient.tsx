"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  Compass,
  Film,
  Flame,
  ListVideo,
  Loader2,
  LogOut,
  Menu,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Tv,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { logoutAction } from "@/actions/auth";
import { createTitleAction } from "@/actions/titles";
import { createWatchLinkAction } from "@/actions/links";
import {
  discoverTmdbAction,
  getTmdbDetailsAction,
  searchTmdbAction,
} from "@/actions/tmdb";
import type { SessionUser } from "@/lib/session";
import type { TitleWithLinks } from "@/lib/services/titles";
import type {
  TmdbDashboardCategory,
  TmdbGenre,
  TmdbMediaItem,
} from "@/lib/tmdb";
import type { TitleInput } from "@/lib/validators";
import { PosterImage } from "./PosterImage";
import { TYPE_LABELS } from "./StatusBadge";
import { TitleDialog, type TitlePrefill } from "./TitleDialog";
import type { DraftLink } from "./LinkList";

type DashboardClientProps = {
  user: SessionUser;
  initialItems: TmdbMediaItem[];
  initialGenres: TmdbGenre[];
  initialConfigured: boolean;
  existingTitles: TitleWithLinks[];
};

const CATEGORY_TABS: {
  key: TmdbDashboardCategory;
  label: string;
}[] = [
  { key: "trending", label: "Tren Minggu Ini" },
  { key: "popular_movies", label: "Rekomendasi Film" },
  { key: "top_rated", label: "Rating Tertinggi" },
  { key: "popular_tv", label: "Serial & Anime" },
  { key: "now_playing", label: "Sedang Tayang" },
];

function truncateText(text: string, maxChars: number): string {
  const cleaned = text.trim();
  if (cleaned.length <= maxChars) return cleaned;
  const sliced = cleaned.slice(0, maxChars);
  const lastSpace = sliced.lastIndexOf(" ");
  return `${(lastSpace > 40 ? sliced.slice(0, lastSpace) : sliced).trim()}...`;
}

export function DashboardClient({
  user,
  initialItems,
  initialGenres,
  initialConfigured,
  existingTitles,
}: DashboardClientProps) {
  const router = useRouter();
  const [items, setItems] = useState<TmdbMediaItem[]>(initialItems);
  const [genres] = useState<TmdbGenre[]>(initialGenres);
  const [configured, setConfigured] = useState(initialConfigured);
  const [watchlistTitles, setWatchlistTitles] =
    useState<TitleWithLinks[]>(existingTitles);

  // Filter & Search state
  const [category, setCategory] = useState<TmdbDashboardCategory>("trending");
  const [selectedGenreId, setSelectedGenreId] = useState<number | null>(null);
  const [mediaTypeFilter, setMediaTypeFilter] = useState<
    "all" | "movie" | "tv"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingFeed, setLoadingFeed] = useState(false);

  // Hero spotlight state
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);

  // Quick-add & Dialog state
  const [addingKey, setAddingKey] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogPrefill, setDialogPrefill] = useState<TitlePrefill | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Account menu
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Set of lowercase title names already in the user's watchlist
  const watchlistNameSet = useMemo(() => {
    return new Set(
      watchlistTitles.map((t) => t.name.trim().toLowerCase())
    );
  }, [watchlistTitles]);

  const heroPool = useMemo(() => items.slice(0, 6), [items]);
  const safeHeroIndex =
    heroPool.length > 0 ? heroIndex % heroPool.length : 0;
  const heroItem = heroPool[safeHeroIndex] ?? null;

  // Auto-rotate hero every 6 seconds
  useEffect(() => {
    if (heroPool.length <= 1 || heroPaused) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const timer = window.setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroPool.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [heroPool.length, heroPaused]);

  // Fetch TMDB recommendations when category, genre, mediaType, or searchQuery changes
  const isInitialMountRef = useRef(true);
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }

    const q = searchQuery.trim();
    let cancelled = false;

    async function load() {
      setLoadingFeed(true);
      try {
        if (q.length >= 2) {
          const data = await searchTmdbAction(q);
          if (cancelled) return;
          let list = data.items ?? [];
          if (selectedGenreId) {
            list = list.filter((i) => i.genreIds.includes(selectedGenreId));
          }
          if (mediaTypeFilter !== "all") {
            list = list.filter((i) => i.mediaType === mediaTypeFilter);
          }
          setItems(list);
          setConfigured(data.configured);
          setHeroIndex(0);
        } else {
          const data = await discoverTmdbAction({
            category,
            genreId: selectedGenreId,
            mediaType: mediaTypeFilter,
          });
          if (cancelled) return;
          setItems(data.items ?? []);
          setConfigured(data.configured);
          setHeroIndex(0);
        }
      } catch {
        // Ignore errors
      } finally {
        if (!cancelled) {
          setLoadingFeed(false);
        }
      }
    }

    const debounceMs = q.length >= 2 ? 260 : 10;
    const timer = window.setTimeout(() => {
      void load();
    }, debounceMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [category, selectedGenreId, mediaTypeFilter, searchQuery]);

  function showToast(msg: string) {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
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

  async function handleQuickAddToWatchlist(item: TmdbMediaItem) {
    const key = `${item.mediaType}-${item.tmdbId}`;
    if (addingKey === key) return;
    setAddingKey(key);

    let episodeTotal = item.episodeTotal ?? null;
    if (item.mediaType === "tv" && episodeTotal == null) {
      try {
        const detailed = await getTmdbDetailsAction("tv", item.tmdbId);
        episodeTotal = detailed?.episodeTotal ?? null;
      } catch {
        // ignore
      }
    }

    const res = await createTitleAction({
      name: item.title,
      type: item.appType,
      status: "planned",
      year: item.year,
      rating: item.rating,
      posterUrl: item.posterUrl,
      episodeCurrent: 0,
      episodeTotal:
        item.appType === "series" || item.appType === "anime"
          ? episodeTotal
          : null,
      notes: item.overview ? item.overview.slice(0, 2000) : null,
    });

    setAddingKey(null);
    if (!res.ok) {
      showToast(res.error || "Gagal menambahkan ke Watchlist.");
      return;
    }

    setWatchlistTitles((prev) => [res.data, ...prev]);
    showToast(`"${item.title}" berhasil ditambahkan ke Watchlist!`);
    router.refresh();
  }

  function openCustomDialogForItem(item?: TmdbMediaItem) {
    if (item) {
      setDialogPrefill({
        name: item.title,
        type: item.appType,
        status: "planned",
        year: item.year,
        rating: item.rating,
        posterUrl: item.posterUrl,
        episodeTotal: item.episodeTotal ?? null,
        notes: item.overview ? item.overview.slice(0, 2000) : null,
      });
    } else {
      setDialogPrefill(null);
    }
    setDialogOpen(true);
  }

  async function handleSaveCreate(
    input: TitleInput,
    draftLinks: DraftLink[]
  ): Promise<{ ok: boolean; error?: string; field?: string }> {
    const res = await createTitleAction(input);
    if (!res.ok) return res;

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

    setWatchlistTitles((prev) => [finalTitle, ...prev]);
    showToast(`"${finalTitle.name}" berhasil disimpan ke Watchlist!`);
    router.refresh();
    return { ok: true };
  }

  const activeGenreName = useMemo(() => {
    if (!selectedGenreId) return null;
    return genres.find((g) => g.id === selectedGenreId)?.name ?? null;
  }, [genres, selectedGenreId]);

  return (
    <div className="min-h-dvh w-full max-w-[1440px] mx-auto p-3 sm:p-4 lg:p-6 space-y-5 overflow-x-hidden">
      {/* TOP NAVIGATION HEADER */}
      <header className="rounded-card bg-surface shadow-card border border-line/60 px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-icon bg-ink text-surface flex items-center justify-center shadow-xs shrink-0"
            aria-label="Nixtio Watch"
          >
            <Film className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <span className="font-display text-base sm:text-lg font-bold uppercase tracking-wider text-ink block leading-none">
              Nixtio Watch
            </span>
            <span className="text-xs text-ink-muted">
              Eksplorasi & Rekomendasi TMDB
            </span>
          </div>
        </div>

        {/* Navigation Switcher: Dashboard vs Watchlist */}
        <nav
          aria-label="Navigasi utama"
          className="flex items-center gap-1.5 bg-surface-soft p-1.5 rounded-pill border border-line"
        >
          <Link
            href="/dashboard"
            aria-current="page"
            className="min-h-10 px-4 rounded-pill bg-ink text-surface text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 shadow-xs transition"
          >
            <Compass className="w-4 h-4 text-teal-400" aria-hidden="true" />
            <span>Dashboard</span>
          </Link>
          <Link
            href="/watchlist"
            className="min-h-10 px-4 rounded-pill text-ink-muted hover:text-ink hover:bg-surface text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 transition"
          >
            <ListVideo className="w-4 h-4" aria-hidden="true" />
            <span>Watchlist Saya</span>
            <span className="px-2 py-0.5 rounded-pill bg-teal-400/25 text-ink text-[11px] font-bold">
              {watchlistTitles.length}
            </span>
          </Link>
        </nav>

        {/* Right Actions: Quick Add + Account Menu */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => openCustomDialogForItem()}
            className="min-h-11 px-4 rounded-pill bg-cta-gradient text-ink text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 shadow-card hover:opacity-95 active:scale-95 cursor-pointer transition"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Tambah Watchlist</span>
          </button>

          <div className="relative z-30">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-label="Menu akun"
              className="relative z-40 w-11 h-11 rounded-icon bg-surface-soft border border-line text-ink flex items-center justify-center hover:bg-line/50 cursor-pointer transition"
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
                  <button
                    type="button"
                    role="menuitem"
                    disabled={loggingOut}
                    onClick={handleLogout}
                    className="w-full min-h-11 px-3 rounded-pill text-xs font-semibold text-red-500 hover:bg-error-bg disabled:opacity-60 flex items-center gap-2 cursor-pointer transition"
                  >
                    {loggingOut ? (
                      <Loader2
                        className="w-4 h-4 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <LogOut className="w-4 h-4" aria-hidden="true" />
                    )}
                    <span>
                      {loggingOut ? "Keluar..." : "Keluar dari Akun"}
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-pill bg-ink text-surface text-xs sm:text-sm font-semibold shadow-hero flex items-center gap-2.5 animate-dialog-in"
        >
          <Sparkles className="w-4 h-4 text-teal-400 shrink-0" aria-hidden="true" />
          <span>{toastMessage}</span>
          <Link
            href="/watchlist"
            className="ml-2 px-3 py-1 rounded-pill bg-teal-500 text-ink text-xs font-bold hover:bg-teal-400 transition"
          >
            Lihat Watchlist
          </Link>
        </div>
      )}

      {/* HERO RECOMMENDATION SPOTLIGHT */}
      {heroItem && (
        <section
          aria-label="Rekomendasi Utama TMDB"
          onMouseEnter={() => setHeroPaused(true)}
          onMouseLeave={() => setHeroPaused(false)}
          className="relative rounded-panel bg-hero-gradient shadow-hero p-5 sm:p-6 overflow-hidden space-y-3"
        >
          {/* Top Bar inside Hero Panel */}
          <div className="relative z-10 flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-pill bg-surface/95 text-ink text-xs font-bold shadow-xs">
                <Flame
                  className="w-3.5 h-3.5 text-orange-500"
                  aria-hidden="true"
                />
                <span>
                  Sorotan Rekomendasi #{safeHeroIndex + 1} dari{" "}
                  {heroPool.length}
                </span>
              </span>
              <span className="hidden sm:inline-block px-3 py-1 rounded-pill bg-ink/80 text-surface text-[11px] font-semibold">
                {configured ? "TMDB API Live" : "Katalog TMDB"} ·{" "}
                {heroPaused ? "Dijeda" : "Otomatis 6 dtk"}
              </span>
            </div>

            {heroPool.length > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setHeroIndex(
                      (prev) => (prev - 1 + heroPool.length) % heroPool.length
                    )
                  }
                  aria-label="Rekomendasi sebelumnya"
                  className="w-9 h-9 rounded-pill bg-surface/90 hover:bg-surface active:scale-95 text-ink shadow-xs flex items-center justify-center cursor-pointer transition"
                >
                  <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setHeroIndex((prev) => (prev + 1) % heroPool.length)
                  }
                  aria-label="Rekomendasi berikutnya"
                  className="w-9 h-9 rounded-pill bg-surface/90 hover:bg-surface active:scale-95 text-ink shadow-xs flex items-center justify-center cursor-pointer transition"
                >
                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>

          {/* Unified Clean Spotlight Card */}
          <div
            key={`${heroItem.mediaType}-${heroItem.tmdbId}`}
            className="relative z-10 rounded-card bg-surface/95 backdrop-blur-xs shadow-hero border border-surface p-4 sm:p-6 flex flex-col md:flex-row items-center md:items-stretch gap-5 sm:gap-6 animate-spotlight-in"
          >
            {/* Left: Poster Cover */}
            <div className="relative shrink-0">
              <PosterImage
                posterUrl={heroItem.posterUrl}
                name={heroItem.title}
                className="w-36 h-52 sm:w-44 sm:h-64 rounded-card shadow-card border border-line"
                fallbackTextClassName="text-3xl font-bold"
              />
              {heroItem.voteAverage > 0 && (
                <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-pill bg-ink/90 text-surface text-xs font-bold shadow-xs inline-flex items-center gap-1">
                  <Star
                    className="w-3.5 h-3.5 text-orange-500 fill-orange-500"
                    aria-hidden="true"
                  />
                  <span>{heroItem.voteAverage}</span>
                </div>
              )}
            </div>

            {/* Right: Structured Details */}
            <div className="flex-1 min-w-0 w-full flex flex-col justify-between text-center md:text-left">
              <div className="space-y-2.5">
                {/* Type, Year & Genre Badges */}
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5">
                  <span className="px-3 py-1 rounded-pill bg-ink text-surface text-xs font-bold">
                    {TYPE_LABELS[heroItem.appType]}
                  </span>
                  {heroItem.year && (
                    <span className="px-3 py-1 rounded-pill bg-surface-soft text-ink text-xs font-semibold border border-line">
                      {heroItem.year}
                    </span>
                  )}
                  {heroItem.genreNames.slice(0, 3).map((gName) => (
                    <span
                      key={gName}
                      className="px-3 py-1 rounded-pill bg-teal-400/20 text-ink text-xs font-semibold"
                    >
                      {gName}
                    </span>
                  ))}
                </div>

                {/* Title */}
                <h1 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold text-ink line-clamp-2">
                  {heroItem.title}
                </h1>

                {/* Concise Overview (max ~125 chars) */}
                {heroItem.overview && (
                  <p className="text-xs sm:text-sm text-ink-muted max-w-2xl line-clamp-2 leading-relaxed mx-auto md:mx-0">
                    {truncateText(heroItem.overview, 125)}
                  </p>
                )}
              </div>

              {/* CTA Buttons */}
              <div className="mt-4 pt-3 border-t border-line flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                {watchlistNameSet.has(heroItem.title.trim().toLowerCase()) ? (
                  <Link
                    href="/watchlist"
                    className="min-h-10 px-5 rounded-pill bg-teal-400/20 text-ink text-xs sm:text-sm font-bold inline-flex items-center gap-2 hover:bg-teal-400/30 transition"
                  >
                    <BookmarkCheck
                      className="w-4 h-4 text-teal-600"
                      aria-hidden="true"
                    />
                    <span>Sudah di Watchlist</span>
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled={
                      addingKey === `${heroItem.mediaType}-${heroItem.tmdbId}`
                    }
                    onClick={() => void handleQuickAddToWatchlist(heroItem)}
                    className="min-h-10 px-5 rounded-pill bg-cta-gradient text-ink text-xs sm:text-sm font-bold inline-flex items-center gap-2 shadow-xs hover:opacity-95 active:scale-95 disabled:opacity-60 cursor-pointer transition"
                  >
                    {addingKey ===
                    `${heroItem.mediaType}-${heroItem.tmdbId}` ? (
                      <Loader2
                        className="w-4 h-4 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <Plus className="w-4 h-4" aria-hidden="true" />
                    )}
                    <span>Tambah ke Watchlist</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => openCustomDialogForItem(heroItem)}
                  className="min-h-10 px-5 rounded-pill bg-ink text-surface text-xs sm:text-sm font-semibold inline-flex items-center gap-2 shadow-xs hover:bg-teal-600 active:scale-95 cursor-pointer transition"
                >
                  <span>Atur Detail & Link</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* FILTER, SEARCH & GENRES SECTION */}
      <section
        aria-label="Filter Rekomendasi dan Genre"
        className="rounded-panel bg-surface shadow-card border border-line/60 p-5 sm:p-6 space-y-4"
      >
        {/* Top Row: Category Tabs + Search Input */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-line">
          <div
            role="tablist"
            aria-label="Kategori Rekomendasi"
            className="flex items-center gap-1.5 overflow-x-auto pb-1"
          >
            {CATEGORY_TABS.map((tab) => {
              const active = category === tab.key && !searchQuery.trim();
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setSearchQuery("");
                    setCategory(tab.key);
                  }}
                  className={`min-h-11 px-4 rounded-pill text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer transition ${
                    active
                      ? "bg-ink text-surface shadow-xs"
                      : "bg-surface-soft text-ink-muted hover:text-ink"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            {/* Search TMDB Input */}
            <div className="relative flex-1 sm:w-72">
              <Search
                className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <label htmlFor="tmdb-dashboard-search" className="sr-only">
                Cari film atau serial di TMDB
              </label>
              <input
                id="tmdb-dashboard-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari film, serial, anime di TMDB..."
                className="w-full h-11 pl-10 pr-4 rounded-input bg-surface-soft text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            {/* Media Type Filter */}
            <div className="flex items-center bg-surface-soft p-1 rounded-pill border border-line shrink-0">
              <button
                type="button"
                onClick={() => setMediaTypeFilter("all")}
                className={`h-9 px-3 rounded-pill text-xs font-semibold cursor-pointer transition ${
                  mediaTypeFilter === "all"
                    ? "bg-surface text-ink shadow-xs"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setMediaTypeFilter("movie")}
                className={`h-9 px-3 rounded-pill text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition ${
                  mediaTypeFilter === "movie"
                    ? "bg-surface text-ink shadow-xs"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                <Film className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Film</span>
              </button>
              <button
                type="button"
                onClick={() => setMediaTypeFilter("tv")}
                className={`h-9 px-3 rounded-pill text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition ${
                  mediaTypeFilter === "tv"
                    ? "bg-surface text-ink shadow-xs"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                <Tv className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Serial/Anime</span>
              </button>
            </div>
          </div>
        </div>

        {/* Genre Pills Row */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted inline-flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Filter Genre TMDB</span>
            </span>
            {selectedGenreId && (
              <button
                type="button"
                onClick={() => setSelectedGenreId(null)}
                className="text-xs font-semibold text-teal-600 hover:underline cursor-pointer"
              >
                Reset Genre ({activeGenreName})
              </button>
            )}
          </div>

          <div
            role="group"
            aria-label="Pilih genre"
            className="flex items-center gap-2 overflow-x-auto pb-1.5"
          >
            <button
              type="button"
              onClick={() => setSelectedGenreId(null)}
              className={`min-h-10 px-4 rounded-pill text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition ${
                selectedGenreId === null
                  ? "bg-cta-gradient text-ink font-bold shadow-xs"
                  : "bg-surface-soft text-ink-muted hover:text-ink"
              }`}
            >
              Semua Genre
            </button>
            {genres.map((g) => {
              const active = selectedGenreId === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() =>
                    setSelectedGenreId((prev) => (prev === g.id ? null : g.id))
                  }
                  className={`min-h-10 px-4 rounded-pill text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition ${
                    active
                      ? "bg-cta-gradient text-ink font-bold shadow-xs"
                      : "bg-surface-soft text-ink-muted hover:text-ink"
                  }`}
                >
                  {g.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* RECOMMENDATIONS GRID */}
        <div className="pt-2">
          {loadingFeed ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <div
                  key={n}
                  className="rounded-card bg-surface-soft/70 border border-line p-4 flex flex-col gap-3"
                >
                  <div className="w-full h-64 rounded-card skeleton-shimmer" />
                  <div className="h-5 w-3/4 rounded-pill skeleton-shimmer" />
                  <div className="h-4 w-1/2 rounded-pill skeleton-shimmer" />
                  <div className="h-10 w-full rounded-pill skeleton-shimmer mt-auto" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <p className="text-base font-bold text-ink">
                Tidak ada judul yang cocok dengan filter ini.
              </p>
              <p className="text-xs text-ink-muted">
                Coba pilih genre lain atau reset pencarian Anda.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedGenreId(null);
                  setMediaTypeFilter("all");
                }}
                className="min-h-11 px-5 rounded-pill bg-ink text-surface text-xs font-semibold cursor-pointer"
              >
                Reset Filter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {items.map((item, idx) => {
                const inWatchlist = watchlistNameSet.has(
                  item.title.trim().toLowerCase()
                );
                const itemKey = `${item.mediaType}-${item.tmdbId}`;
                const isAdding = addingKey === itemKey;

                return (
                  <article
                    key={itemKey}
                    style={{ animationDelay: `${Math.min(idx * 25, 250)}ms` }}
                    className="group rounded-card bg-surface-soft/60 hover:bg-surface border border-line hover:border-teal-500/60 shadow-xs hover:shadow-card p-3.5 flex flex-col justify-between transition-all duration-200 animate-row-in"
                  >
                    <div>
                      {/* Cover Poster */}
                      <div className="relative w-full h-64 rounded-card overflow-hidden bg-surface-soft mb-3 shadow-xs">
                        <PosterImage
                          posterUrl={item.posterUrl}
                          name={item.title}
                          className="w-full h-full transition-transform duration-300 group-hover:scale-105"
                          fallbackTextClassName="text-2xl font-bold"
                        />

                        {/* Top-left Type badge */}
                        <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-pill bg-ink/85 text-surface text-[11px] font-bold backdrop-blur-xs">
                          {TYPE_LABELS[item.appType]}
                        </span>

                        {/* Top-right Rating badge */}
                        {item.voteAverage > 0 && (
                          <span className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-pill bg-surface/95 text-ink text-xs font-bold shadow-xs inline-flex items-center gap-1">
                            <Star
                              className="w-3.5 h-3.5 text-orange-500 fill-orange-500"
                              aria-hidden="true"
                            />
                            {item.voteAverage}
                          </span>
                        )}
                      </div>

                      {/* Title & Year */}
                      <h2 className="text-base font-bold text-ink line-clamp-1 group-hover:text-teal-600 transition-colors">
                        {item.title}
                      </h2>

                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink-muted mt-1">
                        {item.year && (
                          <span className="font-semibold text-ink">
                            {item.year}
                          </span>
                        )}
                        {item.genreNames.length > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="truncate">
                              {item.genreNames.slice(0, 3).join(", ")}
                            </span>
                          </>
                        )}
                      </div>

                      {item.overview && (
                        <p className="text-xs text-ink-muted mt-1.5 line-clamp-2 leading-relaxed">
                          {truncateText(item.overview, 85)}
                        </p>
                      )}
                    </div>

                    {/* Card Actions */}
                    <div className="mt-4 pt-3 border-t border-line flex items-center gap-2">
                      {inWatchlist ? (
                        <Link
                          href="/watchlist"
                          className="flex-1 min-h-10 px-3 rounded-pill bg-teal-400/20 text-ink text-xs font-bold inline-flex items-center justify-center gap-1.5 transition hover:bg-teal-400/30"
                        >
                          <BookmarkCheck
                            className="w-4 h-4 text-teal-600"
                            aria-hidden="true"
                          />
                          <span>Di Watchlist</span>
                        </Link>
                      ) : (
                        <button
                          type="button"
                          disabled={isAdding}
                          onClick={() => void handleQuickAddToWatchlist(item)}
                          className="flex-1 min-h-10 px-3 rounded-pill bg-cta-gradient text-ink text-xs font-bold inline-flex items-center justify-center gap-1 shadow-xs hover:opacity-95 active:scale-95 disabled:opacity-50 cursor-pointer transition"
                        >
                          {isAdding ? (
                            <Loader2
                              className="w-4 h-4 animate-spin"
                              aria-hidden="true"
                            />
                          ) : (
                            <Plus className="w-4 h-4" aria-hidden="true" />
                          )}
                          <span>+ Watchlist</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => openCustomDialogForItem(item)}
                        className="min-h-10 px-3 rounded-pill bg-surface border border-line hover:bg-surface-soft text-ink text-xs font-semibold cursor-pointer transition"
                        title="Atur status, progres, dan link tontonan"
                      >
                        Detail
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* TitleDialog with TMDB Autocomplete & Auto-Cover */}
      <TitleDialog
        key={`dashboard-dialog-${dialogOpen ? "open" : "closed"}-${dialogPrefill?.name ?? "new"}`}
        open={dialogOpen}
        mode="create"
        prefill={dialogPrefill}
        onClose={() => {
          setDialogOpen(false);
          setDialogPrefill(null);
        }}
        onSaveCreate={handleSaveCreate}
        onSaveEdit={async () => ({ ok: true })}
      />
    </div>
  );
}

