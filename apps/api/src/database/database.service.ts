import { Injectable, type OnApplicationShutdown } from "@nestjs/common";
import { createDatabaseClient } from "@ami/database";

interface TableCountResult {
  table_count: bigint;
}

export interface DatabaseHealthStatus {
  expectedTableCount: number;
  status: "ok";
  tableCount: number;
}

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  readonly client = createDatabaseClient();

  async getHealthStatus(): Promise<DatabaseHealthStatus> {
    const [result] = await this.client.$queryRaw<TableCountResult[]>`
      SELECT COUNT(*)::bigint AS table_count
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
    `;

    const tableCount = Number(result?.table_count ?? 0n);

    if (tableCount !== 30) {
      throw new Error(`Se esperaban 30 tablas y PostgreSQL reportó ${tableCount}.`);
    }

    return {
      expectedTableCount: 30,
      status: "ok",
      tableCount,
    };
  }

  async onApplicationShutdown(): Promise<void> {
    await this.client.$disconnect();
  }
}
