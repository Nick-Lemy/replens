import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { getRequest, setResponse } from 'better-call/node';
import { fromNodeHeaders } from 'better-auth/node';
import express from 'express';
import { AppModule } from './app.module.js';
import { AuthService } from './auth/auth.service.js';
import type { AppConfig } from './config/config.js';
import { addRepLensApiPaths } from './api-docs.js';

export async function createApp(config: AppConfig) {
  const app = await NestFactory.create(AppModule.register(config), { bodyParser: false });
  app.setGlobalPrefix('api');
  if (config.trustedProxyCidrs.length) app.getHttpAdapter().getInstance().set('trust proxy', config.trustedProxyCidrs);
  app.enableCors({ origin: config.frontendOrigins, credentials: true });
  const auth = app.get(AuthService).auth;
  const allowed = new Map([
    ['/api/auth/sign-up/email', 'POST'], ['/api/auth/sign-in/email', 'POST'],
    ['/api/auth/sign-out', 'POST'], ['/api/auth/get-session', 'GET'],
    ['/api/auth/send-verification-email', 'POST'], ['/api/auth/verify-email', 'GET'],
    ['/api/auth/request-password-reset', 'POST'], ['/api/auth/reset-password', 'POST'],
    ['/api/auth/update-user', 'POST'], ['/api/auth/delete-user', 'POST'],
  ]);
  app.use((request: express.Request, response: express.Response, next: express.NextFunction) => {
    if (/^\/api\/(auth(?:\/|$)|me\/?$)/i.test(request.path)) response.setHeader('Cache-Control', 'no-store');
    if (/^\/api\/workout-sessions(?:\/|$)/i.test(request.path)) response.setHeader('Cache-Control', 'no-store');
    if (/^\/api\/docs(?:\/|$)/i.test(request.path) || request.path === '/api/docs-json') response.setHeader('Cache-Control', 'no-store');
    next();
  });
  if (config.apiDocsEnabled) {
    const openApiConfig = new DocumentBuilder()
      .setTitle('RepLens API')
      .setDescription('RepLens account, exercise guide, live tracking asset, and personal session-summary API. Browser authentication uses the same-origin HttpOnly session cookie.')
      .setVersion('1.0')
      .build();
    const document = addRepLensApiPaths(SwaggerModule.createDocument(app, openApiConfig), config.production);
    SwaggerModule.setup('api/docs', app, document, {
      jsonDocumentUrl: 'api/docs-json',
      swaggerOptions: {
        validatorUrl: null,
        withCredentials: true,
        persistAuthorization: false,
        requestInterceptor: (request: { url: string; method?: string; credentials?: RequestCredentials; headers?: Record<string, string>; body?: string }) => {
          request.credentials = 'include';
          if (request.method?.toUpperCase() === 'DELETE' && /\/api\/workout-sessions\/[^/?]+(?:\?.*)?$/.test(request.url)) {
            request.headers = { ...request.headers, 'Content-Type': 'application/json' };
            request.body ??= '{}';
          }
          return request;
        },
      },
    });
  }
  app.use('/api/auth', async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const requestPath = new URL(request.originalUrl, config.authUrl).pathname;
    if (allowed.get(requestPath) !== request.method) {
      response.status(404).json({ code: 'NOT_FOUND', message: 'This authentication operation is not available.' });
      return;
    }
    const outboundEmailOperation = ['/api/auth/send-verification-email', '/api/auth/request-password-reset'].includes(requestPath);
    if (outboundEmailOperation && (!config.resendApiKey || !config.emailFrom)) {
      response.status(503).json({ code: 'EMAIL_UNAVAILABLE', message: 'Email access is not configured.' });
      return;
    }
    request.headers['x-replens-client-ip'] = request.ip ?? request.socket.remoteAddress ?? 'unknown';
    let webRequest: globalThis.Request;
    let requestBody: ArrayBuffer | undefined;
    try {
      webRequest = getRequest({ request, base: config.authUrl, bodySizeLimit: 16 * 1024 });
      if (request.method === 'POST') {
        requestBody = await webRequest.arrayBuffer();
        webRequest = new globalThis.Request(webRequest, { body: requestBody.slice(0) });
      }
    } catch {
      response.status(413).json({ code: 'PAYLOAD_TOO_LARGE', message: 'Authentication requests must not exceed 16 KiB.' });
      return;
    }
    if (requestPath === '/api/auth/send-verification-email') {
      const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
      if (!session) {
        response.status(401).json({ code: 'UNAUTHORIZED', message: 'Sign in to verify your email address.' });
        return;
      }
      let email: unknown;
      try { email = JSON.parse(new TextDecoder().decode(requestBody))?.email; } catch { /* Better Auth returns the input error. */ }
      if (typeof email !== 'string' || email.trim().toLowerCase() !== session.user.email.toLowerCase()) {
        response.status(400).json({ code: 'EMAIL_MISMATCH', message: 'You can only verify the email address on your account.' });
        return;
      }
    }
    try { await setResponse(response, await auth.handler(webRequest)); } catch (error) { next(error); }
  });
  app.use(express.json({ limit: '16kb' }));
  app.use((error: unknown, request: express.Request, response: express.Response, next: express.NextFunction) => {
    if (/^\/api\/workout-sessions(?:\/|$)/i.test(request.path) && typeof error === 'object' && error !== null && 'type' in error) {
      const type = error.type;
      if (type === 'entity.too.large') {
        response.status(413).json({ code: 'PAYLOAD_TOO_LARGE', message: 'Session requests must not exceed 16 KiB.' });
        return;
      }
      if (type === 'entity.parse.failed') {
        response.status(400).json({ code: 'INVALID_JSON', message: 'Session request JSON is invalid.' });
        return;
      }
    }
    next(error);
  });
  app.enableShutdownHooks();
  return app;
}
