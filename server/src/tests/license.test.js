'use strict';

/**
 * End-to-end API test for the paid gate.
 *
 *   npm test        (node --test)
 *
 * Boots the real Express app on an ephemeral port with a throwaway database and
 * walks the exact business flow: free account -> blocked pin creation -> license
 * activation -> unlimited pins.
 */

const os = require('os');
const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const TMP = path.join(os.tmpdir(), 'hexscan-tests');
fs.mkdirSync(TMP, { recursive: true });
const DB_PATH = path.join(TMP, `test-${process.pid}.sqlite`);
for (const suffix of ['', '-wal', '-shm']) {
  const file = `${DB_PATH}${suffix}`;
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

process.env.DB_PATH = DB_PATH;
process.env.PORT = '0';
process.env.NODE_ENV = 'test';
process.env.SEED_DEMO_DATA = 'false';
process.env.ALLOW_SIMULATION = 'true';
process.env.ADMIN_EMAILS = 'admin@example.com';

const { app } = require('../index');
const licenses = require('../lib/licenses');

let baseUrl = '';
let server = null;
let cookies = '';

/** Minimal fetch wrapper that carries the session cookie. */
async function api(method, url, body) {
  const response = await fetch(`${baseUrl}${url}`, {
    method,
    headers: { 'content-type': 'application/json', ...(cookies ? { cookie: cookies } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });

  const setCookie = response.headers.getSetCookie ? response.headers.getSetCookie() : [];
  if (setCookie.length) cookies = setCookie.map((entry) => entry.split(';')[0]).join('; ');

  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: response.status, body: json };
}

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

test.after(() => {
  server?.close();
});

test('health endpoint reports ok', async () => {
  const response = await api('GET', '/health');
  assert.equal(response.status, 200);
  assert.equal(response.body.product, 'HexScan');
});

test('unauthenticated users cannot read pins', async () => {
  const response = await api('GET', '/api/pins');
  assert.equal(response.status, 401);
  assert.equal(response.body.code, 'UNAUTHENTICATED');
});

test('registration creates a free account', async () => {
  const response = await api('POST', '/api/auth/register', {
    email: 'free@example.com',
    username: 'freeuser',
    password: 'hunter2hunter2',
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.user.email, 'free@example.com');
  assert.equal(response.body.license.plan, 'free');
  assert.equal(response.body.license.active, false);
  assert.equal(response.body.license.unlimited, false);
});

test('free tier: pin creation is blocked with 402 LICENSE_REQUIRED', async () => {
  const response = await api('POST', '/api/pins', { player: 'suspect', game: 'FiveM' });
  assert.equal(response.status, 402);
  assert.equal(response.body.code, 'LICENSE_REQUIRED');
  assert.match(response.body.error, /license/i);
});

test('free tier: invalid license keys are rejected', async () => {
  const tooShort = await api('POST', '/api/license/activate', { key: 'HEX-123' });
  assert.equal(tooShort.status, 400);
  assert.equal(tooShort.body.code, 'INVALID_FORMAT');

  const unknown = await api('POST', '/api/license/activate', { key: 'HEX-22222-33333-44444-55555' });
  assert.equal(unknown.status, 400);
  assert.equal(unknown.body.code, 'NOT_FOUND');
});

test('activating a monthly key unlocks unlimited pins', async () => {
  const license = licenses.createLicense({ plan: 'monthly', note: 'test' });

  const activation = await api('POST', '/api/license/activate', { key: license.key });
  assert.equal(activation.status, 200);
  assert.equal(activation.body.license.plan, 'monthly');
  assert.equal(activation.body.license.active, true);
  assert.equal(activation.body.license.unlimited, true);
  assert.ok(activation.body.license.daysRemaining >= 29 && activation.body.license.daysRemaining <= 30, 'expected ~30 days left');
  assert.match(activation.body.license.key, /^HEX-•••••/);

  const create = await api('POST', '/api/pins', { player: 'suspect_one', game: 'FiveM', name: 'first' });
  assert.equal(create.status, 201);
  assert.equal(create.body.pin.status, 'pending');
  assert.equal(create.body.pin.code.length, 8);
  assert.match(create.body.downloadUrl, /\/d\/[A-Z0-9]{8}$/);
  assert.equal(create.body.pin.name, 'first');

  // unlimited: loop a few times
  const codes = new Set([create.body.pin.code]);
  for (let i = 0; i < 4; i += 1) {
    const again = await api('POST', '/api/pins', { player: `suspect_${i}`, game: 'Rust' });
    assert.equal(again.status, 201);
    assert.ok(!codes.has(again.body.pin.code), 'pin codes must be unique');
    codes.add(again.body.pin.code);
  }
  assert.equal(codes.size, 5);
});

test('a key cannot be activated by a second account', async () => {
  const license = licenses.createLicense({ plan: 'quarterly', note: 'taken' });

  const first = await api('POST', '/api/license/activate', { key: license.key });
  assert.equal(first.status, 200);

  // log out and register a second account
  await api('POST', '/api/auth/logout');
  await api('POST', '/api/auth/register', { email: 'other@example.com', username: 'otheruser', password: 'hunter2hunter2' });

  const second = await api('POST', '/api/license/activate', { key: license.key });
  assert.equal(second.status, 400);
  assert.equal(second.body.code, 'ALREADY_USED');
});

test('lifetime keys never expire and outrank shorter plans', async () => {
  await api('POST', '/api/auth/login', { email: 'free@example.com', password: 'hunter2hunter2' });

  const monthly = licenses.createLicense({ plan: 'monthly' });
  await api('POST', '/api/license/activate', { key: monthly.key });

  const lifetime = licenses.createLicense({ plan: 'lifetime' });
  const activation = await api('POST', '/api/license/activate', { key: lifetime.key });
  assert.equal(activation.status, 200);
  assert.equal(activation.body.license.lifetime, true);
  assert.equal(activation.body.license.expiresAt, null);
  assert.equal(activation.body.license.daysRemaining, null);

  const status = await api('GET', '/api/license');
  assert.equal(status.body.license.plan, 'lifetime');
  assert.equal(status.body.license.unlimited, true);
  assert.ok(status.body.history.length >= 2, 'license history should list both keys');
});

test('a revoked key cannot be activated', async () => {
  const license = licenses.createLicense({ plan: 'semiannual' });
  const revoked = licenses.revokeLicense(license.key, 'test');
  assert.equal(revoked.ok, true);

  await api('POST', '/api/auth/register', { email: 'revoked@example.com', username: 'revokeduser', password: 'hunter2hunter2' });
  const activation = await api('POST', '/api/license/activate', { key: license.key });
  assert.equal(activation.status, 400);
  assert.equal(activation.body.code, 'REVOKED');
});

test('pin lifecycle: waiting -> running -> finished with a report', async () => {
  await api('POST', '/api/auth/login', { email: 'free@example.com', password: 'hunter2hunter2' });
  const created = await api('POST', '/api/pins', { player: 'flow_test', game: 'Minecraft Java' });
  const code = created.body.pin.code;

  const waiting = await api('GET', `/api/pins/${code}`);
  assert.equal(waiting.body.pin.status, 'pending');

  const started = await api('POST', `/api/pins/${code}/simulate`);
  assert.equal(started.body.step, 'started');
  assert.equal(started.body.pin.status, 'running');

  const finished = await api('POST', `/api/pins/${code}/simulate`);
  assert.equal(finished.body.step, 'finished');
  assert.equal(finished.body.pin.status, 'finished');
  assert.ok(['clean', 'suspicious', 'cheating'].includes(finished.body.pin.verdict));
  assert.ok(Array.isArray(finished.body.pin.detections));

  const stats = await api('GET', '/api/stats/overview');
  assert.equal(stats.status, 200);
  assert.ok(stats.body.stats.total >= 6);
  assert.ok(stats.body.stats.finished >= 1);
});

test('pins can be filtered, searched and shared', async () => {
  const list = await api('GET', '/api/pins?status=pending');
  assert.equal(list.status, 200);
  assert.ok(list.body.items.every((pin) => pin.status === 'pending'));

  const search = await api('GET', '/api/pins?q=suspect_one');
  assert.equal(search.body.items.length, 1);
  assert.equal(search.body.items[0].player, 'suspect_one');

  const code = list.body.items[0].code;
  const share = await api('POST', `/api/pins/${code}/share`, { email: 'teammate@example.com', access: 'view' });
  assert.equal(share.status, 201);
  assert.equal(share.body.shares.length, 1);
  assert.equal(share.body.shares[0].email, 'teammate@example.com');

  const removed = await api('DELETE', `/api/pins/${code}/share/teammate@example.com`);
  assert.equal(removed.status, 200);
  assert.equal(removed.body.shares.length, 0);
});

test('admin endpoints reject normal users', async () => {
  const me = await api('GET', '/api/auth/me');
  assert.equal(me.body.user.role, 'user');

  const response = await api('POST', '/api/admin/licenses', { plan: 'monthly', count: 2 });
  assert.equal(response.status, 403);
  assert.equal(response.body.code, 'FORBIDDEN');
});

test('admin can mint keys and sees the platform overview', async () => {
  await api('POST', '/api/auth/logout');
  await api('POST', '/api/auth/register', { email: 'admin@example.com', username: 'adminuser', password: 'hunter2hunter2' });

  const minted = await api('POST', '/api/admin/licenses', { plan: 'lifetime', count: 3, note: 'batch' });
  assert.equal(minted.status, 201);
  assert.equal(minted.body.created.length, 3);
  for (const license of minted.body.created) assert.match(license.key, /^HEX(-[A-Z0-9]{5}){4}$/);

  const list = await api('GET', '/api/admin/licenses?status=unused');
  assert.ok(list.body.items.length >= 3);

  const overview = await api('GET', '/api/admin/overview');
  assert.ok(overview.body.users >= 4);
  assert.ok(overview.body.pins >= 6);
});

test('license key format round-trips through normalisation', () => {
  const license = licenses.createLicense({ plan: 'monthly' });
  const normalized = licenses.normalizeKey(license.key.toLowerCase().replace(/-/g, ' '));
  assert.equal(normalized, license.key);
  assert.equal(licenses.normalizeKey('nonsense'), null);
  assert.equal(licenses.normalizeKey('HEX-AAAAA-AAAAA-AAAAA'), null);
});
