import type { Prisma, Title, TitleStatus, WatchLink } from "@prisma/client";
import { db } from "@/lib/db";
import {
  titleInputSchema,
  TitleStatusEnum,
  notesInputSchema,
  type TitleInput,
  type TitleStatusValue,
} from "@/lib/validators";

export const MAX_TITLES_PER_USER = 500;

export type TitleWithLinks = Title & {
  links: WatchLink[];
};

export type WatchlistStats = {
  completed: number;
  planned: number;
  watching: number;
  on_hold: number;
  dropped: number;
  total: number;
};

export class ServiceError extends Error {
  code: string;
  field?: string;

  constructor(message: string, code = "BAD_REQUEST", field?: string) {
    super(message);
    this.name = "ServiceError";
    this.code = code;
    this.field = field;
  }
}

export async function listUserTitles(userId: string): Promise<TitleWithLinks[]> {
  return db.title.findMany({
    where: { userId },
    include: {
      links: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      },
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: MAX_TITLES_PER_USER,
  });
}

export async function getUserTitleById(
  userId: string,
  titleId: number
): Promise<TitleWithLinks | null> {
  return db.title.findFirst({
    where: {
      id: titleId,
      userId,
    },
    include: {
      links: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      },
    },
  });
}

export async function getUserWatchlistStats(userId: string): Promise<WatchlistStats> {
  const grouped = await db.title.groupBy({
    by: ["status"],
    where: { userId },
    _count: {
      _all: true,
    },
  });

  const stats: WatchlistStats = {
    completed: 0,
    planned: 0,
    watching: 0,
    on_hold: 0,
    dropped: 0,
    total: 0,
  };

  for (const row of grouped) {
    const count = row._count._all;
    stats[row.status] = count;
    stats.total += count;
  }

  return stats;
}

export function pickFeaturedTitle(titles: TitleWithLinks[]): TitleWithLinks | null {
  if (titles.length === 0) return null;

  const watchingTitles = titles.filter((t) => t.status === "watching");
  const pool = watchingTitles.length > 0 ? watchingTitles : titles;

  return [...pool].sort((a, b) => {
    const diff = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    if (diff !== 0) return diff;
    return b.id - a.id;
  })[0] ?? null;
}

function normalizeTitlePayload(input: TitleInput) {
  const parsed = titleInputSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path?.[0] ? String(issue.path[0]) : undefined;
    throw new ServiceError(
      issue?.message || "Input judul tidak valid.",
      "VALIDATION_ERROR",
      field
    );
  }

  const data = parsed.data;
  const isMovie = data.type === "movie";

  return {
    name: data.name,
    type: data.type,
    status: data.status,
    year: data.year ?? null,
    posterUrl: data.posterUrl?.trim() ? data.posterUrl.trim() : null,
    rating: data.rating ?? null,
    episodeCurrent: isMovie ? 0 : data.episodeCurrent,
    episodeTotal: isMovie ? null : (data.episodeTotal ?? null),
    notes: data.notes?.trim() ? data.notes : null,
  };
}

export async function createTitle(
  userId: string,
  input: TitleInput
): Promise<TitleWithLinks> {
  const payload = normalizeTitlePayload(input);

  return db.$transaction(async (tx: Prisma.TransactionClient) => {
    const count = await tx.title.count({
      where: { userId },
    });

    if (count >= MAX_TITLES_PER_USER) {
      throw new ServiceError(
        `Batas maksimal ${MAX_TITLES_PER_USER} judul telah tercapai.`,
        "QUOTA_EXCEEDED"
      );
    }

    return tx.title.create({
      data: {
        userId,
        ...payload,
      },
      include: {
        links: {
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        },
      },
    });
  });
}

export async function updateTitle(
  userId: string,
  titleId: number,
  input: TitleInput
): Promise<TitleWithLinks> {
  const payload = normalizeTitlePayload(input);

  return db.$transaction(async (tx: Prisma.TransactionClient) => {
    const existing = await tx.title.findFirst({
      where: { id: titleId, userId },
    });

    if (!existing) {
      throw new ServiceError("Judul tidak ditemukan.", "NOT_FOUND");
    }

    return tx.title.update({
      where: { id: existing.id },
      data: payload,
      include: {
        links: {
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        },
      },
    });
  });
}

