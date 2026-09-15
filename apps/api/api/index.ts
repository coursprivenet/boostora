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
  app.enableCors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:3000" });
  await app.init();
}

export default async function handler(req: express.Request, res: express.Response) {
  if (!bootstrapped) bootstrapped = bootstrap();
  await bootstrapped;
  server(req, res);
}
