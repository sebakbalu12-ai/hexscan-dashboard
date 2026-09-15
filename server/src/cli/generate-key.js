#!/usr/bin/env node
'use strict';

/**
 * License key generator.
 *
 *   npm run key -- --plan lifetime
 *   npm run key -- --plan monthly --count 5 --note "Discord: 76jcb"
 *   npm run key -- --list
 *   npm run key -- --revoke HEX-XXXXX-XXXXX-XXXXX-XXXXX
 */

const db = require('../db');
const licenses = require('../lib/licenses');
const { PLANS, PLAN_ORDER } = require('../lib/plans');

db.init();

function arg(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  return value && !value.startsWith('--') ? value : true;
}

const plan = arg('plan', 'monthly');
const count = Number(arg('count', 1));
const note = arg('note', null);
const shouldList = arg('list', false);
const revoke = arg('revoke', false);

function pad(value, width) {
  return String(value).padEnd(width);
}

if (shouldList) {
  const items = licenses.listLicenses({ limit: 200 });
  console.log(`\n${pad('KEY', 30)}${pad('PLAN', 12)}${pad('STATUS', 10)}EXPIRES`);
  console.log('-'.repeat(78));
  for (const license of items) {
    const expires = license.plan === 'lifetime' ? 'never' : license.expires_at ? new Date(license.expires_at).toISOString().slice(0, 10) : '-';
    console.log(`${pad(license.key, 30)}${pad(license.plan, 12)}${pad(license.status, 10)}${expires}`);
  }
  console.log(`\n${items.length} license(s).\n`);
  process.exit(0);
}

if (revoke) {
  const key = typeof revoke === 'string' ? revoke : arg('_', null);
  const result = licenses.revokeLicense(licenses.normalizeKey(key), 'cli');
  if (!result.ok) {
    console.error(`✗ ${result.code}`);
    process.exit(1);
  }
  console.log(`✓ revoked ${result.license.key}`);
  process.exit(0);
}

if (!PLANS[plan] || plan === 'free') {
  console.error(`✗ --plan must be one of: ${PLAN_ORDER.join(', ')}`);
  process.exit(1);
}

if (!Number.isFinite(count) || count < 1 || count > 100) {
  console.error('✗ --count must be between 1 and 100');
  process.exit(1);
}

console.log('');
for (let i = 0; i < count; i += 1) {
  const license = licenses.createLicense({ plan, note, createdBy: 'cli' });
  const duration = PLANS[plan].durationDays === null ? 'lifetime' : `${PLANS[plan].durationDays} days`;
  console.log(`  ${license.key}   ${pad(license.plan, 12)} ${duration}`);
}
console.log(`\n✓ ${count} × ${plan} license key(s) created${note ? ` (note: ${note})` : ''}.\n`);
