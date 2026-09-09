import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AuthorizationModule } from "../authorization/authorization.module";
import { CareModule } from "../care/care.module";
import { ClinicalOperationsController } from "./clinical-operations.controller";
import { ClinicalOperationsService } from "./clinical-operations.service";

@Module({ imports: [AuthModule, AuthorizationModule, CareModule], controllers: [ClinicalOperationsController], providers: [ClinicalOperationsService] })
export class ClinicalOperationsModule {}
