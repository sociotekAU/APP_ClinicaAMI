import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";
import { getDatabaseUrl } from "./environment";

export function createDatabaseClient(connectionString = getDatabaseUrl()): PrismaClient {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export type DatabaseClient = PrismaClient;
