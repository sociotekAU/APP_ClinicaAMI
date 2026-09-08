import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AuthorizationModule } from "../authorization/authorization.module";
import { AdministrationController } from "./administration.controller";
import { AdministrationService } from "./administration.service";

@Module({
  imports: [AuthModule, AuthorizationModule],
  controllers: [AdministrationController],
  providers: [AdministrationService],
})
export class AdministrationModule {}
