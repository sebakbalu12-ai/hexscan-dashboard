'use strict';

/**
 * Server configuration — everything comes from environment variables with
 * sensible defaults so the dashboard runs with zero setup in development.
 */

require('dotenv').config();

const path = require('path');

const ROOT = path.join(__dirname, '..');

function bool(value, fallback) {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4310),

  /** SQLite file - lives in server/data by default (git-ignored). */
  dbPath: process.env.DB_PATH || path.join(ROOT, 'data', 'hexscan.sqlite'),

  /** Base URL used to build the download links handed to the player. */
  publicBaseUrl: (process.env.PUBLIC_BASE_URL || 'https://hexscan.gg').replace(/\/+$/, ''),

  /** Session cookie lifetime in days. */
  sessionDays: Number(process.env.SESSION_DAYS || 30),
  sessionCookie: 'hexscan_session',

  /** Emails that get the admin role (license key generator, all pins). */
  adminEmails: (process.env.ADMIN_EMAILS || 'admin@hexscan.app')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),

  /** A PIN is valid for this long - the player must run the tool before it dies. */
  pinTtlHours: Number(process.env.PIN_TTL_HOURS || 24),

  /** Daily pin quota per plan (see lib/plans.js). */
  seedDemoData: bool(process.env.SEED_DEMO_DATA, true),

  /** Serve web/dist when it exists (single-process production mode). */
  webDist: path.join(ROOT, '..', 'web', 'dist'),

  /** Enable the "simulate collector" helper endpoint (never in production). */
  allowSimulation: bool(process.env.ALLOW_SIMULATION, process.env.NODE_ENV !== 'production'),

  isProduction() {
    return config.env === 'production';
  },
};

module.exports = config;
