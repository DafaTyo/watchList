import type { Prisma, WatchLink } from "@prisma/client";
import { db } from "@/lib/db";
import { watchLinkInputSchema, type WatchLinkInput } from "@/lib/validators";
import { ServiceError } from "./titles";

export const MAX_LINKS_PER_TITLE = 10;

function parseLinkPayload(input: WatchLinkInput) {
  const parsed = watchLinkInputSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path?.[0] ? String(issue.path[0]) : undefined;
    throw new ServiceError(
      issue?.message || "Input link tidak valid.",
      "VALIDATION_ERROR",
      field
    );
  }
  return parsed.data;
}

export async function listTitleLinks(
  userId: string,
  titleId: number
): Promise<WatchLink[]> {
  const title = await db.title.findFirst({
    where: { id: titleId, userId },
    select: { id: true },
  });

  if (!title) {
    throw new ServiceError("Judul tidak ditemukan.", "NOT_FOUND");
  }

  return db.watchLink.findMany({
    where: {
      titleId,
      title: { userId },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
}

export async function createWatchLink(
  userId: string,
  titleId: number,
  input: WatchLinkInput
): Promise<WatchLink> {
  const payload = parseLinkPayload(input);

  return db.$transaction(async (tx: Prisma.TransactionClient) => {
    const title = await tx.title.findFirst({
      where: { id: titleId, userId },
      select: { id: true },
    });

    if (!title) {
      throw new ServiceError("Judul tidak ditemukan.", "NOT_FOUND");
    }

    const linkCount = await tx.watchLink.count({
      where: {
        titleId: title.id,
        title: { userId },
      },
    });

    if (linkCount >= MAX_LINKS_PER_TITLE) {
      throw new ServiceError(
        `Maksimal ${MAX_LINKS_PER_TITLE} link per judul.`,
        "QUOTA_EXCEEDED"
      );
    }

    const created = await tx.watchLink.create({
      data: {
        titleId: title.id,
        label: payload.label,
        url: payload.url,
      },
    });

    await tx.title.update({
      where: { id: title.id },
      data: { updatedAt: new Date() },
    });

    return created;
  });
}

export async function updateWatchLink(
  userId: string,
  linkId: number,
  input: WatchLinkInput
): Promise<WatchLink> {
  const payload = parseLinkPayload(input);

  return db.$transaction(async (tx: Prisma.TransactionClient) => {
    const existing = await tx.watchLink.findFirst({
      where: {
        id: linkId,
        title: { userId },
      },
      select: { id: true, titleId: true },
    });

    if (!existing) {
      throw new ServiceError("Link tidak ditemukan.", "NOT_FOUND");
    }

    const updated = await tx.watchLink.update({
      where: { id: existing.id },
      data: {
        label: payload.label,
        url: payload.url,
      },
    });

    await tx.title.update({
      where: { id: existing.titleId },
      data: { updatedAt: new Date() },
    });

    return updated;
  });
}

export async function deleteWatchLink(
  userId: string,
  linkId: number
): Promise<{ deletedId: number }> {
  return db.$transaction(async (tx: Prisma.TransactionClient) => {
    const existing = await tx.watchLink.findFirst({
      where: {
        id: linkId,
        title: { userId },
      },
      select: { id: true, titleId: true },
    });

    if (!existing) {
      throw new ServiceError("Link tidak ditemukan.", "NOT_FOUND");
    }

    await tx.watchLink.delete({
      where: { id: existing.id },
    });

    await tx.title.update({
      where: { id: existing.titleId },
      data: { updatedAt: new Date() },
    });

    return { deletedId: existing.id };
  });
}

