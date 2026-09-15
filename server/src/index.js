'use strict';

/**
 * HexScan API + (optionally) the built SPA.
 *
 *   npm run dev    -> only the API on :4310 (Vite proxies /api during development)
 *   npm start      -> API + web/dist on a single port (production)
 */

const fs = require('fs');
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');

const config = require('./config');
const db = require('./db');
const routes = require('./routes');
const middleware = require('./middleware');
const log = require('./lib/logger');

const logger = log.scoped('http');

db.init();

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(middleware.optionalAuth);

/* ------------------------------- API ------------------------------- */
app.get('/health', (req, res) =>
  res.json({ status: 'ok', product: 'HexScan', version: '1.0.0', uptime: Math.floor(process.uptime()), time: Date.now() }),
);

app.use('/api', routes);
app.use('/api', middleware.notFound); // unknown API routes must never fall through to the SPA

/* --------------------------- static SPA ---------------------------- */
const hasDist = fs.existsSync(path.join(config.webDist, 'index.html'));
if (hasDist) {
  app.use(express.static(config.webDist, { index: false }));
  app.get('*', (req, res) => res.sendFile(path.join(config.webDist, 'index.html')));
  logger.info(`Serving the web build from ${config.webDist}`);
} else {
  app.get('/', (req, res) =>
    res
      .status(200)
      .type('html')
      .send(
        `<!doctype html><meta charset="utf-8"><title>HexScan API</title>
         <body style="background:#08090a;color:#e6e8ea;font-family:system-ui;padding:40px">
         <h1 style="margin:0 0 8px">HexScan API</h1>
         <p style="color:#8b8f96">Running on port ${config.port}. The web build is not compiled yet — run
         <code>npm run build</code> or start Vite with <code>npm run dev --prefix web</code>.</p>
         <p><a style="color:#60a5fa" href="/api/meta">/api/meta</a> · <a style="color:#60a5fa" href="/health">/health</a></p>
         </body>`,
      ),
  );
}

app.use(middleware.notFound);
app.use(middleware.errorHandler);

/* --------------------------- background ---------------------------- */
// First boot with an empty database: create the demo accounts and sample pins.
if (config.seedDemoData) {
  const { count } = db.get('SELECT COUNT(*) AS count FROM users');
  if (count === 0) {
    try {
      require('./seed').seed({ quiet: false });
    } catch (error) {
      logger.warn(`Demo seed skipped: ${error.message}`);
    }
  }
}

const housekeepingTimer = setInterval(() => {
  try {
    const result = middleware.housekeeping();
    if (result.pinsExpired || result.licensesExpired || result.sessions) {
      logger.debug(`Housekeeping: ${JSON.stringify(result)}`);
    }
  } catch (error) {
    logger.error(`Housekeeping failed: ${error.message}`);
  }
}, 5 * 60 * 1000);
housekeepingTimer.unref?.();

middleware.housekeeping();

const server = app.listen(config.port, () => {
  logger.ready(`HexScan API listening on http://localhost:${config.port}`);
  logger.info(`Environment: ${config.env} · database: ${config.dbPath}`);
  if (config.allowSimulation) logger.info('Collector simulation endpoint is ENABLED (development only).');
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    logger.warn(`${signal} received — shutting down.`);
    server.close(() => {
      db.db.close();
      process.exit(0);
    });
  });
}

module.exports = { app, server };
