import fs from "node:fs";
import path from "node:path";
import type { TitleTypeValue } from "./validators";

export type TmdbGenre = {
  id: number;
  name: string;
};

export type TmdbDashboardCategory =
  | "trending"
  | "popular_movies"
  | "top_rated"
  | "popular_tv"
  | "now_playing";

export type TmdbMediaItem = {
  tmdbId: number;
  mediaType: "movie" | "tv";
  appType: TitleTypeValue;
  title: string;
  originalTitle: string;
  year: number | null;
  rating: number | null;
  voteAverage: number;
  posterUrl: string | null;
  backdropUrl: string | null;
  overview: string;
  genreIds: number[];
  genreNames: string[];
  episodeTotal?: number | null;
};

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_W500 = "https://image.tmdb.org/t/p/w500";
const TMDB_IMAGE_W1280 = "https://image.tmdb.org/t/p/w1280";

export const STANDARD_TMDB_GENRES: TmdbGenre[] = [
  { id: 28, name: "Aksi" },
  { id: 12, name: "Petualangan" },
  { id: 16, name: "Animasi" },
  { id: 35, name: "Komedi" },
  { id: 80, name: "Kejahatan" },
  { id: 18, name: "Drama" },
  { id: 10751, name: "Keluarga" },
  { id: 14, name: "Fantasi" },
  { id: 36, name: "Sejarah" },
  { id: 27, name: "Horor" },
  { id: 9648, name: "Misteri" },
  { id: 10749, name: "Romansa" },
  { id: 878, name: "Fiksi Ilmiah" },
  { id: 53, name: "Thriller" },
  { id: 10752, name: "Perang" },
  { id: 99, name: "Dokumenter" },
  { id: 10402, name: "Musik" },
];

const GENRE_NAME_MAP: Record<number, string> = {
  28: "Aksi",
  12: "Petualangan",
  16: "Animasi",
  35: "Komedi",
  80: "Kejahatan",
  99: "Dokumenter",
  18: "Drama",
  10751: "Keluarga",
  14: "Fantasi",
  36: "Sejarah",
  27: "Horor",
  10402: "Musik",
  9648: "Misteri",
  10749: "Romansa",
  878: "Fiksi Ilmiah",
  10770: "Film TV",
  53: "Thriller",
  10752: "Perang",
  37: "Barat",
  10759: "Aksi & Petualangan",
  10762: "Anak-anak",
  10765: "Sci-Fi & Fantasi",
  10768: "Perang & Politik",
};

