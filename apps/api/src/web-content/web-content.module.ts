import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AuthorizationModule } from "../authorization/authorization.module";
import { PublicWebContentController } from "./public-web-content.controller";
import { WebContentController } from "./web-content.controller";
import { WebContentService } from "./web-content.service";

@Module({
  imports: [AuthModule, AuthorizationModule],
  controllers: [WebContentController, PublicWebContentController],
  providers: [WebContentService],
})
export class WebContentModule {}
