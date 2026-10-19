import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { getRequest, setResponse } from 'better-call/node';
import express from 'express';
import { AppModule } from './app.module.js';
import { AuthService } from './auth/auth.service.js';
import type { AppConfig } from './config/config.js';

export async function createApp(config: AppConfig) {
  const app = await NestFactory.create(AppModule.register(config), { bodyParser: false });
  app.setGlobalPrefix('api');
  if (config.trustedProxyCidrs.length) app.getHttpAdapter().getInstance().set('trust proxy', config.trustedProxyCidrs);
  app.enableCors({ origin: config.frontendOrigins, credentials: true });
  const auth = app.get(AuthService).auth;
  const allowed = new Map([
    ['/api/auth/sign-up/email', 'POST'], ['/api/auth/sign-in/email', 'POST'],
    ['/api/auth/sign-out', 'POST'], ['/api/auth/get-session', 'GET'],
  ]);
  app.use((request: express.Request, response: express.Response, next: express.NextFunction) => {
    if (/^\/api\/(auth(?:\/|$)|me\/?$)/i.test(request.path)) response.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.use('/api/auth', async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    if (allowed.get(request.originalUrl.split('?')[0]) !== request.method) {
      response.status(404).json({ code: 'NOT_FOUND', message: 'This authentication operation is not available.' });
      return;
    }
    request.headers['x-replens-client-ip'] = request.ip ?? request.socket.remoteAddress ?? 'unknown';
    let webRequest: globalThis.Request;
    try {
      webRequest = getRequest({ request, base: config.authUrl, bodySizeLimit: 16 * 1024 });
      if (request.method === 'POST') {
        const body = await webRequest.arrayBuffer();
        webRequest = new globalThis.Request(webRequest, { body });
      }
    } catch {
      response.status(413).json({ code: 'PAYLOAD_TOO_LARGE', message: 'Authentication requests must not exceed 16 KiB.' });
      return;
    }
    try { await setResponse(response, await auth.handler(webRequest)); } catch (error) { next(error); }
  });
  app.use(express.json({ limit: '16kb' }));
  app.enableShutdownHooks();
  return app;
}
