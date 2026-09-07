import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthConfigService } from "./auth-config.service";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AccessTokenGuard } from "./guards/access-token.guard";

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AccessTokenGuard, AuthConfigService, AuthService],
})
export class AuthModule {}
