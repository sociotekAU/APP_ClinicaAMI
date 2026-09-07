import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AuthorizationModule } from "../authorization/authorization.module";
import { ErpController } from "./erp.controller";
import { ErpService } from "./erp.service";

@Module({
  imports: [AuthModule, AuthorizationModule],
  controllers: [ErpController],
  providers: [ErpService],
})
export class ErpModule {}