// Curated TMDB items used when TMDB_API_KEY is empty or unreachable so UI & cover autocomplete always work seamlessly
const CURATED_TMDB_CATALOG: TmdbMediaItem[] = [
  {
    tmdbId: 693134,
    mediaType: "movie",
    appType: "movie",
    title: "Dune: Part Two",
    originalTitle: "Dune: Part Two",
    year: 2024,
    rating: 8,
    voteAverage: 8.3,
    posterUrl: `${TMDB_IMAGE_W500}/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg`,
    backdropUrl: `${TMDB_IMAGE_W1280}/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg`,
    overview:
      "Paul Atreides bersatu dengan Chani dan bangsa Fremen sambil menempuh jalan balas dendam terhadap para konspirator yang menghancurkan keluarganya.",
    genreIds: [878, 12, 28],
    genreNames: ["Fiksi Ilmiah", "Petualangan", "Aksi"],
    episodeTotal: null,
  },
  {
    tmdbId: 872585,
    mediaType: "movie",
    appType: "movie",
    title: "Oppenheimer",
    originalTitle: "Oppenheimer",
    year: 2023,
    rating: 8,
    voteAverage: 8.1,
    posterUrl: `${TMDB_IMAGE_W500}/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg`,
    backdropUrl: `${TMDB_IMAGE_W1280}/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg`,
    overview:
      "Kisah ilmuwan Amerika J. Robert Oppenheimer dan perannya dalam pengembangan bom atom pada Proyek Manhattan.",
    genreIds: [18, 36],
    genreNames: ["Drama", "Sejarah"],
    episodeTotal: null,
  },
  {
    tmdbId: 209867,
    mediaType: "tv",
    appType: "anime",
    title: "Frieren: Beyond Journey's End",
    originalTitle: "葬送のフリーレン",
    year: 2023,
    rating: 9,
    voteAverage: 8.9,
    posterUrl: `${TMDB_IMAGE_W500}/dqZENchTd7lp5zht7BdlqM7RBhD.jpg`,
    backdropUrl: `${TMDB_IMAGE_W1280}/9faGSFi5jam6pDWGNd0p8JcJgXQ.jpg`,
    overview:
      "Setelah mengalahkan Raja Iblis bersama kelompok pahlawannya, penyihir elf Frieren memulai perjalanan baru untuk memahami arti waktu dan manusia.",
    genreIds: [16, 12, 14, 18],
    genreNames: ["Animasi", "Petualangan", "Fantasi", "Drama"],
    episodeTotal: 28,
  },
  {
    tmdbId: 157336,
    mediaType: "movie",
    appType: "movie",
    title: "Interstellar",
    originalTitle: "Interstellar",
    year: 2014,
    rating: 9,
    voteAverage: 8.5,
    posterUrl: `${TMDB_IMAGE_W500}/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg`,
    backdropUrl: `${TMDB_IMAGE_W1280}/xJHokMbljvjADYdit5fK5VQsXEG.jpg`,
    overview:
      "Tim penjelajah antariksa melakukan perjalanan melewati lubang cacing di luar angkasa dalam upaya memastikan kelangsungan hidup umat manusia.",
    genreIds: [12, 18, 878],
    genreNames: ["Petualangan", "Drama", "Fiksi Ilmiah"],
    episodeTotal: null,
  },
  {
    tmdbId: 569094,
    mediaType: "movie",
    appType: "movie",
    title: "Spider-Man: Across the Spider-Verse",
    originalTitle: "Spider-Man: Across the Spider-Verse",
    year: 2023,
    rating: 8,
    voteAverage: 8.4,
    posterUrl: `${TMDB_IMAGE_W500}/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg`,
    backdropUrl: `${TMDB_IMAGE_W1280}/4HodYYKEIsGOdinkGi2Ucz6X9i0.jpg`,
    overview:
      "Miles Morales melintasi Multiverse dan bertemu dengan Spider-Society, tim Spider-People yang bertugas melindungi eksistensi Multiverse.",
    genreIds: [16, 28, 12, 878],
    genreNames: ["Animasi", "Aksi", "Petualangan", "Fiksi Ilmiah"],
    episodeTotal: null,
  },
  {
    tmdbId: 136315,
    mediaType: "tv",
    appType: "series",
    title: "The Bear",
    originalTitle: "The Bear",
    year: 2022,
    rating: 8,
    voteAverage: 8.3,
    posterUrl: `${TMDB_IMAGE_W500}/sHFlbKS3WLqMnp9t2ghADIJFnuQ.jpg`,
    backdropUrl: `${TMDB_IMAGE_W1280}/zpi5b0B2Y4Y6rC6V6x9v1u5c3c.jpg`,
    overview:
      "Seorang koki muda dari dunia fine dining kembali ke Chicago untuk mengelola kedai sandwich milik keluarganya.",
    genreIds: [18, 35],
    genreNames: ["Drama", "Komedi"],
    episodeTotal: 28,
  },
  {
    tmdbId: 95396,
    mediaType: "tv",
    appType: "series",
    title: "Severance",
    originalTitle: "Severance",
    year: 2022,
    rating: 8,
    voteAverage: 8.4,
    posterUrl: `${TMDB_IMAGE_W500}/pPHpeI2X1qEd1CS1SeyrdhZ4qnT.jpg`,
    backdropUrl: `${TMDB_IMAGE_W1280}/ixgFmf1X59PUZam2qbAfskx2gQr.jpg`,
    overview:
      "Mark memimpin tim pekerja kantor yang ingatannya telah dipisahkan secara bedah antara kehidupan kerja dan kehidupan pribadi mereka.",
    genreIds: [18, 9648, 878, 53],
    genreNames: ["Drama", "Misteri", "Fiksi Ilmiah", "Thriller"],
    episodeTotal: 19,
  },
  {
    tmdbId: 129,
    mediaType: "movie",
    appType: "anime",
    title: "Spirited Away",
    originalTitle: "千と千尋の神隠し",
    year: 2001,
    rating: 9,
    voteAverage: 8.5,
    posterUrl: `${TMDB_IMAGE_W500}/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg`,
    backdropUrl: `${TMDB_IMAGE_W1280}/bSXfU4dwZyBA1vMmXvejdRXBvuF.jpg`,
    overview:
      "Gadis kecil bernama Chihiro terjebak di dunia roh yang diperintah oleh penyihir Yubaba setelah kedua orang tuanya berubah menjadi babi.",
    genreIds: [16, 10751, 14],
    genreNames: ["Animasi", "Keluarga", "Fantasi"],
    episodeTotal: null,
  },
  {
    tmdbId: 496243,
    mediaType: "movie",
    appType: "movie",
    title: "Parasite",
    originalTitle: "기생충",
    year: 2019,
    rating: 9,
    voteAverage: 8.5,
    posterUrl: `${TMDB_IMAGE_W500}/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg`,
    backdropUrl: `${TMDB_IMAGE_W1280}/TU9NIjwzjoKPwQHoHshkFcQUCG.jpg`,
    overview:
      "Keluarga Ki-taek yang menganggur menjadi sangat tertarik dengan gaya hidup keluarga Park yang kaya raya hingga memicu kejadian tak terduga.",
    genreIds: [35, 53, 18],
    genreNames: ["Komedi", "Thriller", "Drama"],
    episodeTotal: null,
  },
  {
    tmdbId: 1396,
    mediaType: "tv",
    appType: "series",
    title: "Breaking Bad",
    originalTitle: "Breaking Bad",
    year: 2008,
    rating: 9,
    voteAverage: 8.9,
    posterUrl: `${TMDB_IMAGE_W500}/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg`,
    backdropUrl: `${TMDB_IMAGE_W1280}/gc8PfyTqzqltKPW3X0cIVUGmagz.jpg`,
    overview:
      "Seorang guru kimia SMA yang didiagnosis menderita kanker paru-paru beralih memproduksi metamfetamin bersama mantan muridnya demi masa depan keluarganya.",
    genreIds: [18, 80, 53],
    genreNames: ["Drama", "Kejahatan", "Thriller"],
    episodeTotal: 62,
  },
  {
    tmdbId: 94605,
    mediaType: "tv",
    appType: "series",
    title: "Arcane",
    originalTitle: "Arcane",
    year: 2021,
    rating: 9,
    voteAverage: 8.8,
    posterUrl: `${TMDB_IMAGE_W500}/fqldf2t8ztc9aiwn3k6mlX3tvRT.jpg`,
    backdropUrl: `${TMDB_IMAGE_W1280}/rkB4LyZHo1NHXFEDHl9vSD9r1lI.jpg`,
    overview:
      "Di tengah ketegangan tajam antara kota kembar Piltover yang makmur dan Zaun yang kumuh, dua saudari bertarung di pihak yang berseberangan.",
    genreIds: [16, 878, 12, 28, 18],
    genreNames: ["Animasi", "Fiksi Ilmiah", "Petualangan", "Aksi", "Drama"],
    episodeTotal: 18,
  },
  {
    tmdbId: 240411,
    mediaType: "tv",
    appType: "anime",
    title: "Dan Da Dan",
    originalTitle: "ダンダダン",
    year: 2024,
    rating: 9,
    voteAverage: 8.7,
    posterUrl: `${TMDB_IMAGE_W500}/6qfZAOEUFIrbUH3JvePclx1nXzz.jpg`,
    backdropUrl: `${TMDB_IMAGE_W1280}/3GQKYh6Trm8pxd2AypovoYQf4Ay.jpg`,
    overview:
      "Momo yang percaya pada hantu tetapi tidak percaya alien, dan Okarun yang percaya alien tetapi tidak percaya hantu, menghadapi fenomena supranatural yang kacau.",
    genreIds: [16, 28, 35, 878],
    genreNames: ["Animasi", "Aksi", "Komedi", "Fiksi Ilmiah"],
    episodeTotal: 12,
  },
  {
    tmdbId: 1429,
    mediaType: "tv",
    appType: "anime",
    title: "Attack on Titan",
    originalTitle: "進撃の巨人",
    year: 2013,
    rating: 9,
    voteAverage: 8.7,
    posterUrl: `${TMDB_IMAGE_W500}/hTP1DtLGFamjfu8WqjnuQdP1n4i.jpg`,
    backdropUrl: `${TMDB_IMAGE_W1280}/rqbCbjB19amtOtFQbb3K2lgm2zv.jpg`,
    overview:
      "Setelah kampung halamannya dihancurkan dan ibunya terbunuh, Eren Yeager bersumpah membersihkan bumi dari para Titan raksasa yang memburu umat manusia.",
    genreIds: [16, 28, 18, 14],
    genreNames: ["Animasi", "Aksi", "Drama", "Fantasi"],
    episodeTotal: 89,
  },
  {
    tmdbId: 414906,
    mediaType: "movie",
    appType: "movie",
    title: "The Batman",
    originalTitle: "The Batman",
    year: 2022,
    rating: 8,
    voteAverage: 7.7,
    posterUrl: `${TMDB_IMAGE_W500}/74xTEgt7R36Fpooo50r9T25onhq.jpg`,
    backdropUrl: `${TMDB_IMAGE_W1280}/b0PlSFdDwbyK0cf5RxwDpaOJQvQ.jpg`,
    overview:
      "Pada tahun keduanya memerangi kejahatan, Batman mengungkap korupsi di Gotham City yang terhubung dengan keluarganya sendiri sambil memburu The Riddler.",
    genreIds: [80, 9648, 53, 28],
    genreNames: ["Kejahatan", "Misteri", "Thriller", "Aksi"],
    episodeTotal: null,
  },
  {
    tmdbId: 372058,
    mediaType: "movie",
    appType: "anime",
    title: "Your Name.",
    originalTitle: "君の名は。",
    year: 2016,
    rating: 9,
    voteAverage: 8.5,
    posterUrl: `${TMDB_IMAGE_W500}/q719jXXEzOoYaps6babgKnONONX.jpg`,
    backdropUrl: `${TMDB_IMAGE_W1280}/dIWwZW7dJJtqC6CgWzYkNVKIUm8.jpg`,
    overview:
      "Dua remaja menemukan bahwa mereka terhubung secara ajaib dan saling bertukar tubuh dalam mimpi, lalu berusaha mencari satu sama lain.",
    genreIds: [16, 10749, 18, 14],
    genreNames: ["Animasi", "Romansa", "Drama", "Fantasi"],
    episodeTotal: null,
  },
  {
    tmdbId: 100088,
    mediaType: "tv",
    appType: "series",
    title: "The Last of Us",
    originalTitle: "The Last of Us",
    year: 2023,
    rating: 9,
    voteAverage: 8.6,
    posterUrl: `${TMDB_IMAGE_W500}/uKvVjHNqB5VmOrdxqAt2F7J78ED.jpg`,
    backdropUrl: `${TMDB_IMAGE_W1280}/uDgy6hyPd82kOHh6I95FLtLnj6p.jpg`,
    overview:
      "Dua puluh tahun setelah peradaban modern hancur akibat pandemi jamur, Joel disewa untuk menyelundupkan Ellie keluar dari zona karantina yang menindas.",
    genreIds: [18, 28, 12, 27],
    genreNames: ["Drama", "Aksi", "Petualangan", "Horor"],
    episodeTotal: 16,
  },
  {
    tmdbId: 545611,
    mediaType: "movie",
    appType: "movie",
    title: "Everything Everywhere All at Once",
    originalTitle: "Everything Everywhere All at Once",
    year: 2022,
    rating: 8,
    voteAverage: 7.8,
    posterUrl: `${TMDB_IMAGE_W500}/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg`,
    backdropUrl: `${TMDB_IMAGE_W1280}/ss0Os3uWJfQAENILHZUdX8Tt1OC.jpg`,
    overview:
      "Seorang imigran paruh baya Tionghoa terseret ke dalam petualangan gila di mana hanya dia yang dapat menyelamatkan eksistensi dengan menjelajahi alam semesta lain.",
    genreIds: [28, 12, 878, 35],
    genreNames: ["Aksi", "Petualangan", "Fiksi Ilmiah", "Komedi"],
    episodeTotal: null,
  },
  {
    tmdbId: 126308,
    mediaType: "tv",
    appType: "series",
    title: "Shōgun",
    originalTitle: "Shōgun",
    year: 2024,
    rating: 9,
    voteAverage: 8.5,
    posterUrl: `${TMDB_IMAGE_W500}/7O4iVfOMQmdCSxhOg1WnzG1AgYT.jpg`,
    backdropUrl: `${TMDB_IMAGE_W1280}/5zmiBoMzeeVdQ62no55JOJMY498.jpg`,
    overview:
      "Berlatar di Jepang tahun 1600 pada awal perang saudara yang menentukan satu abad, Lord Yoshii Toranaga berjuang mempertahankan hidupnya saat musuh di Dewan Bupati bersatu melawannya.",
    genreIds: [18, 36, 10752, 12],
    genreNames: ["Drama", "Sejarah", "Perang", "Petualangan"],
    episodeTotal: 10,
  },
  {
    tmdbId: 155,
    mediaType: "movie",
    appType: "movie",
    title: "The Dark Knight",
    originalTitle: "The Dark Knight",
    year: 2008,
    rating: 9,
    voteAverage: 8.5,
    posterUrl: `${TMDB_IMAGE_W500}/qJ2tW6WMUDux911r6m7haRef0WH.jpg`,
    backdropUrl: `${TMDB_IMAGE_W1280}/nMKdUUepR0i5zn0y1T4CsSB5chy.jpg`,
    overview:
      "Batman bersama Letnan Jim Gordon dan Jaksa Wilayah Harvey Dent bekerja sama membongkar organisasi kriminal di Gotham, namun dihadang oleh dalang kriminal The Joker.",
    genreIds: [18, 28, 80, 53],
    genreNames: ["Drama", "Aksi", "Kejahatan", "Thriller"],
    episodeTotal: null,
  },
  {
    tmdbId: 206559,
    mediaType: "tv",
    appType: "anime",
    title: "The Apothecary Diaries",
    originalTitle: "薬屋のひとりごと",
    year: 2023,
    rating: 9,
    voteAverage: 8.8,
    posterUrl: `${TMDB_IMAGE_W500}/e3ojpANrFnmJCyeBNTinaf8s2hM.jpg`,
    backdropUrl: `${TMDB_IMAGE_W1280}/6UH52Fmau8RPsMAbQbjwN3wJSCj.jpg`,
    overview:
      "Maomao, seorang gadis yang terobsesi dengan racun dan obat-obatan, bekerja sebagai pelayan di istana kekaisaran dan memecahkan berbagai misteri medis.",
    genreIds: [16, 9648, 18, 36],
    genreNames: ["Animasi", "Misteri", "Drama", "Sejarah"],
    episodeTotal: 24,
  },
];

