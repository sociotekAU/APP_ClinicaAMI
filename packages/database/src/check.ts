import { createDatabaseClient } from "./client";

interface DatabaseSummary {
  database_name: string;
  schema_name: string;
  table_count: bigint;
}

async function main() {
  const database = createDatabaseClient();

  try {
    const [summary] = await database.$queryRaw<DatabaseSummary[]>`
      SELECT
        current_database() AS database_name,
        current_schema() AS schema_name,
        COUNT(*)::bigint AS table_count
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
    `;

    if (!summary) {
      throw new Error("PostgreSQL no devolvió el resumen esperado.");
    }

    const expectedTables = 31n;
    const status = summary.table_count === expectedTables ? "ok" : "unexpected_table_count";

    process.stdout.write(
      `${JSON.stringify({
        database: summary.database_name,
        schema: summary.schema_name,
        tableCount: Number(summary.table_count),
        expectedTableCount: Number(expectedTables),
        status,
      })}\n`,
    );

    if (status !== "ok") {
      process.exitCode = 1;
    }
  } finally {
    await database.$disconnect();
  }
}

void main();
