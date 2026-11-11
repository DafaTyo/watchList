import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getTmdbMediaDetails } from "@/lib/tmdb";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const rawType = searchParams.get("mediaType");
  const mediaType: "movie" | "tv" = rawType === "tv" ? "tv" : "movie";
  const id = Number(searchParams.get("id") ?? "0");

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ item: null }, { status: 400 });
  }

  const item = await getTmdbMediaDetails(mediaType, id);
  return NextResponse.json({ item });
}

