import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AuthorizationModule } from "../authorization/authorization.module";
import { InventoryController } from "./inventory.controller";
import { InventoryService } from "./inventory.service";

@Module({ imports: [AuthModule, AuthorizationModule], controllers: [InventoryController], providers: [InventoryService] })
export class InventoryModule {}
