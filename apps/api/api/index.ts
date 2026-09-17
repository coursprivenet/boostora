import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import { ValidationPipe } from "@nestjs/common";
import express from "express";
import helmet from "helmet";
import { AppModule } from "../src/app.module";

/**
 * Vercel serverless entrypoint. Bootstraps Nest once per warm function instance
 * (not per request) and hands every request to the underlying Express app —
 * same app.init() Nest would run under `nest start`, just without app.listen()
 * since Vercel owns the actual HTTP server.
 */
const server = express();
let bootstrapped: Promise<void> | null = null;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    rawBody: true,
  });
  app.use(helmet());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // Kept in sync with src/main.ts's CORS logic — see that file for why this can't just
  // be a plain array passed to enableCors (echoes back the whole joined list, which
  // every browser rejects as an invalid Access-Control-Allow-Origin value).
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
  await app.init();
}

export default async function handler(req: express.Request, res: express.Response) {
  if (!bootstrapped) bootstrapped = bootstrap();
  await bootstrapped;
  server(req, res);
}
