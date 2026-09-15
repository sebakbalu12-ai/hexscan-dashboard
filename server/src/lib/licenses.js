'use strict';

/**
 * License engine.
 *
 * A license row is a *key*. Once activated it is bound to a user and gets an
 * expiry date (or none, for lifetime). A user's entitlement is the best
 * entitlement among their activated keys, so activating a 3-month key on top of
 * a 1-month key simply upgrades the account.
 */

const crypto = require('crypto');
const { run, get, all, audit } = require('../db');
const { getPlan, PLANS } = require('./plans');

/** Crockford-style alphabet: no 0/O/1/I/L to avoid typos when typing keys. */
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const GROUPS = 4;
const GROUP_SIZE = 5;

function randomChars(length) {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

function generateKeyValue(prefix = 'HEX') {
  const groups = Array.from({ length: GROUPS }, () => randomChars(GROUP_SIZE));
  return [prefix, ...groups].join('-');
}

/** Normalise user input: case, spaces, missing dashes. */
function normalizeKey(input) {
  const raw = String(input || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  if (!raw.startsWith('HEX')) return null;
  const body = raw.slice(3);
  if (body.length !== GROUPS * GROUP_SIZE) return null;
  const groups = body.match(/.{1,5}/g) || [];
  return ['HEX', ...groups].join('-');
}

/**
 * Mint a license key.
 * @param {object} options { plan, note, createdBy, durationDays }
 */
function createLicense({ plan = 'monthly', note = null, createdBy = null, durationDays } = {}) {
  const planDef = getPlan(plan);
  if (planDef.id === 'free') throw new Error('The free plan does not need a license key.');

  let key = generateKeyValue();
  while (get('SELECT id FROM licenses WHERE key = ?', [key])) key = generateKeyValue();

  const info = run(
    `INSERT INTO licenses (key, plan, status, note, created_by, created_at, expires_at)
     VALUES (?, ?, 'unused', ?, ?, ?, NULL)`,
    [key, planDef.id, note, createdBy, Date.now()],
  );

  audit(null, 'license.created', { key, plan: planDef.id, createdBy, note });
  return getLicense(info.lastInsertRowid);
}

function getLicense(id) {
  return get('SELECT * FROM licenses WHERE id = ?', [id]) || null;
}

function getLicenseByKey(key) {
  return get('SELECT * FROM licenses WHERE key = ?', [key]) || null;
}

function listLicenses({ status = null, limit = 100 } = {}) {
  if (status) return all('SELECT * FROM licenses WHERE status = ? ORDER BY created_at DESC LIMIT ?', [status, limit]);
  return all('SELECT * FROM licenses ORDER BY created_at DESC LIMIT ?', [limit]);
}

function revokeLicense(key, actorId = null) {
  const license = getLicenseByKey(key);
  if (!license) return { ok: false, code: 'NOT_FOUND' };
  run("UPDATE licenses SET status = 'revoked' WHERE id = ?", [license.id]);
  audit(actorId, 'license.revoked', { key });
  return { ok: true, license: getLicense(license.id) };
}

/**
 * Activate a key for a user.
 * @returns {{ok: true, license: object, status: object} | {ok: false, code: string, message: string}}
 */
function activateLicense(rawKey, user) {
  const key = normalizeKey(rawKey);
  if (!key) {
    return { ok: false, code: 'INVALID_FORMAT', message: 'That key format is not valid (expected HEX-XXXXX-XXXXX-XXXXX-XXXXX).' };
  }

  const license = getLicenseByKey(key);
  if (!license) return { ok: false, code: 'NOT_FOUND', message: 'This license key does not exist.' };
  if (license.status === 'revoked') return { ok: false, code: 'REVOKED', message: 'This license key has been revoked.' };
  if (license.status === 'active' && license.activated_by !== user.id) {
    return { ok: false, code: 'ALREADY_USED', message: 'This license key is already activated on another account.' };
  }
  if (license.status === 'active' && license.activated_by === user.id) {
    return { ok: true, license, status: forUser(user.id), alreadyActive: true };
  }

  const plan = getPlan(license.plan);
  const now = Date.now();
  const expiresAt = plan.durationDays === null ? null : now + plan.durationDays * 24 * 60 * 60 * 1000;

  run(
    `UPDATE licenses
        SET status = 'active', activated_at = ?, activated_by = ?, expires_at = ?
      WHERE id = ?`,
    [now, user.id, expiresAt, license.id],
  );

  audit(user.id, 'license.activated', { key, plan: plan.id, expiresAt });
  return { ok: true, license: getLicense(license.id), status: forUser(user.id) };
}

/** The entitlement that currently applies to a user (best of all their keys). */
function activeLicense(userId) {
  const now = Date.now();
  return (
    get(
      `SELECT * FROM licenses
        WHERE activated_by = ? AND status = 'active' AND (expires_at IS NULL OR expires_at > ?)
        ORDER BY (expires_at IS NULL) DESC, expires_at DESC
        LIMIT 1`,
      [userId, now],
    ) || null
  );
}

/** Full license state for the UI: plan, expiry, remaining days, quota. */
function forUser(userId) {
  const license = activeLicense(userId);
  const plan = license ? getPlan(license.plan) : PLANS.free;

  if (!license) {
    return {
      plan: 'free',
      planLabel: plan.label,
      active: false,
      unlimited: false,
      expiresAt: null,
      activatedAt: null,
      daysRemaining: 0,
      millisecondsRemaining: 0,
      key: null,
      dailyPins: plan.dailyPins,
    };
  }

  const lifetime = license.expires_at === null;
  const msRemaining = lifetime ? Number.POSITIVE_INFINITY : Math.max(0, license.expires_at - Date.now());

  return {
    plan: plan.id,
    planLabel: plan.label,
    active: true,
    unlimited: plan.unlimitedPins,
    lifetime,
    expiresAt: license.expires_at,
    activatedAt: license.activated_at,
    daysRemaining: lifetime ? null : Math.ceil(msRemaining / (24 * 60 * 60 * 1000)),
    millisecondsRemaining: lifetime ? null : msRemaining,
    key: maskKey(license.key),
    dailyPins: plan.dailyPins,
  };
}

function maskKey(key) {
  if (!key) return null;
  const parts = key.split('-');
  return [parts[0], ...parts.slice(1).map(() => '•••••')].join('-');
}

/** Expire activated keys whose date passed (keeps the admin table honest). */
function expireOutdatedLicenses() {
  const now = Date.now();
  const info = run(
    "UPDATE licenses SET status = 'expired' WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at <= ?",
    [now],
  );
  return info.changes;
}

module.exports = {
  ALPHABET,
  generateKeyValue,
  normalizeKey,
  createLicense,
  getLicense,
  getLicenseByKey,
  listLicenses,
  revokeLicense,
  activateLicense,
  activeLicense,
  forUser,
  maskKey,
  expireOutdatedLicenses,
};
