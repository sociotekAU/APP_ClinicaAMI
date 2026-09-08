import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AuthorizationModule } from "../authorization/authorization.module";
import { AgendaController } from "./agenda.controller";
import { AgendaService } from "./agenda.service";
import { CareAccessService } from "./care-access.service";
import { ClinicalRecordsController } from "./clinical-records.controller";
import { ClinicalRecordsService } from "./clinical-records.service";
import { PatientsController } from "./patients.controller";
import { PatientsService } from "./patients.service";

@Module({
  imports: [AuthModule, AuthorizationModule],
  controllers: [PatientsController, AgendaController, ClinicalRecordsController],
  providers: [CareAccessService, PatientsService, AgendaService, ClinicalRecordsService],
})
export class CareModule {}
