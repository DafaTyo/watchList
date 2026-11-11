import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { searchTmdbMedia } from "@/lib/tmdb";
import type { TitleTypeValue } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q") ?? "";
  const rawType = searchParams.get("type") ?? "all";
  const typeFilter: TitleTypeValue | "all" =
    rawType === "movie" || rawType === "series" || rawType === "anime"
      ? rawType
      : "all";

  const result = await searchTmdbMedia(q, typeFilter);
  return NextResponse.json(result);
}

