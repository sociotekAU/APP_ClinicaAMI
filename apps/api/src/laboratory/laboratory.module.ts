import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AuthorizationModule } from "../authorization/authorization.module";
import { CareModule } from "../care/care.module";
import { LaboratoryController } from "./laboratory.controller";
import { LaboratoryService } from "./laboratory.service";

@Module({ imports: [AuthModule, AuthorizationModule, CareModule], controllers: [LaboratoryController], providers: [LaboratoryService] })
export class LaboratoryModule {}
