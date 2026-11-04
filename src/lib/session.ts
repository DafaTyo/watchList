import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
};

export async function getOptionalUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return null;
  }

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getOptionalUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireActionUser(): Promise<SessionUser> {
  const user = await getOptionalUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}
