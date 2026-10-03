import path from "path";
import { PrismaClient } from "@prisma/client";
import { atlasPrisma } from "@/lib/atlas-prisma";
import { atlasUri } from "@/lib/atlas-uri";

function databaseUrl() {
  const url = process.env.DATABASE_URL ?? "";
  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
    return url;
  }
  const file = path.join(process.cwd(), "data", "huepot.db").replaceAll("\\", "/");
  return `file:${file}`;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function openPrisma(): PrismaClient {
  if (atlasUri()) return atlasPrisma() as unknown as PrismaClient;
  return new PrismaClient({
    datasources: { db: { url: databaseUrl() } },
  });
}

export const prisma = globalForPrisma.prisma ?? openPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
