'use strict';

/**
 * Authentication primitives: scrypt password hashing + DB backed sessions.
 * No native dependencies, no JWT secrets to leak - the cookie carries an opaque
 * random token that can be revoked server side at any time.
 */

const crypto = require('crypto');
const config = require('../config');
const { run, get } = require('../db');

const SCRYPT_KEYLEN = 64;
const DAY_MS = 24 * 60 * 60 * 1000;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(String(password), salt, SCRYPT_KEYLEN).toString('hex');
  return `scrypt:${salt}:${derived}`;
}

function verifyPassword(password, stored) {
  if (!stored || typeof stored !== 'string') return false;
  const [scheme, salt, hash] = stored.split(':');
  if (scheme !== 'scrypt' || !salt || !hash) return false;

  const derived = crypto.scryptSync(String(password), salt, SCRYPT_KEYLEN).toString('hex');
  const a = Buffer.from(derived, 'hex');
  const b = Buffer.from(hash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function createSession(userId, userAgent = '') {
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const expiresAt = now + config.sessionDays * DAY_MS;

  run('INSERT INTO sessions (token, user_id, created_at, expires_at, user_agent) VALUES (?, ?, ?, ?, ?)', [
    token,
    userId,
    now,
    expiresAt,
    String(userAgent).slice(0, 200),
  ]);

  return { token, expiresAt };
}

function getSession(token) {
  if (!token) return null;
  const session = get('SELECT * FROM sessions WHERE token = ?', [token]);
  if (!session) return null;
  if (session.expires_at <= Date.now()) {
    run('DELETE FROM sessions WHERE token = ?', [token]);
    return null;
  }
  return session;
}

function destroySession(token) {
  if (!token) return;
  run('DELETE FROM sessions WHERE token = ?', [token]);
}

/** Housekeeping: drop expired sessions (called periodically). */
function pruneSessions() {
  return run('DELETE FROM sessions WHERE expires_at <= ?', [Date.now()]).changes;
}

/** Shape sent to the client - never includes the password hash. */
function publicUser(user, extra = {}) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    avatarColor: user.avatar_color,
    createdAt: user.created_at,
    lastLoginAt: user.last_login_at,
    ...extra,
  };
}

const isAdmin = (user) => Boolean(user && user.role === 'admin');

module.exports = {
  hashPassword,
  verifyPassword,
  createSession,
  getSession,
  destroySession,
  pruneSessions,
  publicUser,
  isAdmin,
};