export async function updateTitleStatus(
  userId: string,
  titleId: number,
  status: TitleStatusValue
): Promise<TitleWithLinks> {
  const parsedStatus = TitleStatusEnum.safeParse(status);
  if (!parsedStatus.success) {
    throw new ServiceError("Status tidak valid.", "VALIDATION_ERROR", "status");
  }

  return db.$transaction(async (tx: Prisma.TransactionClient) => {
    const existing = await tx.title.findFirst({
      where: { id: titleId, userId },
    });

    if (!existing) {
      throw new ServiceError("Judul tidak ditemukan.", "NOT_FOUND");
    }

    return tx.title.update({
      where: { id: existing.id },
      data: { status: parsedStatus.data as TitleStatus },
      include: {
        links: {
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        },
      },
    });
  });
}

export async function updateTitleNotes(
  userId: string,
  titleId: number,
  notes: string | null
): Promise<TitleWithLinks> {
  const parsed = notesInputSchema.safeParse({ notes });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new ServiceError(
      issue?.message || "Catatan tidak valid.",
      "VALIDATION_ERROR",
      "notes"
    );
  }

  return db.$transaction(async (tx: Prisma.TransactionClient) => {
    const existing = await tx.title.findFirst({
      where: { id: titleId, userId },
    });

    if (!existing) {
      throw new ServiceError("Judul tidak ditemukan.", "NOT_FOUND");
    }

    return tx.title.update({
      where: { id: existing.id },
      data: {
        notes: parsed.data.notes?.trim() ? parsed.data.notes : null,
      },
      include: {
        links: {
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        },
      },
    });
  });
}

export async function deleteTitle(
  userId: string,
  titleId: number
): Promise<{ deletedId: number }> {
  const result = await db.title.deleteMany({
    where: {
      id: titleId,
      userId,
    },
  });

  if (result.count === 0) {
    throw new ServiceError("Judul tidak ditemukan.", "NOT_FOUND");
  }

  return { deletedId: titleId };
}

/**
 * Atomic +1 episode progression according to PRD F4:
 * - Only for series and anime.
 * - Does not exceed episode_total if filled.
 * - First +1 on a `planned` title transitions status to `watching`.
 * - Reaching `episode_total` transitions status to `completed`.
 */
export async function incrementEpisode(
  userId: string,
  titleId: number
): Promise<TitleWithLinks> {
  const affected = await db.$executeRaw`
    UPDATE \`titles\`
    SET
      \`episode_current\` = \`episode_current\` + 1,
      \`status\` = CASE
        WHEN \`episode_total\` IS NOT NULL AND (\`episode_current\` + 1) >= \`episode_total\` THEN 'completed'
        WHEN \`status\` = 'planned' THEN 'watching'
        ELSE \`status\`
      END,
      \`updated_at\` = NOW(3)
    WHERE \`id\` = ${titleId}
      AND \`user_id\` = ${userId}
      AND \`type\` IN ('series', 'anime')
      AND (\`episode_total\` IS NULL OR \`episode_current\` < \`episode_total\`)
  `;

  const updated = await getUserTitleById(userId, titleId);
  if (!updated) {
    throw new ServiceError("Judul tidak ditemukan.", "NOT_FOUND");
  }

  if (updated.type === "movie") {
    throw new ServiceError(
      "Film tidak memiliki progres episode.",
      "INVALID_OPERATION"
    );
  }

  void affected;
  return updated;
}

/**
 * Atomic -1 episode correction according to PRD F4 (minimum 0).
 */
export async function decrementEpisode(
  userId: string,
  titleId: number
): Promise<TitleWithLinks> {
  await db.$executeRaw`
    UPDATE \`titles\`
    SET
      \`episode_current\` = \`episode_current\` - 1,
      \`updated_at\` = NOW(3)
    WHERE \`id\` = ${titleId}
      AND \`user_id\` = ${userId}
      AND \`type\` IN ('series', 'anime')
      AND \`episode_current\` > 0
  `;

  const updated = await getUserTitleById(userId, titleId);
  if (!updated) {
    throw new ServiceError("Judul tidak ditemukan.", "NOT_FOUND");
  }

  if (updated.type === "movie") {
    throw new ServiceError(
      "Film tidak memiliki progres episode.",
      "INVALID_OPERATION"
    );
  }

  return updated;
}

