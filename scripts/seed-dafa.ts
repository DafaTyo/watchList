import { PrismaClient, type TitleStatus, type TitleType } from "@prisma/client";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

const db = new PrismaClient();
const auth = betterAuth({
  database: prismaAdapter(db, { provider: "mysql" }),
  emailAndPassword: { enabled: true },
});

type SeedTitle = {
  name: string;
  type: TitleType;
  status: TitleStatus;
  year: number;
  rating: number | null;
  episodeCurrent: number;
  episodeTotal: number | null;
  posterUrl: string | null;
  notes: string | null;
  links: { label: string; url: string }[];
};

const DUMMY_TITLES: SeedTitle[] = [
  {
    name: "Sousou no Frieren (Frieren: Beyond Journey's End)",
    type: "anime",
    status: "watching",
    year: 2023,
    rating: 10,
    episodeCurrent: 21,
    episodeTotal: 28,
    posterUrl: "https://cdn.myanimelist.net/images/anime/1015/138006l.jpg",
    notes:
      "Visual dan musik oleh Evan Call luar biasa tenang. Tonton lanjutannya tiap akhir pekan di https://www.netflix.com atau Muse Indonesia https://www.youtube.com/@MuseIndonesia.",
    links: [
      { label: "Netflix", url: "https://www.netflix.com/title/81726714" },
      { label: "Crunchyroll", url: "https://www.crunchyroll.com/series/GG5H5XQX4/frieren-beyond-journeys-end" },
      { label: "YouTube Muse ID", url: "https://www.youtube.com/@MuseIndonesia" },
    ],
  },
  {
    name: "Dungeon Meshi (Delicious in Dungeon)",
    type: "anime",
    status: "watching",
    year: 2024,
    rating: 9,
    episodeCurrent: 16,
    episodeTotal: 24,
    posterUrl: "https://cdn.myanimelist.net/images/anime/1711/142478l.jpg",
    notes: "Studio Trigger gak pernah gagal soal animasi ekspresi dan masak-masak monster.",
    links: [
      { label: "Netflix", url: "https://www.netflix.com/title/81564899" },
    ],
  },
  {
    name: "Severance",
    type: "series",
    status: "watching",
    year: 2022,
    rating: 9,
    episodeCurrent: 7,
    episodeTotal: 9,
    posterUrl: "https://image.tmdb.org/t/p/w500/p6xA7G5bF3m3w8kF5F6h9p0X9A1.jpg",
    notes: "Konsep pemisahan memori kantor vs luar kantor bikin penasaran terus. Cek diskusi episode di https://www.reddit.com/r/SeveranceAppleTVPlus/.",
    links: [
      { label: "Apple TV+", url: "https://tv.apple.com/us/show/severance/umc.cmc.1srk2goyh2q2zdxcx605w8vtx" },
    ],
  },
  {
    name: "Dandadan",
    type: "anime",
    status: "watching",
    year: 2024,
    rating: 9,
    episodeCurrent: 9,
    episodeTotal: 12,
    posterUrl: "https://cdn.myanimelist.net/images/anime/1584/143719l.jpg",
    notes: "Opening Creepy Nuts bikin nagih. Episode 7 sedih banget!",
    links: [
      { label: "Netflix", url: "https://www.netflix.com/title/81736884" },
      { label: "Crunchyroll", url: "https://www.crunchyroll.com/series/GG5H5XQ0D/dan-da-dan" },
      { label: "Muse Indonesia", url: "https://www.youtube.com/@MuseIndonesia" },
    ],
  },
  {
    name: "Shogun",
    type: "series",
    status: "watching",
    year: 2024,
    rating: 10,
    episodeCurrent: 6,
    episodeTotal: 10,
    posterUrl: "https://image.tmdb.org/t/p/w500/7O4iVfOMQmdCSxhOg1WnzG1AgYT.jpg",
    notes: "Sinematografi dan dialog politik zaman feodal Jepang sangat detail.",
    links: [
      { label: "Disney+ Hotstar", url: "https://www.hotstar.com" },
      { label: "Hulu", url: "https://www.hulu.com/series/shogun-5422a773-9907-4186-9904-728f8e8875b0" },
    ],
  },
  {
    name: "Kaiju No. 8",
    type: "anime",
    status: "watching",
    year: 2024,
    rating: 8,
    episodeCurrent: 8,
    episodeTotal: 12,
    posterUrl: "https://cdn.myanimelist.net/images/anime/1370/140362l.jpg",
    notes: "Protagonis om-om umur 32 tahun yang akhirnya bisa masuk pasukan pertahanan.",
    links: [
      { label: "Netflix", url: "https://www.netflix.com" },
      { label: "Bstation", url: "https://www.bilibili.tv/id" },
    ],
  },
  {
    name: "Fullmetal Alchemist: Brotherhood",
    type: "anime",
    status: "completed",
    year: 2009,
    rating: 10,
    episodeCurrent: 64,
    episodeTotal: 64,
    posterUrl: "https://cdn.myanimelist.net/images/anime/1208/94745l.jpg",
    notes: "Masterpiece sepanjang masa. Ending paling memuaskan tanpa celah plot.",
    links: [
      { label: "Netflix", url: "https://www.netflix.com/title/70204981" },
      { label: "Crunchyroll", url: "https://www.crunchyroll.com/series/GRGGPG93R/fullmetal-alchemist-brotherhood" },
    ],
  },
  {
    name: "Steins;Gate",
    type: "anime",
    status: "completed",
    year: 2011,
    rating: 10,
    episodeCurrent: 24,
    episodeTotal: 24,
    posterUrl: "https://cdn.myanimelist.net/images/anime/1935/127974l.jpg",
    notes: "El Psy Kongroo! Paruh pertama agak lambat tapi mulai episode 12 langsung ngebut.",
    links: [
      { label: "Bstation", url: "https://www.bilibili.tv/id" },
    ],
  },
  {
    name: "Attack on Titan (Shingeki no Kyojin)",
    type: "anime",
    status: "completed",
    year: 2013,
    rating: 10,
    episodeCurrent: 89,
    episodeTotal: 89,
    posterUrl: "https://cdn.myanimelist.net/images/anime/10/47347l.jpg",
    notes: "Perjalanan 10 tahun dari musim pertama sampai The Final Chapters. Plot twist basement masih tak tertandingi.",
    links: [
      { label: "Netflix", url: "https://www.netflix.com/title/70299043" },
      { label: "iQIYI", url: "https://www.iq.com" },
      { label: "Crunchyroll", url: "https://www.crunchyroll.com/series/GR751KNZY/attack-on-titan" },
    ],
  },
  {
    name: "Spirited Away (Sen to Chihiro no Kamikakushi)",
    type: "movie",
    status: "completed",
    year: 2001,
    rating: 10,
    episodeCurrent: 0,
    episodeTotal: null,
    posterUrl: "https://cdn.myanimelist.net/images/anime/6/79597l.jpg",
    notes: "Film Ghibli favorit. Musik Joe Hisaishi selalu bikin nostalgia.",
    links: [
      { label: "Netflix", url: "https://www.netflix.com/title/60023642" },
    ],
  },
  {
    name: "Oppenheimer",
    type: "movie",
    status: "completed",
    year: 2023,
    rating: 9,
    episodeCurrent: 0,
    episodeTotal: null,
    posterUrl: "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    notes: "Ditonton di IMAX. Adegan tes Trinity heningnya luar biasa.",
    links: [
      { label: "Apple TV", url: "https://tv.apple.com" },
      { label: "Prime Video", url: "https://www.primevideo.com" },
    ],
  },
  {
    name: "Dune: Part Two",
    type: "movie",
    status: "completed",
    year: 2024,
    rating: 10,
    episodeCurrent: 0,
    episodeTotal: null,
    posterUrl: "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
    notes: "Denis Villeneuve + Hans Zimmer. Skala sci-fi terbaik dekade ini.",
    links: [
      { label: "Max", url: "https://www.max.com" },
      { label: "Apple TV", url: "https://tv.apple.com" },
    ],
  },
  {
    name: "Parasite (Gisaengchung)",
    type: "movie",
    status: "completed",
    year: 2019,
    rating: 10,
    episodeCurrent: 0,
    episodeTotal: null,
    posterUrl: "https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
    notes: "Transisi genre dari komedi gelap ke thriller di tengah film sangat mulus.",
    links: [
      { label: "Viu", url: "https://www.viu.com" },
      { label: "Netflix", url: "https://www.netflix.com" },
    ],
  },
  {
    name: "Everything Everywhere All at Once",
    type: "movie",
    status: "completed",
    year: 2022,
    rating: 9,
    episodeCurrent: 0,
    episodeTotal: null,
    posterUrl: "https://image.tmdb.org/t/p/w500/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg",
    notes: "Kacau, kreatif, tapi pesan keluarga di akhirnya kena banget.",
    links: [
      { label: "Netflix", url: "https://www.netflix.com" },
    ],
  },
  {
    name: "Breaking Bad",
    type: "series",
    status: "completed",
    year: 2008,
    rating: 10,
    episodeCurrent: 62,
    episodeTotal: 62,
    posterUrl: "https://image.tmdb.org/t/p/w500/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg",
    notes: "Ozymandias (S5E14) tetap jadi salah satu episode TV terbaik yang pernah dibuat.",
    links: [
      { label: "Netflix", url: "https://www.netflix.com/title/70143836" },
    ],
  },
  {
    name: "Better Call Saul",
    type: "series",
    status: "completed",
    year: 2015,
    rating: 10,
    episodeCurrent: 63,
    episodeTotal: 63,
    posterUrl: "https://image.tmdb.org/t/p/w500/fC2HDm5t0kHl7mTm7jxMR31b7by.jpg",
    notes: "Karakterisasi Jimmy McGill dan Kim Wexler bahkan lebih dalam dari seri utamanya.",
    links: [
      { label: "Netflix", url: "https://www.netflix.com/title/80021955" },
    ],
  },
  {
    name: "Arcane: League of Legends",
    type: "series",
    status: "completed",
    year: 2021,
    rating: 10,
    episodeCurrent: 18,
    episodeTotal: 18,
    posterUrl: "https://image.tmdb.org/t/p/w500/fqldf2t8ztc9aiwn3k6mlX3tvRT.jpg",
    notes: "Setiap frame karya Fortiche bisa dijadikan wallpaper.",
    links: [
      { label: "Netflix", url: "https://www.netflix.com/title/81435684" },
    ],
  },
  {
    name: "Chernobyl",
    type: "series",
    status: "completed",
    year: 2019,
    rating: 10,
    episodeCurrent: 5,
    episodeTotal: 5,
    posterUrl: "https://image.tmdb.org/t/p/w500/hlLXt2tOPT6RRnjiUmoxyG1LTFi.jpg",
    notes: "Miniseri 5 episode yang atmosfernya bikin tegang dari awal sampai akhir.",
    links: [
      { label: "Max", url: "https://www.max.com" },
    ],
  },
  {
    name: "Mob Psycho 100",
    type: "anime",
    status: "completed",
    year: 2016,
    rating: 9,
    episodeCurrent: 37,
    episodeTotal: 37,
    posterUrl: "https://cdn.myanimelist.net/images/anime/8/80356l.jpg",
    notes: "Reigen Arataka adalah mentor terbaik di dunia anime.",
    links: [
      { label: "Netflix", url: "https://www.netflix.com" },
      { label: "Crunchyroll", url: "https://www.crunchyroll.com" },
    ],
  },
  {
    name: "Bocchi the Rock!",
    type: "anime",
    status: "completed",
    year: 2022,
    rating: 9,
    episodeCurrent: 12,
    episodeTotal: 12,
    posterUrl: "https://cdn.myanimelist.net/images/anime/1448/127956l.jpg",
    notes: "Eksperimen visual CloverWorks dan lagu-lagu Kessoku Band keren semua.",
    links: [
      { label: "Bstation", url: "https://www.bilibili.tv/id" },
      { label: "Netflix", url: "https://www.netflix.com" },
    ],
  },
  {
    name: "Cyberpunk: Edgerunners",
    type: "anime",
    status: "completed",
    year: 2022,
    rating: 9,
    episodeCurrent: 10,
    episodeTotal: 10,
    posterUrl: "https://cdn.myanimelist.net/images/anime/1818/126435l.jpg",
    notes: "Jangan dengarkan lagu 'I Really Want to Stay at Your House' kalau gak mau baper lagi.",
    links: [
      { label: "Netflix", url: "https://www.netflix.com/title/81054853" },
    ],
  },
  {
    name: "Interstellar",
    type: "movie",
    status: "completed",
    year: 2014,
    rating: 10,
    episodeCurrent: 0,
    episodeTotal: null,
    posterUrl: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    notes: "Adegan docking + organ Hans Zimmer = merinding.",
    links: [
      { label: "Netflix", url: "https://www.netflix.com" },
      { label: "Prime Video", url: "https://www.primevideo.com" },
    ],
  },
  {
    name: "The Dark Knight",
    type: "movie",
    status: "completed",
    year: 2008,
    rating: 10,
    episodeCurrent: 0,
    episodeTotal: null,
    posterUrl: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    notes: "Akting Heath Ledger sebagai Joker masih legendaris.",
    links: [
      { label: "Max", url: "https://www.max.com" },
    ],
  },
  {
    name: "Spider-Man: Across the Spider-Verse",
    type: "movie",
    status: "completed",
    year: 2023,
    rating: 9,
    episodeCurrent: 0,
    episodeTotal: null,
    posterUrl: "https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg",
    notes: "Gaya seni tiap semesta beda-beda, gak sabar nunggu Beyond the Spider-Verse.",
    links: [
      { label: "Netflix", url: "https://www.netflix.com" },
    ],
  },
  {
    name: "Monster",
    type: "anime",
    status: "planned",
    year: 2004,
    rating: null,
    episodeCurrent: 0,
    episodeTotal: 74,
    posterUrl: "https://cdn.myanimelist.net/images/anime/10/18793l.jpg",
    notes: "Karya Naoki Urasawa, sudah masuk Netflix lengkap 74 episode.",
    links: [
      { label: "Netflix", url: "https://www.netflix.com/title/81409869" },
    ],
  },
  {
    name: "Pluto",
    type: "anime",
    status: "planned",
    year: 2023,
    rating: null,
    episodeCurrent: 0,
    episodeTotal: 8,
    posterUrl: "https://cdn.myanimelist.net/images/anime/1427/134492l.jpg",
    notes: "Tiap episode berdurasi 1 jam. Rencana maraton liburan nanti.",
    links: [
      { label: "Netflix", url: "https://www.netflix.com/title/81281344" },
    ],
  },
  {
    name: "Apothecary Diaries (Kusuriya no Hitorigoto)",
    type: "anime",
    status: "planned",
    year: 2023,
    rating: null,
    episodeCurrent: 0,
    episodeTotal: 24,
    posterUrl: "https://cdn.myanimelist.net/images/anime/1708/138033l.jpg",
    notes: "Banyak direkomendasikan teman karena karakter Maomao yang cerdas.",
    links: [
      { label: "Netflix", url: "https://www.netflix.com/title/81712068" },
      { label: "Crunchyroll", url: "https://www.crunchyroll.com" },
    ],
  },
  {
    name: "Succession",
    type: "series",
    status: "planned",
    year: 2018,
    rating: null,
    episodeCurrent: 0,
    episodeTotal: 39,
    posterUrl: "https://image.tmdb.org/t/p/w500/7HW47XbkNQ5fiwQFYGWdw9gs144.jpg",
    notes: "Drama perebutan tahta perusahaan media keluarga Roy.",
    links: [
      { label: "Max", url: "https://www.max.com" },
    ],
  },
  {
    name: "The Bear",
    type: "series",
    status: "planned",
    year: 2022,
    rating: null,
    episodeCurrent: 0,
    episodeTotal: 28,
    posterUrl: "https://image.tmdb.org/t/p/w500/sHFlbKS3WLqMnp9t2ghADIJFnuQ.jpg",
    notes: "Katanya intens banget suasana dapurnya.",
    links: [
      { label: "Disney+ Hotstar", url: "https://www.hotstar.com" },
    ],
  },
  {
    name: "Past Lives",
    type: "movie",
    status: "planned",
    year: 2023,
    rating: null,
    episodeCurrent: 0,
    episodeTotal: null,
    posterUrl: "https://image.tmdb.org/t/p/w500/k3waqVXSnvCZWfJYNtdamTgTtTA.jpg",
    notes: "Film A24 karya Celine Song tentang takdir (In-Yun).",
    links: [
      { label: "Netflix", url: "https://www.netflix.com" },
    ],
  },
  {
    name: "Look Back",
    type: "movie",
    status: "planned",
    year: 2024,
    rating: null,
    episodeCurrent: 0,
    episodeTotal: null,
    posterUrl: "https://cdn.myanimelist.net/images/anime/1516/141614l.jpg",
    notes: "Adaptasi one-shot Tatsuki Fujimoto, sudah rilis di Prime Video.",
    links: [
      { label: "Prime Video", url: "https://www.primevideo.com" },
    ],
  },
  {
    name: "The Boy and the Heron (Kimitachi wa Dou Ikiru ka)",
    type: "movie",
    status: "planned",
    year: 2023,
    rating: null,
    episodeCurrent: 0,
    episodeTotal: null,
    posterUrl: "https://cdn.myanimelist.net/images/anime/1488/138451l.jpg",
    notes: "Karya terbaru Hayao Miyazaki.",
    links: [
      { label: "Netflix", url: "https://www.netflix.com" },
    ],
  },
  {
    name: "Blade Runner 2049",
    type: "movie",
    status: "planned",
    year: 2017,
    rating: null,
    episodeCurrent: 0,
    episodeTotal: null,
    posterUrl: "https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg",
    notes: "Sinematografi Roger Deakins wajib ditonton di layar besar.",
    links: [
      { label: "Netflix", url: "https://www.netflix.com" },
      { label: "Apple TV", url: "https://tv.apple.com" },
    ],
  },
  {
    name: "Vinland Saga",
    type: "anime",
    status: "on_hold",
    year: 2019,
    rating: 9,
    episodeCurrent: 24,
    episodeTotal: 48,
    posterUrl: "https://cdn.myanimelist.net/images/anime/1500/103005l.jpg",
    notes: "Season 1 sudah selesai, berhenti sebentar sebelum mulai Farmland Arc (Season 2).",
    links: [
      { label: "Netflix", url: "https://www.netflix.com/title/81249833" },
    ],
  },
  {
    name: "One Piece",
    type: "anime",
    status: "on_hold",
    year: 1999,
    rating: 9,
    episodeCurrent: 1071,
    episodeTotal: null,
    posterUrl: "https://cdn.myanimelist.net/images/anime/1244/138851l.jpg",
    notes: "Nabung episode Egghead Arc dulu biar bisa maraton sekaligus.",
    links: [
      { label: "Bstation", url: "https://www.bilibili.tv/id" },
      { label: "Netflix", url: "https://www.netflix.com" },
      { label: "iQIYI", url: "https://www.iq.com" },
    ],
  },
  {
    name: "Dark",
    type: "series",
    status: "on_hold",
    year: 2017,
    rating: 8,
    episodeCurrent: 10,
    episodeTotal: 26,
    posterUrl: "https://image.tmdb.org/t/p/w500/apbrbWs8M9lyOpJYU5WXrpFbk1Z.jpg",
    notes: "Butuh buka silsilah keluarga resmi di https://dark.netflix.io sebelum lanjut Season 2.",
    links: [
      { label: "Netflix", url: "https://www.netflix.com/title/80100172" },
    ],
  },
  {
    name: "The Witcher",
    type: "series",
    status: "dropped",
    year: 2019,
    rating: 6,
    episodeCurrent: 12,
    episodeTotal: 24,
    posterUrl: "https://image.tmdb.org/t/p/w500/cZ0d3rtvXPVvuiX22sP79K3Hmjz.jpg",
    notes: "Berhenti di pertengahan Season 2 karena ceritanya makin jauh dari buku.",
    links: [
      { label: "Netflix", url: "https://www.netflix.com/title/80189685" },
    ],
  },
  {
    name: "Tokyo Ghoul:re",
    type: "anime",
    status: "dropped",
    year: 2018,
    rating: 5,
    episodeCurrent: 6,
    episodeTotal: 24,
    posterUrl: "https://cdn.myanimelist.net/images/anime/1063/95086l.jpg",
    notes: "Pacing animenya terlalu dipercepat dibanding manganya.",
    links: [
      { label: "Bstation", url: "https://www.bilibili.tv/id" },
    ],
  },
];

