import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import type { PrismaClient } from "@/generated/prisma/client";
import { PrismaClient as PrismaClientCtor } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pgPool?: Pool;
};

function getPool() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  if (!globalForPrisma.pgPool) {
    globalForPrisma.pgPool = new Pool({ connectionString: url });
  }
  return globalForPrisma.pgPool;
}

function createPrismaClient(): PrismaClient {
  const pool = getPool();
  const adapter = new PrismaPg(pool);
  return new PrismaClientCtor({ adapter }) as PrismaClient;
}

function getClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client as object, prop, receiver);
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(client);
    }
    return value;
  },
});
