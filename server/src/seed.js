'use strict';

/**
 * Demo seeder.
 *
 * Creates two accounts (a free one and a licensed admin), one license key per
 * plan, and a set of pins including the "DEMOPIN" report so every screen has
 * something realistic to show.
 *
 *   npm run seed                 # wipe-less upsert of the demo data
 *   npm run seed -- --reset      # delete the database rows first
 */

const { run, get, all, db, audit } = require('./db');
const authLib = require('./lib/auth');
const licenses = require('./lib/licenses');
const pinsLib = require('./lib/pins');
const demo = require('./lib/demo');
const log = require('./lib/logger');

const logger = log.scoped('seed');
const DAY = 24 * 60 * 60 * 1000;

const DEMO_PASSWORD = 'demo1234';

function upsertUser({ email, username, role = 'user', color = '#2563eb' }) {
  const existing = get('SELECT * FROM users WHERE email = ?', [email]);
  if (existing) return existing;

  const info = run(
    'INSERT INTO users (email, username, password_hash, role, avatar_color, created_at, last_login_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [email, username, authLib.hashPassword(DEMO_PASSWORD), role, color, Date.now() - 20 * DAY, Date.now() - DAY],
  );
  return get('SELECT * FROM users WHERE id = ?', [info.lastInsertRowid]);
}

function ensureLicenses() {
  const wanted = ['monthly', 'quarterly', 'semiannual', 'lifetime'];
  const existing = all('SELECT plan FROM licenses').map((row) => row.plan);
  const created = [];
  for (const plan of wanted) {
    if (existing.includes(plan)) continue;
    const license = licenses.createLicense({ plan, note: 'seed demo key', createdBy: 'seed' });
    created.push(license);
  }
  return created;
}

function seedPin({ user, code, player, game, name, visibility = 'private', status = 'pending', ageHours = 1, report = null }) {
  if (get('SELECT id FROM pins WHERE code = ?', [code])) return get('SELECT * FROM pins WHERE code = ?', [code]);

  const createdAt = Date.now() - ageHours * 60 * 60 * 1000;
  run(
    `INSERT INTO pins (code, user_id, name, player, game, instance, visibility, status, ingest_token, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?)`,
    [code, user.id, name, player, game, visibility, status, `seed-${code.toLowerCase()}-token`, createdAt, createdAt + 24 * 60 * 60 * 1000],
  );

  const pin = get('SELECT * FROM pins WHERE code = ?', [code]);
  if (report && status === 'finished') pinsLib.finishPin(code, report);
  return get('SELECT * FROM pins WHERE code = ?', [code]);
}

