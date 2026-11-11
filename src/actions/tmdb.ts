"use server";

import { getOptionalUser } from "@/lib/session";
import {
  discoverTmdbMedia,
  getTmdbMediaDetails,
  searchTmdbMedia,
  type TmdbDashboardCategory,
  type TmdbGenre,
  type TmdbMediaItem,
} from "@/lib/tmdb";
import type { TitleTypeValue } from "@/lib/validators";

export async function discoverTmdbAction(options: {
  category?: TmdbDashboardCategory;
  genreId?: number | null;
  mediaType?: "all" | "movie" | "tv";
}): Promise<{
  items: TmdbMediaItem[];
  genres: TmdbGenre[];
  configured: boolean;
  source: "tmdb" | "fallback";
}> {
  await getOptionalUser();
  return discoverTmdbMedia(options);
}

export async function searchTmdbAction(
  query: string,
  typeFilter?: TitleTypeValue | "all"
): Promise<{
  items: TmdbMediaItem[];
  configured: boolean;
  source: "tmdb" | "fallback";
}> {
  await getOptionalUser();
  return searchTmdbMedia(query, typeFilter);
}

export async function getTmdbDetailsAction(
  mediaType: "movie" | "tv",
  tmdbId: number
): Promise<TmdbMediaItem | null> {
  await getOptionalUser();
  return getTmdbMediaDetails(mediaType, tmdbId);
}

