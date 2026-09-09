import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AdministrationModule } from "./administration/administration.module";
import { AuditModule } from "./audit/audit.module";
import { AuthModule } from "./auth/auth.module";
import { CareModule } from "./care/care.module";
import { ClinicalOperationsModule } from "./clinical-operations/clinical-operations.module";
import { DatabaseModule } from "./database/database.module";
import { ErpModule } from "./erp/erp.module";
import { HealthController } from "./health/health.controller";
import { HealthService } from "./health/health.service";
import { LaboratoryModule } from "./laboratory/laboratory.module";
import { WebContentModule } from "./web-content/web-content.module";

@Module({
  imports: [
    DatabaseModule,
    AuditModule,
    AuthModule,
    CareModule,
    ClinicalOperationsModule,
    LaboratoryModule,
    AdministrationModule,
    WebContentModule,
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
