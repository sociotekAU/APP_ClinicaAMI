import { SetMetadata } from "@nestjs/common";
import type { ErpModuleCode, PermissionAction } from "@ami/contracts";
import {
  PERMISSION_METADATA_KEY,
  type RequiredPermission,
} from "../authorization.constants";

export function RequirePermission(
  module: ErpModuleCode,
  action: PermissionAction,
): MethodDecorator & ClassDecorator {
  return SetMetadata(PERMISSION_METADATA_KEY, [
    { action, module } satisfies RequiredPermission,
  ]);
}
