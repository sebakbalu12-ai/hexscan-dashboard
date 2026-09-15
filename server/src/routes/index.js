'use strict';

const express = require('express');
const { GAMES } = require('../lib/pins');
const { publicPlans } = require('../lib/plans');

const router = express.Router();

router.use('/auth', require('./auth'));
router.use('/pins', require('./pins'));
router.use('/license', require('./license'));
router.use('/stats', require('./stats'));
router.use('/admin', require('./admin'));
router.use('/ingest', require('./ingest'));

/** Handy public bootstrap endpoint for the SPA (games, plans, feature flags). */
router.get('/meta', (req, res) => {
  res.json({
    product: 'HexScan',
    version: '1.0.0',
    games: GAMES,
    plans: publicPlans(),
    simulation: require('../config').allowSimulation,
  });
});

module.exports = router;
