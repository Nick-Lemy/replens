import { Injectable } from '@nestjs/common';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { DatabaseService } from '../database/database.service.js';
import type { AppConfig } from '../config/config.js';

@Injectable()
export class AuthService {
  readonly auth;
  constructor(database: DatabaseService, config: AppConfig) {
    this.auth = betterAuth({
      appName: 'RepLens',
      baseURL: config.authUrl,
      basePath: '/api/auth',
      secret: config.authSecret,
      database: prismaAdapter(database, { provider: 'postgresql' }),
      trustedOrigins: config.frontendOrigins,
      emailAndPassword: { enabled: true, minPasswordLength: 12, maxPasswordLength: 128, requireEmailVerification: false },
      session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24, cookieCache: { enabled: false } },
      rateLimit: { enabled: true, window: 60, max: 30, customRules: { '/sign-up/email': { window: 60, max: 20 }, '/sign-in/email': { window: 60, max: 10 } } },
      advanced: { ipAddress: { ipAddressHeaders: ['x-replens-client-ip'] }, useSecureCookies: config.production, defaultCookieAttributes: { httpOnly: true, sameSite: 'lax' } },
      hooks: { before: createAuthMiddleware(async context => {
        if (context.path === '/sign-up/email') {
          const name = context.body?.name;
          if (typeof name !== 'string' || !name.trim() || name.trim().length > 80) {
            throw new APIError('BAD_REQUEST', { code: 'INVALID_NAME', message: 'Name must contain 1–80 characters.' });
          }
          context.body.name = name.trim();
        }
      }) },
    });
  }
}
