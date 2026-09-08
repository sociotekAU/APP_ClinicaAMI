import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AdministrationModule } from "./administration/administration.module";
import { AuthModule } from "./auth/auth.module";
import { CareModule } from "./care/care.module";
import { DatabaseModule } from "./database/database.module";
import { ErpModule } from "./erp/erp.module";
import { HealthController } from "./health/health.controller";
import { HealthService } from "./health/health.service";

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    CareModule,
    AdministrationModule,
    ErpModule,
    ThrottlerModule.forRoot([
      {
        limit: 120,
        ttl: 60_000,
      },
    ]),
  ],
  controllers: [HealthController],
  providers: [
    HealthService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
