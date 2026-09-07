import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv({ path: resolve(process.cwd(), ".env"), quiet: true });
loadEnv({ path: resolve(process.cwd(), "../../.env"), quiet: true });

function requireValue(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}.`);
  }

  return value;
}

export function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const user = encodeURIComponent(requireValue("POSTGRES_USER"));
  const password = encodeURIComponent(requireValue("POSTGRES_PASSWORD"));
  const database = encodeURIComponent(requireValue("POSTGRES_DB"));
  const host = process.env.POSTGRES_HOST ?? "127.0.0.1";
  const port = process.env.POSTGRES_PORT ?? "5432";

  return `postgresql://${user}:${password}@${host}:${port}/${database}?schema=public`;
}
