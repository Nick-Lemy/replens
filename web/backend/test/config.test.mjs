import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readConfig } from '../src/config/config.ts';

const valid = { DATABASE_URL: 'postgresql://localhost/replens_test', BETTER_AUTH_SECRET: 'unit-test-secret-with-at-least-32-characters' };
test('local configuration has explicit trusted origins', () => {
  assert.deepEqual(readConfig(valid).frontendOrigins, ['http://localhost:5173']);
});
test('missing database or short secret fails startup', () => {
  assert.throws(() => readConfig({ ...valid, DATABASE_URL: '' }), /DATABASE_URL/);
  assert.throws(() => readConfig({ ...valid, BETTER_AUTH_SECRET: 'short' }), /SECRET/);
});
test('production requires explicit HTTPS origins', () => {
  assert.throws(() => readConfig({ ...valid, NODE_ENV: 'production' }), /origins/);
  assert.throws(() => readConfig({ ...valid, NODE_ENV: 'production', BETTER_AUTH_URL: 'http://api.example.com', FRONTEND_ORIGINS: 'https://app.example.com' }), /HTTPS/);
  assert.equal(readConfig({ ...valid, NODE_ENV: 'production', BETTER_AUTH_URL: 'https://api.example.com', FRONTEND_ORIGINS: 'https://app.example.com' }).production, true);
});
test('wildcards, paths, credentials and invalid ports are rejected', () => {
  for (const origin of ['*', 'https://example.com/path', 'https://user:password@example.com']) {
    assert.throws(() => readConfig({ ...valid, FRONTEND_ORIGINS: origin }));
  }
  assert.throws(() => readConfig({ ...valid, PORT: '0' }), /PORT/);
});
test('proxy trust accepts only explicit IP addresses and valid CIDRs', () => {
  assert.deepEqual(readConfig({ ...valid, TRUSTED_PROXY_CIDRS: '127.0.0.1,10.0.0.0/24' }).trustedProxyCidrs, ['127.0.0.1', '10.0.0.0/24']);
  for (const value of ['true', '*', '0.0.0.0/99', 'example.com', '127.0.0.1/-1']) {
    assert.throws(() => readConfig({ ...valid, TRUSTED_PROXY_CIDRS: value }), /TRUSTED_PROXY/);
  }
});
test('Google OAuth credentials are optional but must be configured as a pair', () => {
  assert.equal(readConfig(valid).googleClientId, undefined);
  const configured = readConfig({ ...valid, GOOGLE_CLIENT_ID: 'client-id', GOOGLE_CLIENT_SECRET: 'client-secret' });
  assert.deepEqual([configured.googleClientId, configured.googleClientSecret], ['client-id', 'client-secret']);
  assert.throws(() => readConfig({ ...valid, GOOGLE_CLIENT_ID: 'client-id' }), /configured together/);
  assert.throws(() => readConfig({ ...valid, GOOGLE_CLIENT_SECRET: 'client-secret' }), /configured together/);
});
