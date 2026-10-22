import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import http from 'node:http';
import { Pool } from 'pg';
import { createApp } from '../dist/app.js';
import { readConfig } from '../dist/config/config.js';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith('_test')) throw new Error('TEST_DATABASE_URL must identify a disposable database ending in _test; run migrations first.');
const pool = new Pool({ connectionString: databaseUrl });
const email = `accounts-${randomUUID()}@example.test`;
const password = 'Test-only-password-123!';
const origin = 'http://localhost:5173';
let app, base, cookie;
const config = readConfig({ DATABASE_URL: databaseUrl, BETTER_AUTH_SECRET: 'isolated-integration-secret-at-least-32-characters', BETTER_AUTH_URL: 'http://localhost:3000', FRONTEND_ORIGINS: origin });
async function start() {
  app = await createApp(config);
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
}
async function request(path, body, headers = {}) {
  return fetch(base + path, { method: body === undefined ? 'GET' : 'POST', headers: { Origin: origin, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
before(start);
after(async () => {
  await app?.close();
  await pool.query('DELETE FROM users WHERE email = $1', [email]);
  await pool.end();
});
test('health preserved; private endpoint rejects anonymous requests without caching', async () => {
  assert.equal((await request('/api/health')).status, 200);
  const response = await request('/api/me');
  assert.equal(response.status, 401);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});
test('signup validates email, name and password', async () => {
  for (const invalid of [{ name: 'Test', email: 'bad', password }, { name: '  ', email, password }, { name: 'Test', email, password: 'short' }, { name: 'x'.repeat(81), email, password }, { name: 7, email, password }, { name: 'Test', email, password: 'x'.repeat(129) }, { name: 'Test', email, password: 123456789012 }]) {
    const response = await request('/api/auth/sign-up/email', invalid);
    assert.equal(response.status, 400, JSON.stringify(await response.json()));
  }
});
test('untrusted origins are rejected before creating an account', async () => {
  const response = await request('/api/auth/sign-up/email', { name: 'Test', email, password }, { Origin: 'https://untrusted.example' });
  assert.equal(response.status, 403);
  assert.equal((await pool.query('SELECT id FROM users WHERE email = $1', [email])).rowCount, 0);
});
test('signup persists a hashed password and HttpOnly session', async () => {
  const response = await request('/api/auth/sign-up/email', { name: '  Test Lifter  ', email, password });
  assert.equal(response.status, 200, JSON.stringify(await response.clone().json()));
  const setCookie = response.headers.getSetCookie().find(value => value.startsWith('better-auth.session_token='));
  assert.ok(setCookie);
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=Lax/i);
  cookie = setCookie.split(';')[0];
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const row = (await pool.query('SELECT a.password, u.name FROM accounts a JOIN users u ON u.id = a."userId" WHERE u.email = $1', [email])).rows[0];
  assert.equal(row.name, 'Test Lifter');
  assert.ok(row.password && row.password !== password);
});
test('workout summaries default legacy counters and validate submitted versions', async () => {
  const endedAt = new Date(Date.now() - 10_000).toISOString();
  const startedAt = new Date(Date.now() - 40_000).toISOString();
  const legacyDraft = {
    clientId: randomUUID(),
    startedAt,
    endedAt,
    completedReps: 3,
    interrupted: false,
  };
  const legacyResponse = await request('/api/workout-sessions', legacyDraft, { Cookie: cookie });
  assert.equal(legacyResponse.status, 201, JSON.stringify(await legacyResponse.clone().json()));
  const legacy = await legacyResponse.json();
  assert.equal(legacy.counterVersion, 'world-full-v1');

  const sameVersionRetry = await request('/api/workout-sessions', legacyDraft, { Cookie: cookie });
  assert.equal(sameVersionRetry.status, 200);
  assert.equal((await sameVersionRetry.json()).counterVersion, 'world-full-v1');

  const changedVersionRetry = await request('/api/workout-sessions', { ...legacyDraft, counterVersion: 'world-full-v2' }, { Cookie: cookie });
  assert.equal(changedVersionRetry.status, 409);

  const v2Draft = { ...legacyDraft, clientId: randomUUID(), counterVersion: 'world-full-v2' };
  const v2Response = await request('/api/workout-sessions', v2Draft, { Cookie: cookie });
  assert.equal(v2Response.status, 201, JSON.stringify(await v2Response.clone().json()));
  assert.equal((await v2Response.json()).counterVersion, 'world-full-v2');

  const unsupportedResponse = await request('/api/workout-sessions', { ...legacyDraft, clientId: randomUUID(), counterVersion: 'world-full-v3' }, { Cookie: cookie });
  assert.equal(unsupportedResponse.status, 400);
});
test('duplicate signup does not create another user', async () => {
  const response = await request('/api/auth/sign-up/email', { name: 'Test', email, password });
  assert.equal(response.status, 422);
  assert.equal((await pool.query('SELECT id FROM users WHERE email = $1', [email])).rowCount, 1);
});
test('current-user contract is authenticated and excludes session secrets', async () => {
  const response = await request('/api/me', undefined, { Cookie: cookie });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(data.user.email, email);
  assert.equal(data.user.emailVerified, false);
  assert.deepEqual(Object.keys(data).sort(), ['accountDeletion', 'user']);
  assert.deepEqual(data.accountDeletion, { requiresPassword: true, recentSessionAllowed: false });
  assert.ok(!JSON.stringify(data).includes('token'));
});
test('private aliases remain uncached', async () => {
  for (const path of ['/api/me/', '/API/ME']) {
    const response = await request(path, undefined, { Cookie: cookie });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal((await request(path)).headers.get('cache-control'), 'no-store');
  }
});
test('oversized authentication requests are rejected before parsing', async () => {
  const response = await request('/api/auth/sign-in/email', { email, password: 'x'.repeat(17000) });
  assert.equal(response.status, 413);
});
test('chunked oversized authentication bodies are bounded', async () => {
  const status = await new Promise((resolve, reject) => {
    const req = http.request(base + '/api/auth/sign-in/email', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'Transfer-Encoding': 'chunked' } }, response => {
      response.resume();
      response.on('end', () => resolve(response.statusCode));
    });
    req.on('error', reject);
    req.write('{"password":"');
    req.end('x'.repeat(17000) + '"}');
  });
  assert.equal(status, 413);
});
test('session and account survive a new API instance', async () => {
  await app.close();
  await start();
  assert.equal((await request('/api/me', undefined, { Cookie: cookie })).status, 200);
});
test('logout revokes the stored session and rejects the old cookie', async () => {
  const rejected = await request('/api/auth/sign-out', {}, { Cookie: cookie, Origin: 'https://untrusted.example' });
  assert.equal(rejected.status, 403);
  assert.equal((await request('/api/me', undefined, { Cookie: cookie })).status, 200);
  const response = await request('/api/auth/sign-out', {}, { Cookie: cookie });
  assert.equal(response.status, 200);
  assert.equal((await request('/api/me', undefined, { Cookie: cookie })).status, 401);
});
test('invalid credentials fail; valid credentials create a new session', async () => {
  assert.equal((await request('/api/auth/sign-in/email', { email, password: 'incorrect-password' })).status, 401);
  const response = await request('/api/auth/sign-in/email', { email, password });
  assert.equal(response.status, 200);
  cookie = response.headers.getSetCookie().find(value => value.startsWith('better-auth.session_token=')).split(';')[0];
  assert.equal((await request('/api/me', undefined, { Cookie: cookie })).status, 200);
});
test('expired database sessions are rejected', async () => {
  await pool.query('UPDATE sessions SET "expiresAt" = $1 WHERE "userId" IN (SELECT id FROM users WHERE email = $2)', [new Date(0), email]);
  assert.equal((await request('/api/me', undefined, { Cookie: cookie })).status, 401);
});
test('recovery and verification report unavailable without Resend configuration', async () => {
  assert.equal((await request('/api/auth/request-password-reset', { email })).status, 503);
  assert.equal((await request('/api/auth/send-verification-email', { email })).status, 503);
});
test('rate limiting rejects repeated failed signin requests', async () => {
  let response;
  for (let attempt = 0; attempt < 11; attempt++) {
    response = await request('/api/auth/sign-in/email', { email: 'invalid', password: '' });
    if (response.status === 429) break;
  }
  assert.equal(response.status, 429);
});