function seed({ quiet = true, reset = false } = {}) {
  if (reset) {
    run('DELETE FROM detections');
    run('DELETE FROM pc_info');
    run('DELETE FROM shares');
    run('DELETE FROM pins');
    run('DELETE FROM sessions');
    run('DELETE FROM licenses');
    run('DELETE FROM users');
    db.prepare('DELETE FROM sqlite_sequence').run();
  }

  const demoUser = upsertUser({ email: 'demo@hexscan.app', username: 'hexscan_demo', role: 'user', color: '#2563eb' });
  const proUser = upsertUser({ email: 'pro@hexscan.app', username: '76jcb', role: 'admin', color: '#22c55e' });

  const createdKeys = ensureLicenses();

  // The professional account ships with a lifetime license activated.
  const lifetime = get("SELECT * FROM licenses WHERE plan = 'lifetime' AND status = 'unused'");
  if (lifetime) licenses.activateLicense(lifetime.key, proUser);

  const monthly = get("SELECT * FROM licenses WHERE plan = 'monthly' AND status = 'unused'");
  if (monthly) licenses.activateLicense(monthly.key, demoUser);

  /* ------------------------- demo owner pins ------------------------ */

  // The flagship report from the reference screenshots.
  const demoReport = {
    verdict: 'cheating',
    riskScore: 78,
    riskHistory: 62,
    durationMs: 64000,
    detections: [
      { title: 'Unrecognized module', detail: 'Process: FiveM.exe · Module: sample-module.dll', severity: 'instance', category: 'Overview' },
      { title: 'Execution trace found', detail: 'Source: Prefetch · File: example-loader.exe', severity: 'warning', category: 'Overview' },
      { title: 'Modified file signature', detail: 'Source: Amcache · Signature requires review', severity: 'boot', category: 'Integrity logs' },
      { title: 'Injected thread detected', detail: 'Target: FiveM.exe · Remote thread origin unknown', severity: 'instance', category: 'Overview' },
      { title: 'Suspicious driver loaded', detail: 'Driver: vuln-driver.sys · Known vulnerable signature', severity: 'warning', category: 'Integrity logs' },
      { title: 'Unknown overlay window', detail: 'Window text: "overlay_host" · Not bounded to the game process', severity: 'instance', category: 'Suspicious logs' },
    ],
    pcInfo: {
      bootTime: '8d ago',
      vpn: 'No',
      recycleTime: '24 min ago',
      os: 'Windows 11 Pro',
      installDate: '2026-01-12 09:30',
      game: 'FiveM',
      windowText: 'None',
      cpu: 'AMD Ryzen 7 5800X3D',
      gpu: 'NVIDIA RTX 4070',
      ram: '32 GB',
      disk: 'Samsung 980 PRO 1TB',
    },
  };

  seedPin({
    user: demoUser,
    code: 'DEMOPIN',
    player: 'suspect_player',
    game: 'FiveM',
    name: 'Reported by moderator',
    status: 'finished',
    ageHours: 30,
    report: demoReport,
  });

  seedPin({
    user: demoUser,
    code: 'WAITING1',
    player: 'xX_fragz_Xx',
    game: 'Minecraft Java',
    name: 'Awaiting collector',
    status: 'pending',
    ageHours: 2,
  });

  seedPin({
    user: demoUser,
    code: 'WAITING2',
    player: 'rusty_apex',
    game: 'Rust',
    status: 'pending',
    ageHours: 5,
    visibility: 'public',
  });

  seedPin({
    user: demoUser,
    code: 'CLEAN001',
    player: 'totally_legit',
    game: 'CS2',
    status: 'finished',
    ageHours: 74,
    report: {
      verdict: 'clean',
      riskScore: 3,
      riskHistory: 12,
      durationMs: 58000,
      detections: [],
      pcInfo: {
        bootTime: '2d ago',
        vpn: 'No',
        recycleTime: '41 min ago',
        os: 'Windows 10 Home',
        installDate: '2025-08-04 18:12',
        game: 'CS2',
        windowText: 'None',
        cpu: 'Intel i5-10400F',
        gpu: 'NVIDIA GTX 1660 Super',
        ram: '16 GB',
        disk: 'Kingston A2000 500GB',
      },
    },
  });

  seedPin({
    user: demoUser,
    code: 'SUSPECT1',
    player: 'questionable_aim',
    game: 'Valorant',
    status: 'finished',
    ageHours: 120,
    report: {
      verdict: 'suspicious',
      riskScore: 41,
      riskHistory: 38,
      durationMs: 72000,
      detections: [
        { title: 'Debugger attached', detail: 'Process debugging flag set while the game was running', severity: 'instance', category: 'Overview' },
        { title: 'Startup entry added', detail: 'Registry Run key written in the last 24 hours', severity: 'boot', category: 'Suspicious logs' },
      ],
      pcInfo: {
        bootTime: '1d ago',
        vpn: 'Yes',
        recycleTime: '12 min ago',
        os: 'Windows 11 Home',
        installDate: '2024-11-21 11:05',
        game: 'Valorant',
        windowText: 'Screen Capture Host',
        cpu: 'Intel i7-12700K',
        gpu: 'NVIDIA RTX 3060',
        ram: '16 GB',
        disk: 'WD Black SN850X',
      },
    },
  });

  // An expired pin (created 4 days ago, never ran).
  const expired = seedPin({
    user: demoUser,
    code: 'EXPIRED1',
    player: 'ghost_player',
    game: 'GTA V',
    status: 'pending',
    ageHours: 96,
  });
  run("UPDATE pins SET status = 'expired' WHERE id = ?", [expired.id]);

  /* --------------------------- pro pins ----------------------------- */
  seedPin({
    user: proUser,
    code: 'PROPASS1',
    player: 'community_member',
    game: 'FiveM',
    status: 'finished',
    ageHours: 12,
    report: { ...demo.generateReport({ game: 'FiveM', cheat: false }) },
  });

  /* ---------------------------- sharing ----------------------------- */
  const demoPin = get('SELECT * FROM pins WHERE code = ?', ['DEMOPIN']);
  if (demoPin && !get('SELECT id FROM shares WHERE pin_id = ? AND email = ?', [demoPin.id, proUser.email])) {
    pinsLib.sharePin('DEMOPIN', { email: proUser.email, access: 'full', createdBy: demoUser.id });
  }

  audit(demoUser.id, 'seed.completed', { pins: get('SELECT COUNT(*) AS c FROM pins').c });

  const summary = {
    accounts: [
      { email: demoUser.email, password: DEMO_PASSWORD, tier: '1 month license (unlimited pins)' },
      { email: proUser.email, password: DEMO_PASSWORD, tier: 'lifetime license + admin' },
    ],
    pins: get('SELECT COUNT(*) AS c FROM pins').c,
    licenses: get('SELECT COUNT(*) AS c FROM licenses').c,
    newKeys: createdKeys.map((license) => ({ key: license.key, plan: license.plan })),
  };

  if (!quiet) {
    logger.ready('Demo data ready.');
    logger.info(`Sign in with ${demoUser.email} / ${DEMO_PASSWORD} (licensed) or ${proUser.email} / ${DEMO_PASSWORD} (admin, lifetime).`);
    if (createdKeys.length) {
      logger.info('Fresh license keys (usable in Settings → Activate license):');
      for (const license of createdKeys) logger.info(`  ${license.plan.padEnd(11)} ${license.key}`);
    }
  }

  return summary;
}

module.exports = { seed, DEMO_PASSWORD };

if (require.main === module) {
  const reset = process.argv.includes('--reset');
  const summary = seed({ quiet: false, reset });
  console.log(JSON.stringify(summary, null, 2));
}
