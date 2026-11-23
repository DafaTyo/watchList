import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getNormalizedDatabaseUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;
  // TiDB Cloud Serverless requires sslaccept=accept_invalid_certs when no local CA cert file path is provided to Prisma 6
  if (raw.includes("tidbcloud.com") && raw.includes("sslaccept=strict")) {
    return raw.replace("sslaccept=strict", "sslaccept=accept_invalid_certs");
  }
  return raw;
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: getNormalizedDatabaseUrl(),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

