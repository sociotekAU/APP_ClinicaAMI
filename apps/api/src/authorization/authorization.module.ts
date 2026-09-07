import { Module } from "@nestjs/common";
import { AuthorizationService } from "./authorization.service";
import { PermissionGuard } from "./guards/permission.guard";

@Module({
  exports: [AuthorizationService, PermissionGuard],
  providers: [AuthorizationService, PermissionGuard],
})
export class AuthorizationModule {}
