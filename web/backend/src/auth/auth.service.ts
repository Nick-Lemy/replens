import { Injectable } from '@nestjs/common';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { DatabaseService } from '../database/database.service.js';
import type { AppConfig } from '../config/config.js';
import { escapeHtml, ResendEmailSender } from './email-sender.js';

function isTrustedRedirect(value: unknown, frontendOrigins: string[]): boolean {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const url = new URL(value, `${frontendOrigins[0]}/`);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && frontendOrigins.includes(url.origin);
  } catch { return false; }
}

function normalizedName(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 80) {
    throw new APIError('BAD_REQUEST', { code: 'INVALID_NAME', message: 'Name must contain 1–80 characters.' });
  }
  return value.trim();
}

@Injectable()
export class AuthService {
  readonly auth;
  constructor(database: DatabaseService, config: AppConfig) {
    const emailSender = new ResendEmailSender(config);
    this.auth = betterAuth({
      appName: 'RepLens',
      baseURL: config.authUrl,
      basePath: '/api/auth',
      secret: config.authSecret,
      database: prismaAdapter(database, { provider: 'postgresql' }),
      trustedOrigins: config.frontendOrigins,
      user: {
        deleteUser: {
          enabled: true,
          beforeDelete: async user => {
            await database.verification.deleteMany({ where: { identifier: { startsWith: 'reset-password:' }, value: user.id } });
          },
        },
      },
      emailAndPassword: {
        enabled: true,
        minPasswordLength: 12,
        maxPasswordLength: 128,
        requireEmailVerification: false,
        resetPasswordTokenExpiresIn: 15 * 60,
        revokeSessionsOnPasswordReset: true,
        ...(emailSender.configured ? { sendResetPassword: async ({ user, token }: { user: { email: string }; token: string }) => {
          const url = `${config.frontendOrigins[0]}/#reset-password?token=${encodeURIComponent(token)}`;
          void emailSender.send({
              to: user.email,
              subject: 'Reset your RepLens password',
              text: `Use this link within 15 minutes to reset your RepLens password:\n${url}\n\nIf you did not request this, you can ignore this email.`,
              html: `<p>Use this link within 15 minutes to reset your RepLens password:</p><p><a href="${escapeHtml(url)}">Reset your password</a></p><p>If you did not request this, you can ignore this email.</p>`,
            }).catch(() => console.error('Password reset email delivery failed.'));
        } } : {}),
      },
      ...(emailSender.configured ? { emailVerification: {
        sendOnSignUp: false,
        expiresIn: 60 * 60,
        sendVerificationEmail: async ({ user, token }: { user: { email: string }; token: string }) => {
          const url = `${config.frontendOrigins[0]}/#verify-email?token=${encodeURIComponent(token)}`;
          await emailSender.send({
            to: user.email,
            subject: 'Verify your RepLens email',
            text: `Use this link within 1 hour to verify your RepLens email address:\n${url}`,
            html: `<p>Use this link within 1 hour to verify your RepLens email address:</p><p><a href="${escapeHtml(url)}">Verify email</a></p>`,
          });
        },
      } } : {}),
      session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24, cookieCache: { enabled: false } },
      rateLimit: { enabled: true, window: 60, max: 30, customRules: { '/sign-up/email': { window: 60, max: 20 }, '/sign-in/email': { window: 60, max: 10 }, '/send-verification-email': { window: 60, max: 5 }, '/verify-email': { window: 60, max: 10 }, '/request-password-reset': { window: 60, max: 5 }, '/reset-password': { window: 60, max: 5 }, '/update-user': { window: 60, max: 10 }, '/delete-user': { window: 60, max: 3 } } },
      advanced: { ipAddress: { ipAddressHeaders: ['x-replens-client-ip'] }, useSecureCookies: config.production, defaultCookieAttributes: { httpOnly: true, sameSite: 'lax' } },
      hooks: { before: createAuthMiddleware(async context => {
        if (context.path === '/sign-up/email') {
          context.body.name = normalizedName(context.body?.name);
        }
        if (context.path === '/update-user') {
          const body = context.body;
          const fields = body && typeof body === 'object' && !Array.isArray(body) ? Object.keys(body) : [];
          if (fields.length !== 1 || fields[0] !== 'name') {
            throw new APIError('BAD_REQUEST', { code: 'PROFILE_FIELDS_NOT_ALLOWED', message: 'Only the account name can be updated.' });
          }
          body.name = normalizedName(body.name);
        }
        if (context.path === '/delete-user') {
          const body = context.body;
          const fields = body && typeof body === 'object' && !Array.isArray(body) ? Object.keys(body) : [];
          if (fields.length !== 1 || fields[0] !== 'password' || typeof body.password !== 'string' || body.password.length === 0) {
            throw new APIError('BAD_REQUEST', { code: 'PASSWORD_REQUIRED', message: 'Enter your current password to delete the account.' });
          }
        }
        if (['/sign-up/email', '/send-verification-email', '/request-password-reset'].includes(context.path)) {
          const target = context.path === '/request-password-reset' ? context.body?.redirectTo : context.body?.callbackURL;
          if (target !== undefined && !isTrustedRedirect(target, config.frontendOrigins)) {
            throw new APIError('BAD_REQUEST', { code: 'INVALID_REDIRECT', message: 'Redirect URL must use an approved frontend origin.' });
          }
        }
        if (['/verify-email', '/reset-password/:token'].includes(context.path)) {
          const target = context.query?.callbackURL;
          if (target !== undefined && !isTrustedRedirect(target, config.frontendOrigins)) {
            throw new APIError('BAD_REQUEST', { code: 'INVALID_REDIRECT', message: 'Redirect URL must use an approved frontend origin.' });
          }
        }
      }) },
    });
  }
}
