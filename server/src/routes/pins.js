'use strict';

/**
 * /api/pins — create, list, inspect, edit, share and (in development) simulate.
 *
 * Creating a pin is the paid action: it is guarded by `requireLicense`.
 */

const express = require('express');
const config = require('../config');
const pins = require('../lib/pins');
const demo = require('../lib/demo');
const { asyncHandler, requireAuth, requireLicense } = require('../middleware');

const router = express.Router();

function shapeError(message, code = 'BAD_REQUEST') {
  const error = new Error(message);
  error.status = 400;
  error.code = code;
  return error;
}

/** GET /api/pins?status=&game=&q=&page=&perPage=&shared= */
router.get(
  '/',
  requireAuth,
  asyncHandler((req, res) => {
    const { status = 'all', game = 'all', q = '', page = 1, perPage = 10, shared = '' } = req.query;
    const result = pins.listPins({
      userId: req.user.id,
      email: req.user.email,
      status,
      game,
      q: String(q).slice(0, 60),
      page: Math.max(1, Number(page) || 1),
      perPage: Math.min(50, Math.max(5, Number(perPage) || 10)),
      sharedOnly: String(shared) === '1' || String(shared) === 'true',
    });

    res.json({ ...result, games: pins.GAMES, statuses: pins.STATUSES });
  }),
);

/** POST /api/pins — the paid action. */
router.post(
  '/',
  requireAuth,
  requireLicense,
  asyncHandler((req, res) => {
    const { player, game, name, visibility = 'private', instance = null } = req.body || {};

    if (!player || String(player).trim().length < 2) throw shapeError('The player name is required.', 'VALIDATION');
    if (!game || !pins.GAMES.includes(game)) throw shapeError(`Game must be one of: ${pins.GAMES.join(', ')}.`, 'VALIDATION');

    const created = pins.createPin({
      userId: req.user.id,
      player: String(player).trim(),
      game,
      name,
      instance,
      visibility,
    });

    res.status(201).json({
      pin: { ...pins.shapePin({ ...created.pin, detections_count: 0 }) },
      downloadUrl: created.downloadUrl,
      license: req.license,
    });
  }),
);

/** GET /api/pins/:code */
router.get(
  '/:code',
  requireAuth,
  asyncHandler((req, res) => {
    const pin = pins.getPinByCode(req.params.code);
    if (!pin) throw Object.assign(new Error('Pin not found.'), { status: 404, code: 'NOT_FOUND' });
    if (!pins.canView(pin, req.user)) throw Object.assign(new Error('You do not have access to this pin.'), { status: 403, code: 'FORBIDDEN' });

    res.json({ pin: pins.pinDetail(pin), canEdit: pins.canEdit(pin, req.user) });
  }),
);

/** PATCH /api/pins/:code */
router.patch(
  '/:code',
  requireAuth,
  asyncHandler((req, res) => {
    const pin = pins.getPinByCode(req.params.code);
    if (!pin) throw Object.assign(new Error('Pin not found.'), { status: 404, code: 'NOT_FOUND' });
    if (!pins.canEdit(pin, req.user)) throw Object.assign(new Error('You cannot edit this pin.'), { status: 403, code: 'FORBIDDEN' });

    const { name, player, game, visibility, notes } = req.body || {};
    if (game && !pins.GAMES.includes(game)) throw shapeError('Unknown game.', 'VALIDATION');
    if (visibility && !pins.VISIBILITIES.includes(visibility)) throw shapeError('Visibility must be private or public.', 'VALIDATION');

    pins.updatePin(pin.code, { name, player, game, visibility, notes });
    res.json({ pin: pins.pinDetail(pins.getPinByCode(pin.code)) });
  }),
);

/** DELETE /api/pins/:code */
router.delete(
  '/:code',
  requireAuth,
  asyncHandler((req, res) => {
    const pin = pins.getPinByCode(req.params.code);
    if (!pin) throw Object.assign(new Error('Pin not found.'), { status: 404, code: 'NOT_FOUND' });
    if (!pins.canEdit(pin, req.user)) throw Object.assign(new Error('You cannot delete this pin.'), { status: 403, code: 'FORBIDDEN' });

    pins.deletePin(pin.code, req.user.id);
    res.json({ ok: true });
  }),
);

/** POST /api/pins/:code/share */
router.post(
  '/:code/share',
  requireAuth,
  asyncHandler((req, res) => {
    const pin = pins.getPinByCode(req.params.code);
    if (!pin) throw Object.assign(new Error('Pin not found.'), { status: 404, code: 'NOT_FOUND' });
    if (!pins.canEdit(pin, req.user)) throw Object.assign(new Error('You cannot manage access to this pin.'), { status: 403, code: 'FORBIDDEN' });

    const { email, access = 'view' } = req.body || {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || ''))) throw shapeError('A valid email address is required.', 'VALIDATION');
    if (!['view', 'full'].includes(access)) throw shapeError('Access must be view or full.', 'VALIDATION');

    const share = pins.sharePin(pin.code, { email, access, createdBy: req.user.id });
    res.status(201).json({ share, shares: pins.pinDetail(pin).shares });
  }),
);

/** DELETE /api/pins/:code/share/:email */
router.delete(
  '/:code/share/:email',
  requireAuth,
  asyncHandler((req, res) => {
    const pin = pins.getPinByCode(req.params.code);
    if (!pin) throw Object.assign(new Error('Pin not found.'), { status: 404, code: 'NOT_FOUND' });
    if (!pins.canEdit(pin, req.user)) throw Object.assign(new Error('You cannot manage access to this pin.'), { status: 403, code: 'FORBIDDEN' });

    pins.removeShare(pin.code, req.params.email);
    res.json({ shares: pins.pinDetail(pin).shares });
  }),
);

/**
 * POST /api/pins/:code/simulate
 * Development helper: advances the pin one step (pending -> running -> finished)
 * so the waiting screen and the report can be demonstrated without a collector.
 */
router.post(
  '/:code/simulate',
  requireAuth,
  asyncHandler((req, res) => {
    if (!config.allowSimulation) throw Object.assign(new Error('Simulation is disabled.'), { status: 403, code: 'DISABLED' });

    const pin = pins.getPinByCode(req.params.code);
    if (!pin) throw Object.assign(new Error('Pin not found.'), { status: 404, code: 'NOT_FOUND' });
    if (!pins.canEdit(pin, req.user)) throw Object.assign(new Error('You cannot simulate this pin.'), { status: 403, code: 'FORBIDDEN' });
    if (pin.status === 'finished') return res.json({ pin: pins.pinDetail(pin), step: 'already-finished' });

    if (pin.status === 'pending') {
      pins.startPin(pin.code);
      return res.json({ pin: pins.pinDetail(pins.getPinByCode(pin.code)), step: 'started' });
    }

    const report = demo.generateReport({ game: pin.game, player: pin.player, cheat: req.body?.cheat });
    pins.finishPin(pin.code, report);
    res.json({ pin: pins.pinDetail(pins.getPinByCode(pin.code)), step: 'finished' });
  }),
);

module.exports = router;