async function main() {
  const email = "dafa@gmail.com";
  const password = "password123";
  const name = "Dafa";

  const ctx = await auth.$context;
  let existing = await ctx.internalAdapter.findUserByEmail(email);

  let userId: string;

  if (!existing?.user) {
    const signUpReq = new Request("http://localhost:3000/api/auth/sign-up/email", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "127.0.0.1",
      },
      body: JSON.stringify({
        name,
        email,
        password,
      }),
    });
    const res = await auth.handler(signUpReq);
    if (!res.ok) {
      throw new Error(`Failed to create user via Better Auth: ${await res.text()}`);
    }
    existing = await ctx.internalAdapter.findUserByEmail(email);
    if (!existing?.user) {
      throw new Error("User created but could not be found.");
    }
    userId = existing.user.id;
    console.log(`Created user ${email} (id: ${userId})`);
  } else {
    userId = existing.user.id;
    const hashed = await ctx.password.hash(password);
    await ctx.internalAdapter.updatePassword(userId, hashed);
    console.log(`Updated password for existing user ${email} (id: ${userId})`);
  }

  await db.title.deleteMany({
    where: { userId },
  });

  const baseTime = Date.now() - DUMMY_TITLES.length * 60_000;

  for (let i = 0; i < DUMMY_TITLES.length; i++) {
    const item = DUMMY_TITLES[i];
    const timestamp = new Date(baseTime + (DUMMY_TITLES.length - i) * 60_000);

    await db.title.create({
      data: {
        userId,
        name: item.name,
        type: item.type,
        status: item.status,
        year: item.year,
        rating: item.rating,
        episodeCurrent: item.episodeCurrent,
        episodeTotal: item.episodeTotal,
        posterUrl: item.posterUrl,
        notes: item.notes,
        createdAt: timestamp,
        updatedAt: timestamp,
        links: {
          create: item.links.map((l) => ({
            label: l.label,
            url: l.url,
          })),
        },
      },
    });
  }

  const totalCount = await db.title.count({ where: { userId } });
  const totalLinks = await db.watchLink.count({
    where: { title: { userId } },
  });

  console.log(
    `Successfully seeded ${totalCount} titles and ${totalLinks} watch links for ${email}!`
  );
}

main()
  .catch((err) => {
    console.error("Seed error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
