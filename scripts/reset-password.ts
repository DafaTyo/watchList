import { auth } from "../src/lib/auth";
import { db } from "../src/lib/db";

async function main() {
  const [, , rawEmail, newPassword] = process.argv;

  if (!rawEmail || !newPassword) {
    console.error("Usage: node --env-file=.env scripts/reset-password.ts <email> <new-password>");
    process.exit(1);
  }

  const email = rawEmail.trim().toLowerCase();

  if (newPassword.length < 8 || newPassword.length > 128) {
    console.error("Error: Password must be between 8 and 128 characters.");
    process.exit(1);
  }

  const ctx = await auth.$context;
  const found = await ctx.internalAdapter.findUserByEmail(email);

  if (!found?.user) {
    console.error(`Error: User with email "${email}" not found.`);
    process.exit(1);
  }

  const hashedPassword = await ctx.password.hash(newPassword);
  await ctx.internalAdapter.updatePassword(found.user.id, hashedPassword);
  await ctx.internalAdapter.deleteUserSessions(found.user.id);

  console.log(`Password updated and active sessions revoked for ${email}.`);
}

main()
  .catch((err) => {
    console.error("Failed to reset password:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
