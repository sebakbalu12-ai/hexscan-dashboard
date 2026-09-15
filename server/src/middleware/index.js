'use strict';

/**
 * Middleware: session resolution, access control and error shaping.
 *
 * `requireLicense` is the server-side half of the paid gate - the UI hides the
 * button, but this is what actually enforces it.
 */

const config = require('../config');
const { get, run } = require('../db');
const auth = require('../lib/auth');
const licenses = require('../lib/licenses');

/** Wrap async route handlers so rejections reach the error middleware. */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** Resolve the session cookie into req.user (may be null). */
function optionalAuth(req, res, next) {
  req.sessionToken = req.cookies ? req.cookies[config.sessionCookie] : null;
  req.user = null;

  const session = auth.getSession(req.sessionToken);
  if (session) {
    const user = get('SELECT * FROM users WHERE id = ?', [session.user_id]);
    if (user) req.user = user;
  }

  next();
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Sign in to continue.', code: 'UNAUTHENTICATED' });
  }
  return next();
}

function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Sign in to continue.', code: 'UNAUTHENTICATED' });
  if (!auth.isAdmin(req.user)) return res.status(403).json({ error: 'Administrator access required.', code: 'FORBIDDEN' });
  return next();
}

/**
 * Paid feature gate. Responds 402 so the client can react with the upgrade modal.
 */
function requireLicense(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Sign in to continue.', code: 'UNAUTHENTICATED' });

  const status = licenses.forUser(req.user.id);
  if (!status.active) {
    return res.status(402).json({
      error: 'An active license is required to create pins.',
      code: 'LICENSE_REQUIRED',
      license: status,
    });
  }

  req.license = status;
  return next();
}

/** Uniform JSON errors, including 404 for unknown API routes. */
function notFound(req, res) {
  res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}`, code: 'NOT_FOUND' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(error, req, res, next) {
  const status = error.status || 500;
  if (status >= 500) console.error('[hexscan] request failed:', error);
  res.status(status).json({
    error: status >= 500 ? 'Internal server error.' : error.message,
    code: error.code || 'ERROR',
  });
}

/** Housekeeping used by the scheduler in index.js. */
function housekeeping() {
  const sessions = auth.pruneSessions();
  const licensesExpired = licenses.expireOutdatedLicenses();
  const pinsExpired = run("UPDATE pins SET status = 'expired' WHERE status IN ('pending','running') AND expires_at <= ?", [Date.now()]).changes;
  return { sessions, licensesExpired, pinsExpired };
}

module.exports = {
  asyncHandler,
  optionalAuth,
  requireAuth,
  requireAdmin,
  requireLicense,
  notFound,
  errorHandler,
  housekeeping,
};