/**
 * Reads TMDB_API_KEY from process.env or dynamically from .env on disk
 * so saving .env in editor works immediately without restarting next dev.
 */
export function getTmdbApiKey(): string {
  const fromEnv = process.env.TMDB_API_KEY?.trim();
  if (fromEnv) return fromEnv;

  try {
    const envPath = path.join(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");
      const match = content.match(/^\s*TMDB_API_KEY\s*=\s*(.*)\s*$/m);
      if (match && match[1]) {
        const cleaned = match[1].trim().replace(/^["']|["']$/g, "").trim();
        if (cleaned) return cleaned;
      }
    }
  } catch {
    // ignore file read errors
  }

  return "";
}

export function isTmdbConfigured(): boolean {
  return Boolean(getTmdbApiKey());
}

async function fetchTmdbJson<T>(
  endpointPath: string,
  params: Record<string, string | number | undefined> = {}
): Promise<T | null> {
  const apiKey = getTmdbApiKey();
  if (!apiKey) return null;

  const url = new URL(`${TMDB_BASE_URL}${endpointPath}`);
  const isBearerToken = apiKey.startsWith("eyJ") || apiKey.length > 45;

  if (!isBearerToken) {
    url.searchParams.set("api_key", apiKey);
  }

  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") {
      url.searchParams.set(k, String(v));
    }
  }

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(isBearerToken ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      cache: "no-store",
    });

    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

