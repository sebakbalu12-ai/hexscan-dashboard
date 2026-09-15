'use strict';

/**
 * /api/ingest — the collector agent (running on the suspect's PC) reports here.
 *
 * Authentication is the per-pin `ingest_token`, so the agent never needs an
 * account. The download URL embeds the pin code, the agent fetches the token
 * with the first handshake.
 *
 *   POST /api/ingest/handshake   { code }            -> { token, pin }
 *   POST /api/ingest/start       { token }           -> pin becomes "running"
 *   POST /api/ingest/report      { token, report }   -> pin becomes "finished"
 */

const express = require('express');
const pins = require('../lib/pins');
const { asyncHandler } = require('../middleware');

const router = express.Router();

router.post(
  '/handshake',
  asyncHandler((req, res) => {
    const { code } = req.body || {};
    const pin = pins.getPinByCode(code);
    if (!pin) return res.status(404).json({ error: 'Unknown pin.', code: 'NOT_FOUND' });
    if (pin.status === 'expired' || pin.expires_at < Date.now()) {
      return res.status(410).json({ error: 'This pin has expired.', code: 'EXPIRED' });
    }

    res.json({
      token: pin.ingest_token,
      pin: { code: pin.code, game: pin.game, player: pin.player, expiresAt: pin.expires_at },
    });
  }),
);

router.post(
  '/start',
  asyncHandler((req, res) => {
    const pin = pins.getPinByIngestToken(req.body?.token || '');
    if (!pin) return res.status(401).json({ error: 'Invalid token.', code: 'UNAUTHORIZED' });

    pins.startPin(pin.code);
    res.json({ ok: true, status: 'running' });
  }),
);

router.post(
  '/report',
  asyncHandler((req, res) => {
    const pin = pins.getPinByIngestToken(req.body?.token || '');
    if (!pin) return res.status(401).json({ error: 'Invalid token.', code: 'UNAUTHORIZED' });

    const report = req.body?.report || {};
    if (!report || typeof report !== 'object') {
      return res.status(400).json({ error: 'A report object is required.', code: 'VALIDATION' });
    }

    pins.finishPin(pin.code, report);
    res.json({ ok: true, status: 'finished', code: pin.code });
  }),
);

module.exports = router;
