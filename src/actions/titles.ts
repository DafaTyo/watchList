"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import {
  createTitle,
  updateTitle,
  updateTitleStatus,
  updateTitleNotes,
  deleteTitle,
  incrementEpisode,
  decrementEpisode,
  ServiceError,
  type TitleWithLinks,
} from "@/lib/services/titles";
import type { TitleInput, TitleStatusValue } from "@/lib/validators";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; field?: string };

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

export async function createTitleAction(
  input: TitleInput
): Promise<ActionResult<TitleWithLinks>> {
  const user = await requireUser();
  try {
    const created = await createTitle(user.id, input);
    revalidatePath("/watchlist");
    return { ok: true, data: created };
  } catch (err) {
    return handleError(err);
  }
}

export async function updateTitleAction(
  titleId: number,
  input: TitleInput
): Promise<ActionResult<TitleWithLinks>> {
  const user = await requireUser();
  try {
    const updated = await updateTitle(user.id, titleId, input);
    revalidatePath("/watchlist");
    return { ok: true, data: updated };
  } catch (err) {
    return handleError(err);
  }
}

export async function updateTitleStatusAction(
  titleId: number,
  status: TitleStatusValue
): Promise<ActionResult<TitleWithLinks>> {
  const user = await requireUser();
  try {
    const updated = await updateTitleStatus(user.id, titleId, status);
    revalidatePath("/watchlist");
    return { ok: true, data: updated };
  } catch (err) {
    return handleError(err);
  }
}

export async function updateTitleNotesAction(
  titleId: number,
  notes: string | null
): Promise<ActionResult<TitleWithLinks>> {
  const user = await requireUser();
  try {
    const updated = await updateTitleNotes(user.id, titleId, notes);
    revalidatePath("/watchlist");
    return { ok: true, data: updated };
  } catch (err) {
    return handleError(err);
  }
}

export async function deleteTitleAction(
  titleId: number
): Promise<ActionResult<{ deletedId: number }>> {
  const user = await requireUser();
  try {
    const res = await deleteTitle(user.id, titleId);
    revalidatePath("/watchlist");
    return { ok: true, data: res };
  } catch (err) {
    return handleError(err);
  }
}

export async function incrementEpisodeAction(
  titleId: number
): Promise<ActionResult<TitleWithLinks>> {
  const user = await requireUser();
  try {
    const updated = await incrementEpisode(user.id, titleId);
    revalidatePath("/watchlist");
    return { ok: true, data: updated };
  } catch (err) {
    return handleError(err);
  }
}

export async function decrementEpisodeAction(
  titleId: number
): Promise<ActionResult<TitleWithLinks>> {
  const user = await requireUser();
  try {
    const updated = await decrementEpisode(user.id, titleId);
    revalidatePath("/watchlist");
    return { ok: true, data: updated };
  } catch (err) {
    return handleError(err);
  }
}

