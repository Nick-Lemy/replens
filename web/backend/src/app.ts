import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import express from "express";
import { AppModule } from "./app.module.js";
import { AuthService } from "./auth/auth.service.js";
import { createAuthBridgeMiddleware } from "./auth/auth-bridge.js";
import type { AppConfig } from "./config/config.js";
import { configureSwagger } from "./swagger/configure-swagger.js";

export async function createApp(config: AppConfig) {
  const app = await NestFactory.create(AppModule.register(config), {
    bodyParser: false,
  });
  app.setGlobalPrefix("api");
  if (config.trustedProxyCidrs.length)
    app
      .getHttpAdapter()
      .getInstance()
      .set("trust proxy", config.trustedProxyCidrs);
  app.enableCors({ origin: config.frontendOrigins, credentials: true });
  const auth = app.get(AuthService).auth;
  app.use(
    (
      request: express.Request,
      response: express.Response,
      next: express.NextFunction,
    ) => {
      if (/^\/api\/(auth(?:\/|$)|me\/?$)/i.test(request.path))
        response.setHeader("Cache-Control", "no-store");
      if (/^\/api\/workout-sessions(?:\/|$)/i.test(request.path))
        response.setHeader("Cache-Control", "no-store");
      if (
        /^\/api\/docs(?:\/|$)/i.test(request.path) ||
        request.path === "/api/docs-json"
      )
        response.setHeader("Cache-Control", "no-store");
      next();
    },
  );
  if (config.apiDocsEnabled) await configureSwagger(app, config);
  app.use("/api/auth", createAuthBridgeMiddleware(config, auth));
  app.use(express.json({ limit: "16kb" }));
  app.use(
    (
      error: unknown,
      request: express.Request,
      response: express.Response,
      next: express.NextFunction,
    ) => {
      if (
        /^\/api\/workout-sessions(?:\/|$)/i.test(request.path) &&
        typeof error === "object" &&
        error !== null &&
        "type" in error
      ) {
        const type = error.type;
        if (type === "entity.too.large") {
          response.status(413).json({
            code: "PAYLOAD_TOO_LARGE",
            message: "Session requests must not exceed 16 KiB.",
          });
          return;
        }
        if (type === "entity.parse.failed") {
          response.status(400).json({
            code: "INVALID_JSON",
            message: "Session request JSON is invalid.",
          });
          return;
        }
      }
      next(error);
    },
  );
  app.enableShutdownHooks();
  return app;
}
