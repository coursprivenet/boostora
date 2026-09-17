import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import helmet from "helmet";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.use(helmet());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // CORS_ORIGIN can be a comma-separated list — the frontend's own domain migration
  // (custom domain going live alongside its old vercel.app URL, plus the www variant)
  // is exactly the case a single fixed string can't cover without breaking one of them.
  // A plain array here gets echoed back on Access-Control-Allow-Origin as the whole
  // joined list (invalid per spec — browsers require exactly one matching origin, and
  // reject a comma-joined value), so match explicitly and reflect only the one that hit.
  const corsOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || corsOrigins.includes(origin)) callback(null, true);
      else callback(new Error(`Origin ${origin} not allowed by CORS`), false);
    },
  });

  const config = app.get(ConfigService);
  const port = config.get<number>("PORT") ?? 3001;
  await app.listen(port);
}

bootstrap();
