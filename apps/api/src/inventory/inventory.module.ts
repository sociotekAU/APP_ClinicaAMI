import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AuthorizationModule } from "../authorization/authorization.module";
import { InventoryController } from "./inventory.controller";
import { PublicInventoryController } from "./public-inventory.controller";
import { InventoryService } from "./inventory.service";

@Module({ imports: [AuthModule, AuthorizationModule], controllers: [InventoryController, PublicInventoryController], providers: [InventoryService] })
export class InventoryModule {}
