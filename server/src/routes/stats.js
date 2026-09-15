'use strict';

/**
 * /api/stats and /api/detections — everything the overview/detections pages need.
 */

const express = require('express');
const { all, get } = require('../db');
const pins = require('../lib/pins');
const licenses = require('../lib/licenses');
const { asyncHandler, requireAuth } = require('../middleware');

const router = express.Router();

/** GET /api/stats/overview */
router.get(
  '/overview',
  requireAuth,
  asyncHandler((req, res) => {
    const license = licenses.forUser(req.user.id);
    const stats = pins.statsForUser(req.user.id, { dailyQuota: license.unlimited ? null : 0 });

    const recent = pins
      .listPins({ userId: req.user.id, perPage: 6 })
      .items;

    const detectionTotals = get(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN d.severity IN ('instance','critical') THEN 1 ELSE 0 END) AS inline,
         SUM(CASE WHEN d.severity = 'warning' THEN 1 ELSE 0 END) AS warnings,
         SUM(CASE WHEN d.severity = 'boot' THEN 1 ELSE 0 END) AS boot
       FROM detections d
       JOIN pins p ON p.id = d.pin_id
       WHERE p.user_id = ?`,
      [req.user.id],
    ) || { total: 0, inline: 0, warnings: 0, boot: 0 };

    const verdicts = all(
      `SELECT verdict, COUNT(*) AS c FROM pins WHERE user_id = ? AND verdict IS NOT NULL GROUP BY verdict`,
      [req.user.id],
    ).reduce((acc, row) => Object.assign(acc, { [row.verdict]: row.c }), {});

    res.json({
      license,
      stats,
      recent,
      detections: {
        total: detectionTotals.total || 0,
        inline: detectionTotals.inline || 0,
        warnings: detectionTotals.warnings || 0,
        boot: detectionTotals.boot || 0,
      },
      verdicts: { cheating: verdicts.cheating || 0, suspicious: verdicts.suspicious || 0, clean: verdicts.clean || 0 },
    });
  }),
);

/** GET /api/detections?severity=&limit= */
router.get(
  '/detections',
  requireAuth,
  asyncHandler((req, res) => {
    const severity = req.query.severity || 'all';
    const limit = Math.min(200, Math.max(5, Number(req.query.limit) || 50));

    const params = [req.user.id];
    let clause = 'WHERE p.user_id = ?';
    if (severity !== 'all') {
      clause += ' AND d.severity = ?';
      params.push(severity);
    }

    const rows = all(
      `SELECT d.id, d.title, d.detail, d.severity, d.category, d.created_at,
              p.code, p.player, p.game, p.verdict, p.risk_score
         FROM detections d
         JOIN pins p ON p.id = d.pin_id
         ${clause}
         ORDER BY d.created_at DESC
         LIMIT ?`,
      [...params, limit],
    );

    const counts = all(
      `SELECT d.severity, COUNT(*) AS c
         FROM detections d JOIN pins p ON p.id = d.pin_id
        WHERE p.user_id = ?
        GROUP BY d.severity`,
      [req.user.id],
    ).reduce((acc, row) => Object.assign(acc, { [row.severity]: row.c }), {});

    res.json({
      severity,
      counts: { all: Object.values(counts).reduce((a, b) => a + b, 0), ...counts },
      items: rows.map((row) => ({
        id: row.id,
        title: row.title,
        detail: row.detail,
        severity: row.severity,
        category: row.category,
        createdAt: row.created_at,
        pin: { code: row.code, player: row.player, game: row.game, verdict: row.verdict, riskScore: row.risk_score },
      })),
    });
  }),
);

module.exports = router;
