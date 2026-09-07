import { afterEach, describe, expect, it } from "vitest";
import { getDatabaseUrl } from "./environment";

const originalDatabaseUrl = process.env.DATABASE_URL;

afterEach(() => {
  if (originalDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = originalDatabaseUrl;
  }
});

describe("getDatabaseUrl", () => {
  it("prefers an explicit DATABASE_URL", () => {
    process.env.DATABASE_URL = "postgresql://example.invalid/ami";

    expect(getDatabaseUrl()).toBe("postgresql://example.invalid/ami");
  });
});
