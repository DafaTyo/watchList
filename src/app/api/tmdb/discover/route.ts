import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { discoverTmdbMedia, type TmdbDashboardCategory } from "@/lib/tmdb";

const VALID_CATEGORIES = new Set<TmdbDashboardCategory>([
  "trending",
  "popular_movies",
  "top_rated",
  "popular_tv",
  "now_playing",
]);

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const rawCategory = (searchParams.get("category") ??
    "trending") as TmdbDashboardCategory;
  const category: TmdbDashboardCategory = VALID_CATEGORIES.has(rawCategory)
    ? rawCategory
    : "trending";

  const rawGenre = searchParams.get("genreId");
  const genreId =
    rawGenre && Number.isInteger(Number(rawGenre)) && Number(rawGenre) > 0
      ? Number(rawGenre)
      : null;

  const rawMediaType = searchParams.get("mediaType");
  const mediaType: "all" | "movie" | "tv" =
    rawMediaType === "movie" || rawMediaType === "tv" ? rawMediaType : "all";

  const result = await discoverTmdbMedia({
    category,
    genreId,
    mediaType,
  });

  return NextResponse.json(result);
}

