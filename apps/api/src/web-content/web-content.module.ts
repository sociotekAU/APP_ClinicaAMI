import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AuthorizationModule } from "../authorization/authorization.module";
import { WebContentController } from "./web-content.controller";
import { WebContentService } from "./web-content.service";

@Module({
  imports: [AuthModule, AuthorizationModule],
  controllers: [WebContentController],
  providers: [WebContentService],
})
export class WebContentModule {}
