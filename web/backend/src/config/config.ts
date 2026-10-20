import 'dotenv/config';
import { existsSync } from 'node:fs';
import { isIP } from 'node:net';
import { dirname, join, resolve } from 'node:path';

export interface AppConfig {
  port: number;
  host: string;
  production: boolean;
  apiDocsEnabled: boolean;
  databaseUrl: string;
  authSecret: string;
  authUrl: string;
  frontendOrigins: string[];
  trustedProxyCidrs: string[];
  resendApiKey?: string;
  emailFrom?: string;
  trackingAssetDir: string;
}

function defaultTrackingAssetDir(): string {
  let directory = resolve(process.cwd());
  while (true) {
    if (existsSync(join(directory, 'pnpm-workspace.yaml'))) return join(directory, 'models/mediapipe/1.1.1');
    const parent = dirname(directory);
    if (parent === directory) return resolve(process.cwd(), 'models/mediapipe/1.1.1');
    directory = parent;
  }
}

export function readConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const production = env.NODE_ENV === 'production';
  const rawApiDocsEnabled = env.API_DOCS_ENABLED;
  if (rawApiDocsEnabled !== undefined && rawApiDocsEnabled !== 'true' && rawApiDocsEnabled !== 'false') {
    throw new Error('API_DOCS_ENABLED must be true or false');
  }
  const apiDocsEnabled = rawApiDocsEnabled === undefined ? !production : rawApiDocsEnabled === 'true';
  const port = Number(env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535');
  if (!env.DATABASE_URL || !/^postgres(ql)?:\/\//.test(env.DATABASE_URL)) throw new Error('DATABASE_URL must be a PostgreSQL URL');
  try {
    const database = new URL(env.DATABASE_URL);
    if (!database.hostname || database.pathname.length < 2) throw new Error();
  } catch { throw new Error('DATABASE_URL must specify a PostgreSQL host and database'); }
  if (!env.BETTER_AUTH_SECRET || env.BETTER_AUTH_SECRET.length < 32) throw new Error('BETTER_AUTH_SECRET must contain at least 32 characters');
  const authUrl = env.BETTER_AUTH_URL ?? (production ? '' : 'http://localhost:3000');
  const rawOrigins = env.FRONTEND_ORIGINS ?? (production ? '' : 'http://localhost:5173');
  const frontendOrigins = rawOrigins.split(',').map(value => value.trim()).filter(Boolean);
  function validateOrigin(value: string) {
    let url: URL;
    try { url = new URL(value); } catch { throw new Error('Authentication URLs must be valid origins'); }
    if (url.origin !== value || !['http:', 'https:'].includes(url.protocol)) throw new Error('Authentication URLs must be exact HTTP(S) origins without paths');
    if (production && url.protocol !== 'https:') throw new Error('Production authentication requires HTTPS');
  }
  const trustedProxyCidrs = (env.TRUSTED_PROXY_CIDRS ?? '').split(',').map(value => value.trim()).filter(Boolean);
  for (const cidr of trustedProxyCidrs) {
    const [address, mask, extra] = cidr.split('/');
    const version = isIP(address);
    if (!version || extra !== undefined || (mask !== undefined && (!/^\d+$/.test(mask) || Number(mask) > (version === 4 ? 32 : 128)))) throw new Error('TRUSTED_PROXY_CIDRS must contain exact proxy IP addresses or CIDRs');
  }
  validateOrigin(authUrl);
  if (!frontendOrigins.length) throw new Error('FRONTEND_ORIGINS must contain an allowed origin');
  frontendOrigins.forEach(validateOrigin);
  const resendApiKey = env.RESEND_API_KEY?.trim();
  const emailFrom = env.EMAIL_FROM?.trim();
  if (Boolean(resendApiKey) !== Boolean(emailFrom)) throw new Error('RESEND_API_KEY and EMAIL_FROM must be configured together');
  return { port, host: env.HOST ?? '127.0.0.1', production, apiDocsEnabled, databaseUrl: env.DATABASE_URL, authSecret: env.BETTER_AUTH_SECRET, authUrl, frontendOrigins, trustedProxyCidrs, trackingAssetDir: resolve(env.TRACKING_ASSET_DIR ?? defaultTrackingAssetDir()), ...(resendApiKey && emailFrom ? { resendApiKey, emailFrom } : {}) };
}
