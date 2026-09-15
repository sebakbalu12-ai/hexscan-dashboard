'use strict';

/**
 * /api/auth — register, login, logout, session info.
 */

const express = require('express');
const config = require('../config');
const { get, run, audit } = require('../db');
const authLib = require('../lib/auth');
const licenses = require('../lib/licenses');

const router = express.Router();
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const AVATAR_COLORS = ['#2563eb', '#22c55e', '#f97316', '#a855f7', '#ef4444', '#14b8a6'];

function setSessionCookie(res, token, expiresAt) {
  res.cookie(config.sessionCookie, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProduction(),
    expires: new Date(expiresAt),
    path: '/',
  });
}

function validate({ email, username, password }, { requireUsername = true } = {}) {
  const problems = [];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || ''))) problems.push('A valid email address is required.');
  if (requireUsername && !/^[a-zA-Z0-9_.-]{3,24}$/.test(String(username || ''))) {
    problems.push('Username must be 3-24 characters (letters, numbers, dot, dash, underscore).');
  }
  if (String(password || '').length < 8) problems.push('Password must be at least 8 characters.');
  return problems;
}

/** POST /api/auth/register */
router.post(
  '/register',
  asyncHandler((req, res) => {
    const { email, username, password } = req.body || {};
    const problems = validate({ email, username, password });
    if (problems.length) return res.status(400).json({ error: problems[0], problems, code: 'VALIDATION' });

    const normalizedEmail = String(email).trim().toLowerCase();
    if (get('SELECT id FROM users WHERE email = ?', [normalizedEmail])) {
      return res.status(409).json({ error: 'An account with this email already exists.', code: 'EMAIL_TAKEN' });
    }

    const role = config.adminEmails.includes(normalizedEmail) ? 'admin' : 'user';
    const info = run(
      'INSERT INTO users (email, username, password_hash, role, avatar_color, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [
        normalizedEmail,
        String(username).trim(),
        authLib.hashPassword(password),
        role,
        AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
        Date.now(),
      ],
    );

    const user = get('SELECT * FROM users WHERE id = ?', [info.lastInsertRowid]);
    const { token, expiresAt } = authLib.createSession(user.id, req.headers['user-agent']);
    setSessionCookie(res, token, expiresAt);
    audit(user.id, 'auth.register', { email: normalizedEmail });

    res.status(201).json({ user: authLib.publicUser(user), license: licenses.forUser(user.id) });
  }),
);

/** POST /api/auth/login */
router.post(
  '/login',
  asyncHandler((req, res) => {
    const { email, password } = req.body || {};
    const normalizedEmail = String(email || '').trim().toLowerCase();

    const user = get('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
    if (!user || !authLib.verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Wrong email or password.', code: 'BAD_CREDENTIALS' });
    }

    run('UPDATE users SET last_login_at = ? WHERE id = ?', [Date.now(), user.id]);
    const { token, expiresAt } = authLib.createSession(user.id, req.headers['user-agent']);
    setSessionCookie(res, token, expiresAt);
    audit(user.id, 'auth.login', null);

    res.json({ user: authLib.publicUser({ ...user, last_login_at: Date.now() }), license: licenses.forUser(user.id) });
  }),
);

/** POST /api/auth/logout */
router.post(
  '/logout',
  asyncHandler((req, res) => {
    authLib.destroySession(req.sessionToken);
    res.clearCookie(config.sessionCookie, { path: '/' });
    res.json({ ok: true });
  }),
);

/** GET /api/auth/me — session bootstrap for the SPA. */
router.get(
  '/me',
  asyncHandler((req, res) => {
    if (!req.user) return res.status(401).json({ error: 'No active session.', code: 'UNAUTHENTICATED' });
    res.json({ user: authLib.publicUser(req.user), license: licenses.forUser(req.user.id) });
  }),
);

module.exports = router;
