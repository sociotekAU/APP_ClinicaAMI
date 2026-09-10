import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AuthorizationModule } from "../authorization/authorization.module";
import { CareModule } from "../care/care.module";
import { ClinicalDocumentsService } from "./clinical-documents.service";
import { ConsentsController, StudyFilesController } from "./clinical-documents.controller";
import { PrivateStorageService } from "./private-storage.service";

@Module({
  imports: [AuthModule, AuthorizationModule, CareModule],
  controllers: [StudyFilesController, ConsentsController],
  providers: [ClinicalDocumentsService, PrivateStorageService],
})
export class ClinicalDocumentsModule {}
