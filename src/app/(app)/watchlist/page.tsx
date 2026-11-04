import { requireUser } from "@/lib/session";
import {
  listUserTitles,
  getUserWatchlistStats,
} from "@/lib/services/titles";
import { WatchlistClient } from "@/components/WatchlistClient";

export const dynamic = "force-dynamic";

export default async function WatchlistPage() {
  const user = await requireUser();
  const [titles, stats] = await Promise.all([
    listUserTitles(user.id),
    getUserWatchlistStats(user.id),
  ]);

  return (
    <main className="min-h-dvh w-full">
      <WatchlistClient
        user={user}
        initialTitles={titles}
        initialStats={stats}
      />
    </main>
  );
}
