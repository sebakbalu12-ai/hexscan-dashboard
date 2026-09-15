'use strict';

/**
 * /api/license — the paid tier API.
 *
 *   GET  /api/license          -> current entitlement (works for free users too)
 *   POST /api/license/activate -> bind a license key to the account
 *   GET  /api/plans            -> pricing catalogue for the upgrade modal
 */

const express = require('express');
const config = require('../config');
const licenses = require('../lib/licenses');
const { publicPlans } = require('../lib/plans');
const { db } = require('../db');
const { asyncHandler, requireAuth } = require('../middleware');

const router = express.Router();

/** GET /api/license */
router.get(
  '/',
  requireAuth,
  asyncHandler((req, res) => {
    const status = licenses.forUser(req.user.id);
    const pinsThisMonth = db
      .prepare('SELECT COUNT(*) AS c FROM pins WHERE user_id = ? AND created_at >= ?')
      .get(req.user.id, new Date(new Date().setDate(1)).setHours(0, 0, 0, 0)).c;

    const history = db
      .prepare('SELECT key, plan, status, activated_at, expires_at FROM licenses WHERE activated_by = ? ORDER BY activated_at DESC')
      .all(req.user.id)
      .map((row) => ({
        key: licenses.maskKey(row.key),
        plan: row.plan,
        status: row.status,
        activatedAt: row.activated_at,
        expiresAt: row.expires_at,
        lifetime: row.expires_at === null,
      }));

    res.json({ license: status, plans: publicPlans(), pinsThisMonth, history });
  }),
);

/** POST /api/license/activate */
router.post(
  '/activate',
  requireAuth,
  asyncHandler((req, res) => {
    const { key } = req.body || {};
    if (!key) return res.status(400).json({ error: 'A license key is required.', code: 'VALIDATION' });

    const result = licenses.activateLicense(key, req.user);
    if (!result.ok) return res.status(400).json({ error: result.message, code: result.code });

    res.json({
      license: result.status,
      activated: result.license,
      alreadyActive: Boolean(result.alreadyActive),
      message: result.alreadyActive
        ? 'This key is already active on your account.'
        : `License activated: ${result.status.planLabel}${result.status.lifetime ? ' (lifetime)' : ` until ${new Date(result.status.expiresAt).toLocaleDateString('en-GB')}`}.`,
    });
  }),
);

/** POST /api/license/deactivate — release the longest running key (support tool). */
router.post(
  '/deactivate',
  asyncHandler((req, res) => {
    if (!config.allowSimulation) throw Object.assign(new Error('Disabled.'), { status: 403, code: 'DISABLED' });
    const { key } = req.body || {};
    const normalized = licenses.normalizeKey(key || '');
    if (!normalized) return res.status(400).json({ error: 'Invalid key.', code: 'VALIDATION' });

    const license = licenses.getLicenseByKey(normalized);
    if (!license) return res.status(404).json({ error: 'Unknown key.', code: 'NOT_FOUND' });

    db.prepare("UPDATE licenses SET status = 'unused', activated_at = NULL, activated_by = NULL, expires_at = NULL WHERE id = ?").run(license.id);
    res.json({ ok: true });
  }),
);

/** GET /api/license/plans (public) */
router.get('/plans', (req, res) => res.json({ plans: publicPlans() }));

module.exports = router;
