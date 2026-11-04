import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { isRegistrationAllowed } from "@/lib/auth";
import { getOptionalUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getOptionalUser();
  if (user) {
    redirect("/watchlist");
  }

  return <AuthForm mode="login" allowRegistration={isRegistrationAllowed()} />;
}