type RawTmdbItem = {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  original_language?: string;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  poster_path?: string | null;
  backdrop_path?: string | null;
  overview?: string;
  genre_ids?: number[];
  genres?: { id: number; name: string }[];
  number_of_episodes?: number | null;
};

function parseYear(dateStr?: string): number | null {
  if (!dateStr || dateStr.length < 4) return null;
  const yr = Number(dateStr.slice(0, 4));
  return Number.isInteger(yr) && yr >= 1888 && yr <= 2100 ? yr : null;
}

function normalizeTmdbItem(
  raw: RawTmdbItem,
  defaultMediaType: "movie" | "tv" = "movie"
): TmdbMediaItem | null {
  const mediaType: "movie" | "tv" =
    raw.media_type === "tv"
      ? "tv"
      : raw.media_type === "movie"
        ? "movie"
        : defaultMediaType;

  const title = (raw.title || raw.name || "").trim();
  if (!title) return null;

  const originalTitle = (
    raw.original_title ||
    raw.original_name ||
    title
  ).trim();

  const rawGenreIds =
    raw.genre_ids ?? (raw.genres ? raw.genres.map((g) => g.id) : []);

  // Expand TV composite genre IDs so movie genre filters (Action 28, Adventure 12, Sci-Fi 878, Fantasy 14, War 10752) match TV items seamlessly
  const genreIdsSet = new Set<number>(rawGenreIds);
  if (genreIdsSet.has(10759)) {
    genreIdsSet.add(28);
    genreIdsSet.add(12);
  }
  if (genreIdsSet.has(10765)) {
    genreIdsSet.add(878);
    genreIdsSet.add(14);
  }
  if (genreIdsSet.has(10768)) {
    genreIdsSet.add(10752);
  }
  const genreIds = Array.from(genreIdsSet);

  const isAnime =
    genreIds.includes(16) &&
    (raw.original_language === "ja" ||
      /[\u3040-\u30ff\u4e00-\u9faf]/.test(originalTitle));

  const appType: TitleTypeValue = isAnime
    ? "anime"
    : mediaType === "tv"
      ? "series"
      : "movie";

  const year = parseYear(raw.release_date || raw.first_air_date);
  const voteAvg =
    typeof raw.vote_average === "number" && raw.vote_average > 0
      ? Math.round(raw.vote_average * 10) / 10
      : 0;
  const rating =
    voteAvg >= 1 ? Math.min(10, Math.max(1, Math.round(voteAvg))) : null;

  const posterUrl = raw.poster_path
    ? `${TMDB_IMAGE_W500}${raw.poster_path}`
    : null;
  const backdropUrl = raw.backdrop_path
    ? `${TMDB_IMAGE_W1280}${raw.backdrop_path}`
    : posterUrl;

  const genreNames = genreIds
    .map((id) => GENRE_NAME_MAP[id])
    .filter((n): n is string => Boolean(n));

  return {
    tmdbId: raw.id,
    mediaType,
    appType,
    title: title.slice(0, 200),
    originalTitle: originalTitle.slice(0, 200),
    year,
    rating,
    voteAverage: voteAvg,
    posterUrl,
    backdropUrl,
    overview: (raw.overview || "").trim(),
    genreIds,
    genreNames,
    episodeTotal:
      typeof raw.number_of_episodes === "number" && raw.number_of_episodes > 0
        ? raw.number_of_episodes
        : null,
  };
}

