'use strict';

/**
 * /api/admin — license key minting and platform overview.
 * Restricted to users whose email is listed in ADMIN_EMAILS.
 */

const express = require('express');
const { all, get } = require('../db');
const licenses = require('../lib/licenses');
const { PLANS, PLAN_ORDER } = require('../lib/plans');
const { asyncHandler, requireAdmin } = require('../middleware');

const router = express.Router();

/** GET /api/admin/licenses?status= */
router.get(
  '/licenses',
  requireAdmin,
  asyncHandler((req, res) => {
    const status = req.query.status && req.query.status !== 'all' ? String(req.query.status) : null;
    const items = licenses.listLicenses({ status, limit: 200 }).map((license) => ({
      id: license.id,
      key: license.key,
      plan: license.plan,
      planLabel: PLANS[license.plan]?.label || license.plan,
      status: license.status,
      note: license.note,
      createdAt: license.created_at,
      activatedAt: license.activated_at,
      expiresAt: license.expires_at,
      lifetime: license.plan === 'lifetime',
    }));

    const summary = all('SELECT plan, status, COUNT(*) AS c FROM licenses GROUP BY plan, status');

    res.json({ items, plans: PLAN_ORDER.map((id) => ({ id, label: PLANS[id].label })), summary });
  }),
);

/** POST /api/admin/licenses { plan, count, note } */
router.post(
  '/licenses',
  requireAdmin,
  asyncHandler((req, res) => {
    const { plan = 'monthly', count = 1, note = null } = req.body || {};
    if (!PLANS[plan] || plan === 'free') {
      return res.status(400).json({ error: `Plan must be one of: ${PLAN_ORDER.join(', ')}.`, code: 'VALIDATION' });
    }

    const amount = Math.min(50, Math.max(1, Number(count) || 1));
    const created = [];
    for (let i = 0; i < amount; i += 1) {
      created.push(licenses.createLicense({ plan, note, createdBy: req.user.email }));
    }

    res.status(201).json({
      created: created.map((license) => ({ key: license.key, plan: license.plan, id: license.id })),
    });
  }),
);

/** POST /api/admin/licenses/:key/revoke */
router.post(
  '/licenses/:key/revoke',
  requireAdmin,
  asyncHandler((req, res) => {
    const normalized = licenses.normalizeKey(req.params.key);
    if (!normalized) return res.status(400).json({ error: 'Invalid key format.', code: 'VALIDATION' });

    const result = licenses.revokeLicense(normalized, req.user.id);
    if (!result.ok) return res.status(404).json({ error: 'Unknown license key.', code: 'NOT_FOUND' });
    res.json({ ok: true, license: result.license });
  }),
);

/** GET /api/admin/overview */
router.get(
  '/overview',
  requireAdmin,
  asyncHandler((req, res) => {
    const users = get('SELECT COUNT(*) AS c FROM users').c;
    const pins = get('SELECT COUNT(*) AS c FROM pins').c;
    const finished = get("SELECT COUNT(*) AS c FROM pins WHERE status = 'finished'").c;
    const cheating = get("SELECT COUNT(*) AS c FROM pins WHERE verdict = 'cheating'").c;
    const activeLicenses = get("SELECT COUNT(*) AS c FROM licenses WHERE status = 'active'").c;

    res.json({ users, pins, finished, cheating, activeLicenses });
  }),
);

module.exports = router;
