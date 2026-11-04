"use server";

import { revalidatePath } from "next/cache";
import type { WatchLink } from "@prisma/client";
import { requireUser } from "@/lib/session";
import {
  createWatchLink,
  updateWatchLink,
  deleteWatchLink,
} from "@/lib/services/links";
import { ServiceError } from "@/lib/services/titles";
import type { WatchLinkInput } from "@/lib/validators";
import type { ActionResult } from "./titles";

function handleError<T>(err: unknown): ActionResult<T> {
  if (err instanceof ServiceError) {
    return {
      ok: false,
      error: err.message,
      field: err.field,
    };
  }
  return {
    ok: false,
    error: "Terjadi kesalahan pada server. Silakan coba lagi.",
  };
}

export async function createWatchLinkAction(
  titleId: number,
  input: WatchLinkInput
): Promise<ActionResult<WatchLink>> {
  const user = await requireUser();
  try {
    const created = await createWatchLink(user.id, titleId, input);
    revalidatePath("/watchlist");
    return { ok: true, data: created };
  } catch (err) {
    return handleError(err);
  }
}

export async function updateWatchLinkAction(
  linkId: number,
  input: WatchLinkInput
): Promise<ActionResult<WatchLink>> {
  const user = await requireUser();
  try {
    const updated = await updateWatchLink(user.id, linkId, input);
    revalidatePath("/watchlist");
    return { ok: true, data: updated };
  } catch (err) {
    return handleError(err);
  }
}

export async function deleteWatchLinkAction(
  linkId: number
): Promise<ActionResult<{ deletedId: number }>> {
  const user = await requireUser();
  try {
    const res = await deleteWatchLink(user.id, linkId);
    revalidatePath("/watchlist");
    return { ok: true, data: res };
  } catch (err) {
    return handleError(err);
  }
}

