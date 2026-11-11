import { requireUser } from "@/lib/session";
import { listUserTitles } from "@/lib/services/titles";
import { discoverTmdbMedia } from "@/lib/tmdb";
import { DashboardClient } from "@/components/DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const [tmdbData, existingTitles] = await Promise.all([
    discoverTmdbMedia({ category: "trending" }),
    listUserTitles(user.id),
  ]);

  return (
    <main>
      <DashboardClient
        user={user}
        initialItems={tmdbData.items}
        initialGenres={tmdbData.genres}
        initialConfigured={tmdbData.configured}
        existingTitles={existingTitles}
      />
    </main>
  );
}