export async function getTmdbGenres(): Promise<TmdbGenre[]> {
  const data = await fetchTmdbJson<{ genres?: { id: number; name: string }[] }>(
    "/genre/movie/list",
    { language: "id-ID" }
  );

  if (!data?.genres || data.genres.length === 0) {
    return STANDARD_TMDB_GENRES;
  }

  return data.genres.map((g) => ({
    id: g.id,
    name: GENRE_NAME_MAP[g.id] || g.name,
  }));
}

function mapMovieGenreToTvGenre(genreId: number): number {
  if (genreId === 28 || genreId === 12) return 10759; // Action & Adventure
  if (genreId === 878 || genreId === 14) return 10765; // Sci-Fi & Fantasy
  if (genreId === 10752) return 10768; // War & Politics
  return genreId;
}

export async function discoverTmdbMedia(options: {
  category?: TmdbDashboardCategory;
  genreId?: number | null;
  mediaType?: "all" | "movie" | "tv";
}): Promise<{
  items: TmdbMediaItem[];
  genres: TmdbGenre[];
  configured: boolean;
  source: "tmdb" | "fallback";
}> {
  const category = options.category ?? "trending";
  const genreId = options.genreId ?? null;
  const mediaType = options.mediaType ?? "all";
  const configured = isTmdbConfigured();

  const genres = await getTmdbGenres();

  if (configured) {
    const baseParams: Record<string, string | number | undefined> = {
      language: "id-ID",
      include_adult: "false",
    };

    const sortBy =
      category === "top_rated" ? "vote_average.desc" : "popularity.desc";

    // Case 1: Genre filter is active
    if (genreId) {
      if (mediaType === "tv" || category === "popular_tv") {
        const tvGenre = mapMovieGenreToTvGenre(genreId);
        const res = await fetchTmdbJson<{ results?: RawTmdbItem[] }>(
          "/discover/tv",
          {
            ...baseParams,
            with_genres: tvGenre,
            sort_by: sortBy,
            ...(category === "top_rated" ? { "vote_count.gte": 100 } : {}),
          }
        );
        const items = (res?.results ?? [])
          .map((r) => normalizeTmdbItem(r, "tv"))
          .filter(
            (item): item is TmdbMediaItem =>
              item !== null && Boolean(item.posterUrl)
          );
        if (items.length > 0) {
          return {
            items: items.slice(0, 20),
            genres,
            configured: true,
            source: "tmdb",
          };
        }
      } else if (mediaType === "movie" || category === "popular_movies") {
        const res = await fetchTmdbJson<{ results?: RawTmdbItem[] }>(
          "/discover/movie",
          {
            ...baseParams,
            with_genres: genreId,
            sort_by: sortBy,
            ...(category === "top_rated" ? { "vote_count.gte": 200 } : {}),
          }
        );
        const items = (res?.results ?? [])
          .map((r) => normalizeTmdbItem(r, "movie"))
          .filter(
            (item): item is TmdbMediaItem =>
              item !== null && Boolean(item.posterUrl)
          );
        if (items.length > 0) {
          return {
            items: items.slice(0, 20),
            genres,
            configured: true,
            source: "tmdb",
          };
        }
      } else {
        // mediaType === "all": fetch both movies and TV for this genre and interleave
        const tvGenre = mapMovieGenreToTvGenre(genreId);
        const [movieRes, tvRes] = await Promise.all([
          fetchTmdbJson<{ results?: RawTmdbItem[] }>("/discover/movie", {
            ...baseParams,
            with_genres: genreId,
            sort_by: sortBy,
            ...(category === "top_rated" ? { "vote_count.gte": 200 } : {}),
          }),
          fetchTmdbJson<{ results?: RawTmdbItem[] }>("/discover/tv", {
            ...baseParams,
            with_genres: tvGenre,
            sort_by: sortBy,
            ...(category === "top_rated" ? { "vote_count.gte": 100 } : {}),
          }),
        ]);

        const movies = (movieRes?.results ?? [])
          .map((r) => normalizeTmdbItem(r, "movie"))
          .filter(
            (item): item is TmdbMediaItem =>
              item !== null && Boolean(item.posterUrl)
          );
        const tvs = (tvRes?.results ?? [])
          .map((r) => normalizeTmdbItem(r, "tv"))
          .filter(
            (item): item is TmdbMediaItem =>
              item !== null && Boolean(item.posterUrl)
          );

        const combined: TmdbMediaItem[] = [];
        const maxLen = Math.max(movies.length, tvs.length);
        for (let i = 0; i < maxLen; i++) {
          if (movies[i]) combined.push(movies[i]);
          if (tvs[i]) combined.push(tvs[i]);
        }

        if (combined.length > 0) {
          return {
            items: combined.slice(0, 20),
            genres,
            configured: true,
            source: "tmdb",
          };
        }
      }
    } else {
      // Case 2: No genre filter — fetch by category & mediaType
      let endpoint = "/trending/all/week";
      let defaultType: "movie" | "tv" = "movie";

      if (mediaType === "tv") {
        defaultType = "tv";
        if (category === "trending") endpoint = "/trending/tv/week";
        else if (category === "top_rated") endpoint = "/tv/top_rated";
        else if (category === "now_playing") endpoint = "/tv/on_the_air";
        else endpoint = "/tv/popular";
      } else if (mediaType === "movie") {
        defaultType = "movie";
        if (category === "trending") endpoint = "/trending/movie/week";
        else if (category === "top_rated") endpoint = "/movie/top_rated";
        else if (category === "now_playing") endpoint = "/movie/now_playing";
        else endpoint = "/movie/popular";
      } else {
        switch (category) {
          case "popular_movies":
            endpoint = "/movie/popular";
            defaultType = "movie";
            break;
          case "top_rated":
            endpoint = "/movie/top_rated";
            defaultType = "movie";
            break;
          case "popular_tv":
            endpoint = "/tv/popular";
            defaultType = "tv";
            break;
          case "now_playing":
            endpoint = "/movie/now_playing";
            defaultType = "movie";
            break;
          case "trending":
          default:
            endpoint = "/trending/all/week";
            defaultType = "movie";
            break;
        }
      }

      const res = await fetchTmdbJson<{ results?: RawTmdbItem[] }>(
        endpoint,
        baseParams
      );

      if (res?.results && res.results.length > 0) {
        const items = res.results
          .filter((r) => r.media_type !== "person")
          .map((r) => normalizeTmdbItem(r, defaultType))
          .filter(
            (item): item is TmdbMediaItem =>
              item !== null && Boolean(item.posterUrl)
          );

        if (items.length > 0) {
          return {
            items: items.slice(0, 20),
            genres,
            configured: true,
            source: "tmdb",
          };
        }
      }
    }
  }

  // Fallback curated catalog filtered by category, mediaType, and genreId
  let fallback = [...CURATED_TMDB_CATALOG];

  if (genreId) {
    fallback = fallback.filter((item) => item.genreIds.includes(genreId));
  }

  if (category === "popular_movies") {
    fallback = fallback.filter((item) => item.mediaType === "movie");
  } else if (category === "popular_tv") {
    fallback = fallback.filter((item) => item.mediaType === "tv");
  } else if (category === "top_rated") {
    fallback.sort((a, b) => b.voteAverage - a.voteAverage);
  } else if (category === "now_playing") {
    fallback = fallback.filter((item) => (item.year ?? 0) >= 2023);
  }

  if (mediaType === "movie") {
    fallback = fallback.filter((item) => item.mediaType === "movie");
  } else if (mediaType === "tv") {
    fallback = fallback.filter((item) => item.mediaType === "tv");
  }

  return {
    items: fallback,
    genres,
    configured,
    source: "fallback",
  };
}

