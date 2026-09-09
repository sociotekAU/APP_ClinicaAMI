import { Module } from "@nestjs/common";
import { AuthorizationService } from "./authorization.service";
import { PermissionGuard } from "./guards/permission.guard";
import { AdminRoleGuard } from "./guards/admin-role.guard";

@Module({
  exports: [AdminRoleGuard, AuthorizationService, PermissionGuard],
  providers: [AdminRoleGuard, AuthorizationService, PermissionGuard],
})
export class AuthorizationModule {}
