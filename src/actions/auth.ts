"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function logoutAction(): Promise<{ ok: boolean }> {
  try {
    await auth.api.signOut({
      headers: await headers(),
    });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
