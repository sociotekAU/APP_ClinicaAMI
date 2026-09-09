import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AuthorizationModule } from "../authorization/authorization.module";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";

@Module({ imports: [AuthModule, AuthorizationModule], controllers: [BillingController], providers: [BillingService] })
export class BillingModule {}
