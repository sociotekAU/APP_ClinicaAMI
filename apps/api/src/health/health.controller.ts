import { Controller, Get } from "@nestjs/common";
import type { ApiSuccess } from "@ami/contracts";
import { SkipThrottle } from "@nestjs/throttler";
import {
  DatabaseService,
  type DatabaseHealthStatus,
} from "../database/database.service";
import { HealthService, type HealthStatus } from "./health.service";

@SkipThrottle()
@Controller("health")
export class HealthController {
  constructor(
    private readonly healthService: HealthService,
    private readonly databaseService: DatabaseService,
  ) {}

  @Get()
  getHealth(): ApiSuccess<HealthStatus> {
    return {
      data: this.healthService.getStatus(),
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get("database")
  async getDatabaseHealth(): Promise<ApiSuccess<DatabaseHealthStatus>> {
    return {
      data: await this.databaseService.getHealthStatus(),
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }
}
