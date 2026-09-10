import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import fastifyCookie from "@fastify/cookie";
import fastifyHelmet from "@fastify/helmet";
import fastifyMultipart from "@fastify/multipart";
import { AppModule } from "./app.module";
import { ApiExceptionFilter } from "./common/errors/api-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: true,
      trustProxy: process.env.NODE_ENV === "production",
    }),
  );

  await app.register(fastifyCookie);
  await app.register(fastifyHelmet);
  await app.register(fastifyMultipart, {
    limits: { fields: 8, fileSize: 10 * 1024 * 1024, files: 1 },
    throwFileSizeLimit: true,
  });
  app.setGlobalPrefix("api/v1");
  const allowedOrigins = (
    process.env.ADMIN_ORIGINS ?? "http://127.0.0.1:3000,http://localhost:3000"
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({
    credentials: true,
    exposedHeaders: ["Content-Disposition", "Content-Length", "X-Content-SHA256"],
    methods: ["GET", "HEAD", "OPTIONS", "POST", "PATCH", "PUT", "DELETE"],
    origin: allowedOrigins,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableShutdownHooks();

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port, "0.0.0.0");
}

void bootstrap();