export async function searchTmdbMedia(
  query: string,
  typeFilter?: TitleTypeValue | "all"
): Promise<{
  items: TmdbMediaItem[];
  configured: boolean;
  source: "tmdb" | "fallback";
}> {
  const trimmed = query.trim();
  const configured = isTmdbConfigured();

  if (!trimmed) {
    return {
      items: CURATED_TMDB_CATALOG.slice(0, 6),
      configured,
      source: configured ? "tmdb" : "fallback",
    };
  }

  if (configured) {
    const endpoint =
      typeFilter === "movie"
        ? "/search/movie"
        : typeFilter === "series"
          ? "/search/tv"
          : "/search/multi";

    const defaultType: "movie" | "tv" =
      typeFilter === "series" ? "tv" : "movie";

    const res = await fetchTmdbJson<{ results?: RawTmdbItem[] }>(endpoint, {
      query: trimmed,
      language: "id-ID",
      include_adult: "false",
    });

    if (res?.results) {
      const normalized = res.results
        .filter(
          (r) =>
            r.media_type === undefined ||
            r.media_type === "movie" ||
            r.media_type === "tv"
        )
        .map((r) => normalizeTmdbItem(r, defaultType))
        .filter((item): item is TmdbMediaItem => item !== null);

      // Prioritize items that have a cover poster first
      normalized.sort((a, b) => {
        if (Boolean(a.posterUrl) !== Boolean(b.posterUrl)) {
          return a.posterUrl ? -1 : 1;
        }
        return b.voteAverage - a.voteAverage;
      });

      if (normalized.length > 0) {
        return {
          items: normalized.slice(0, 8),
          configured: true,
          source: "tmdb",
        };
      }
    }
  }

  // Fallback search in curated catalog
  const q = trimmed.toLowerCase();
  const matched = CURATED_TMDB_CATALOG.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      item.originalTitle.toLowerCase().includes(q) ||
      item.genreNames.some((g) => g.toLowerCase().includes(q))
  );

  return {
    items: matched.slice(0, 8),
    configured,
    source: "fallback",
  };
}

export async function getTmdbMediaDetails(
  mediaType: "movie" | "tv",
  tmdbId: number
): Promise<TmdbMediaItem | null> {
  if (!Number.isInteger(tmdbId) || tmdbId <= 0) return null;

  const raw = await fetchTmdbJson<RawTmdbItem>(`/${mediaType}/${tmdbId}`, {
    language: "id-ID",
  });

  if (raw) {
    return normalizeTmdbItem(raw, mediaType);
  }

  return (
    CURATED_TMDB_CATALOG.find(
      (item) => item.tmdbId === tmdbId && item.mediaType === mediaType
    ) ?? null
  );
}

