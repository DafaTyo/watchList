import { beforeEach, afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
  createTitle,
  getUserTitleById,
  listUserTitles,
  updateTitle,
  updateTitleStatus,
  updateTitleNotes,
  deleteTitle,
  incrementEpisode,
  decrementEpisode,
  getUserWatchlistStats,
  pickFeaturedTitle,
  MAX_TITLES_PER_USER,
} from "@/lib/services/titles";
import {
  createWatchLink,
  updateWatchLink,
  deleteWatchLink,
  listTitleLinks,
  MAX_LINKS_PER_TITLE,
} from "@/lib/services/links";

function assertTestDatabase() {
  const url = process.env.DATABASE_URL ?? "";
  let dbName = "";
  try {
    const parsed = new URL(url);
    dbName = parsed.pathname.replace(/^\//, "");
  } catch {
    throw new Error(`Invalid DATABASE_URL for tests: "${url}"`);
  }

  if (!dbName.endsWith("_test")) {
    throw new Error(
      `REFUSING TO RUN TESTS: DATABASE_URL database "${dbName}" does not end with "_test"!`
    );
  }
}

assertTestDatabase();

async function cleanDatabase() {
  assertTestDatabase();
  await db.watchLink.deleteMany();
  await db.title.deleteMany();
  await db.session.deleteMany();
  await db.account.deleteMany();
  await db.verification.deleteMany();
  await db.rateLimit.deleteMany();
  await db.user.deleteMany();
}

async function seedUsers() {
  const userA = await db.user.create({
    data: {
      id: "user_a_test",
      name: "Alice Watcher",
      email: "alice@example.com",
    },
  });
  const userB = await db.user.create({
    data: {
      id: "user_b_test",
      name: "Bob Intruder",
      email: "bob@example.com",
    },
  });
  return { userA, userB };
}

beforeEach(async () => {
  process.env.ALLOW_REGISTRATION = "true";
  await cleanDatabase();
});

afterAll(async () => {
  await cleanDatabase();
  await db.$disconnect();
});

describe("US9 — Cross-user isolation (IDOR protection) for titles and watch_links", () => {
  it("prevents user B from reading, updating, progressing, or deleting user A's title and watch links", async () => {
    const { userA, userB } = await seedUsers();

    const titleA = await createTitle(userA.id, {
      name: "Frieren: Beyond Journey's End",
      type: "anime",
      status: "watching",
      episodeCurrent: 5,
      episodeTotal: 28,
      notes: "Catatan rahasia Alice",
    });

    const linkA = await createWatchLink(userA.id, titleA.id, {
      label: "Netflix",
      url: "https://www.netflix.com/title/81726714",
    });

    // User B tries to read User A's title
    const readByB = await getUserTitleById(userB.id, titleA.id);
    expect(readByB).toBeNull();

    const listByB = await listUserTitles(userB.id);
    expect(listByB).toHaveLength(0);

    // User B tries to update User A's title
    await expect(
      updateTitle(userB.id, titleA.id, {
        name: "Diubah oleh Bob",
        type: "anime",
        status: "dropped",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    // User B tries to change status or notes or episode progress of User A's title
    await expect(
      updateTitleStatus(userB.id, titleA.id, "dropped")
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    await expect(
      updateTitleNotes(userB.id, titleA.id, "Hacked notes")
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    await expect(
      incrementEpisode(userB.id, titleA.id)
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    await expect(
      decrementEpisode(userB.id, titleA.id)
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    // User B tries to delete User A's title
    await expect(
      deleteTitle(userB.id, titleA.id)
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    // User B tries to list, create, update, or delete watch links on User A's title
    await expect(
      listTitleLinks(userB.id, titleA.id)
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    await expect(
      createWatchLink(userB.id, titleA.id, {
        label: "Malicious",
        url: "https://evil.example.com",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    await expect(
      updateWatchLink(userB.id, linkA.id, {
        label: "Phishing",
        url: "https://evil.example.com",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    await expect(
      deleteWatchLink(userB.id, linkA.id)
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    // Verify User A's title and link are completely untouched
    const verifyA = await getUserTitleById(userA.id, titleA.id);
    expect(verifyA).not.toBeNull();
    expect(verifyA?.name).toBe("Frieren: Beyond Journey's End");
    expect(verifyA?.status).toBe("watching");
    expect(verifyA?.episodeCurrent).toBe(5);
    expect(verifyA?.notes).toBe("Catatan rahasia Alice");
    expect(verifyA?.links).toHaveLength(1);
    expect(verifyA?.links[0].label).toBe("Netflix");
    expect(verifyA?.links[0].url).toBe("https://www.netflix.com/title/81726714");
  });
});

describe("F4 / US3 — Episode progress rules and atomic SQL increments", () => {
  it("transitions planned -> watching on first +1, reaches completed at total, and never exceeds total even on rapid concurrent calls", async () => {
    const { userA } = await seedUsers();

    const series = await createTitle(userA.id, {
      name: "Arcane",
      type: "series",
      status: "planned",
      episodeCurrent: 0,
      episodeTotal: 3,
    });

    expect(series.status).toBe("planned");
    expect(series.episodeCurrent).toBe(0);

    // First +1 on `planned` transitions status to `watching`
    const afterFirst = await incrementEpisode(userA.id, series.id);
    expect(afterFirst.episodeCurrent).toBe(1);
    expect(afterFirst.status).toBe("watching");

    // Second +1 keeps `watching`
    const afterSecond = await incrementEpisode(userA.id, series.id);
    expect(afterSecond.episodeCurrent).toBe(2);
    expect(afterSecond.status).toBe("watching");

    // Rapid concurrent +1 calls when at 2/3 — must cap at 3 and transition to `completed`
    await Promise.all([
      incrementEpisode(userA.id, series.id),
      incrementEpisode(userA.id, series.id),
      incrementEpisode(userA.id, series.id),
      incrementEpisode(userA.id, series.id),
    ]);

    const finalState = await getUserTitleById(userA.id, series.id);
    expect(finalState?.episodeCurrent).toBe(3);
    expect(finalState?.status).toBe("completed");

    // Subsequent +1 does not change episodeCurrent beyond 3
    const afterExtra = await incrementEpisode(userA.id, series.id);
    expect(afterExtra.episodeCurrent).toBe(3);
    expect(afterExtra.status).toBe("completed");

    // -1 decrements down to 0 and never goes negative
    const dec1 = await decrementEpisode(userA.id, series.id);
    expect(dec1.episodeCurrent).toBe(2);
    await decrementEpisode(userA.id, series.id);
    const dec0 = await decrementEpisode(userA.id, series.id);
    expect(dec0.episodeCurrent).toBe(0);
    const decBelowZero = await decrementEpisode(userA.id, series.id);
    expect(decBelowZero.episodeCurrent).toBe(0);
  });

  it("rejects saving episodeTotal lower than episodeCurrent", async () => {
    const { userA } = await seedUsers();

    const anime = await createTitle(userA.id, {
      name: "One Piece",
      type: "anime",
      status: "watching",
      episodeCurrent: 10,
      episodeTotal: 20,
    });

    await expect(
      updateTitle(userA.id, anime.id, {
        name: "One Piece",
        type: "anime",
        status: "watching",
        episodeCurrent: 10,
        episodeTotal: 8,
      })
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      field: "episodeTotal",
    });
  });
});

describe("F6 / US4 — Watch links validation, quota of 10, and parent updatedAt bump", () => {
  it("rejects non-http/https schemes, allows up to 10 links, rejects the 11th link, and bumps titles.updated_at", async () => {
    const { userA } = await seedUsers();

    const title = await createTitle(userA.id, {
      name: "Spirited Away",
      type: "movie",
      status: "planned",
      posterUrl: "https://images.example.com/spirited-away.jpg",
    });

    // Rejects non-https posterUrl
    await expect(
      createTitle(userA.id, {
        name: "Bad Poster",
        type: "movie",
        posterUrl: "http://insecure.example.com/poster.jpg",
      })
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      field: "posterUrl",
    });

    // Rejects javascript: and ftp: schemes on watch links
    await expect(
      createWatchLink(userA.id, title.id, {
        label: "XSS",
        url: "javascript:alert(1)",
      })
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      field: "url",
    });

    await expect(
      createWatchLink(userA.id, title.id, {
        label: "FTP",
        url: "ftp://files.example.com/video.mp4",
      })
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      field: "url",
    });

    // Wait briefly so updatedAt difference is measurable
    const beforeLinkTime = (await getUserTitleById(userA.id, title.id))!.updatedAt.getTime();
    await new Promise((r) => setTimeout(r, 25));

    // Add 10 valid links (http and https)
    for (let i = 1; i <= MAX_LINKS_PER_TITLE; i++) {
      const protocol = i % 2 === 0 ? "http" : "https";
      await createWatchLink(userA.id, title.id, {
        label: `Platform ${i}`,
        url: `${protocol}://stream.example.com/watch/${i}`,
      });
    }

    const afterCreateTime = (await getUserTitleById(userA.id, title.id))!.updatedAt.getTime();
    expect(afterCreateTime).toBeGreaterThan(beforeLinkTime);

    // 11th link must be rejected
    await expect(
      createWatchLink(userA.id, title.id, {
        label: "Platform 11",
        url: "https://stream.example.com/watch/11",
      })
    ).rejects.toMatchObject({
      code: "QUOTA_EXCEEDED",
    });

    const currentLinks = await listTitleLinks(userA.id, title.id);
    expect(currentLinks).toHaveLength(10);
  });
});

describe("F2 / F8 / US2 / US8 — 500 titles quota, GROUP BY stats, and featured title selection", () => {
  it("enforces max 500 titles per user in a transaction and computes accurate stats", async () => {
    const { userA } = await seedUsers();

    // Seed 499 titles via createMany for speed, then test the 500th and 501st through createTitle()
    const batch = Array.from({ length: MAX_TITLES_PER_USER - 1 }, (_, i) => ({
      userId: userA.id,
      name: `Bulk Title #${i + 1}`,
      type: "movie" as const,
      status: i < 100 ? ("completed" as const) : ("planned" as const),
    }));
    await db.title.createMany({ data: batch });

    // 500th title succeeds via createTitle
    const title500 = await createTitle(userA.id, {
      name: "Judul Ke-500",
      type: "series",
      status: "watching",
    });
    expect(title500.name).toBe("Judul Ke-500");

    // 501st title is rejected with QUOTA_EXCEEDED
    await expect(
      createTitle(userA.id, {
        name: "Judul Ke-501",
        type: "movie",
        status: "planned",
      })
    ).rejects.toMatchObject({
      code: "QUOTA_EXCEEDED",
    });

    // Verify stats aggregation via GROUP BY
    const stats = await getUserWatchlistStats(userA.id);
    expect(stats.total).toBe(500);
    expect(stats.completed).toBe(100);
    expect(stats.planned).toBe(399);
    expect(stats.watching).toBe(1);

    // Featured title rule: watching with newest updated_at wins
    const allTitles = await listUserTitles(userA.id);
    const featured = pickFeaturedTitle(allTitles);
    expect(featured?.id).toBe(title500.id);
  });
});

describe("US1 / Phase 0b — Better Auth registration flag, email normalization, and database rate limiting", () => {
  it("normalizes email on sign-up, blocks sign-up when ALLOW_REGISTRATION=false, and enforces database rate limit on repeated failed logins", async () => {
    // 1. Sign up with mixed-case and whitespace email when ALLOW_REGISTRATION=true
    process.env.ALLOW_REGISTRATION = "true";

    const signUpReq = new Request("http://localhost:3000/api/auth/sign-up/email", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "203.0.113.10",
      },
      body: JSON.stringify({
        name: "  Rina Tester  ",
        email: "  RINA.User@Example.COM ",
        password: "Password123!",
      }),
    });

    const signUpRes = await auth.handler(signUpReq);
    if (signUpRes.status !== 200) {
      console.error("SignUp Error Body:", await signUpRes.text());
    }
    expect(signUpRes.status).toBe(200);

    const savedUser = await db.user.findUnique({
      where: { email: "rina.user@example.com" },
    });
    expect(savedUser).not.toBeNull();
    expect(savedUser?.name).toBe("Rina Tester");

    // 2. Set ALLOW_REGISTRATION=false and verify endpoint rejects new sign-ups
    process.env.ALLOW_REGISTRATION = "false";

    const blockedSignUpReq = new Request(
      "http://localhost:3000/api/auth/sign-up/email",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "203.0.113.11",
        },
        body: JSON.stringify({
          name: "Blocked User",
          email: "blocked@example.com",
          password: "Password123!",
        }),
      }
    );

    const blockedRes = await auth.handler(blockedSignUpReq);
    expect(blockedRes.status).toBeGreaterThanOrEqual(400);
    const blockedUserInDb = await db.user.findUnique({
      where: { email: "blocked@example.com" },
    });
    expect(blockedUserInDb).toBeNull();

    // 3. Verify database rate limiting on /sign-in/email (max 5 per 60s window)
    let lastStatus = 0;
    for (let attempt = 1; attempt <= 7; attempt++) {
      const loginReq = new Request("http://localhost:3000/api/auth/sign-in/email", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "198.51.100.77",
        },
        body: JSON.stringify({
          email: "rina.user@example.com",
          password: "WrongPassword999!",
        }),
      });
      const loginRes = await auth.handler(loginReq);
      lastStatus = loginRes.status;
      if (lastStatus === 429) break;
    }

    expect(lastStatus).toBe(429);

    const rateLimitRows = await db.rateLimit.count();
    expect(rateLimitRows).toBeGreaterThan(0);
  });
});
