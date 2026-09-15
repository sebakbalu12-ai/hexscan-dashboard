'use strict';

/**
 * Pin (scan request) lifecycle.
 *
 *   pending -> running -> finished
 *          \-> expired (24h without the collector connecting)
 *
 * A pin is the unit the player receives: an 8 character code plus a download
 * URL. The collector authenticates with `ingest_token` when it reports back.
 */

const crypto = require('crypto');
const config = require('../config');
const { run, get, all, audit, db } = require('../db');

const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const DAY_MS = 24 * 60 * 60 * 1000;

const GAMES = ['FiveM', 'Minecraft Java', 'Rust', 'CS2', 'GTA V', 'Roblox', 'Valorant', 'Ark'];
const STATUSES = ['pending', 'running', 'finished', 'expired'];
const VISIBILITIES = ['private', 'public'];

function generateCode(length = 8) {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

function uniqueCode() {
  let code = generateCode();
  let guard = 0;
  while (get('SELECT id FROM pins WHERE code = ?', [code]) && guard < 20) {
    code = generateCode();
    guard += 1;
  }
  return code;
}

const downloadUrl = (code) => `${config.publicBaseUrl}/d/${code}`;

/* ------------------------------------------------------------------ */
/*  Create / read                                                      */
/* ------------------------------------------------------------------ */

function createPin({ userId, player, game, name = null, instance = null, visibility = 'private' }) {
  const now = Date.now();
  const code = uniqueCode();
  const ingestToken = crypto.randomBytes(24).toString('hex');

  const info = run(
    `INSERT INTO pins
       (code, user_id, name, player, game, instance, visibility, status, ingest_token, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
    [
      code,
      userId,
      name ? String(name).slice(0, 80) : null,
      String(player).slice(0, 80),
      String(game).slice(0, 40),
      instance ? String(instance).slice(0, 40) : null,
      VISIBILITIES.includes(visibility) ? visibility : 'private',
      ingestToken,
      now,
      now + config.pinTtlHours * 60 * 60 * 1000,
    ],
  );

  audit(userId, 'pin.created', { code, game, player });
  return { pin: getPinById(info.lastInsertRowid), downloadUrl: downloadUrl(code) };
}

function getPinById(id) {
  return get('SELECT * FROM pins WHERE id = ?', [id]) || null;
}

function getPinByCode(code) {
  return get('SELECT * FROM pins WHERE code = ?', [String(code || '').toUpperCase()]) || null;
}

function getPinByIngestToken(token) {
  return get('SELECT * FROM pins WHERE ingest_token = ?', [token]) || null;
}

/** Can this viewer open the pin? owner, shared with, or public. */
function canView(pin, user) {
  if (!pin || !user) return false;
  if (pin.user_id === user.id) return true;
  if (user.role === 'admin') return true;
  if (pin.visibility === 'public') return true;
  const share = get('SELECT id FROM shares WHERE pin_id = ? AND email = ?', [pin.id, String(user.email).toLowerCase()]);
  return Boolean(share);
}

function canEdit(pin, user) {
  if (!pin || !user) return false;
  if (pin.user_id === user.id || user.role === 'admin') return true;
  const share = get("SELECT access FROM shares WHERE pin_id = ? AND email = ? AND access = 'full'", [pin.id, String(user.email).toLowerCase()]);
  return Boolean(share);
}

/* ------------------------------------------------------------------ */
/*  Listing / filtering                                                */
/* ------------------------------------------------------------------ */

function listPins({ userId = null, email = null, status = 'all', game = 'all', q = '', page = 1, perPage = 10, sharedOnly = false }) {
  const where = [];
  const params = [];

  if (sharedOnly) {
    where.push(
      `p.id IN (SELECT pin_id FROM shares WHERE email = ?)`,
    );
    params.push(String(email || '').toLowerCase());
  } else {
    where.push('p.user_id = ?');
    params.push(userId);
  }

  if (status && status !== 'all') {
    where.push('p.status = ?');
    params.push(status);
  }
  if (game && game !== 'all') {
    where.push('p.game = ?');
    params.push(game);
  }
  if (q) {
    where.push('(p.code LIKE ? OR p.player LIKE ? OR IFNULL(p.name, "") LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like);
  }

  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = get(`SELECT COUNT(*) AS c FROM pins p ${clause}`, params).c;
  const offset = (Math.max(1, page) - 1) * perPage;

  const rows = all(
    `SELECT p.*,
            (SELECT COUNT(*) FROM detections d WHERE d.pin_id = p.id) AS detections_count,
            u.username AS owner_username
       FROM pins p
       JOIN users u ON u.id = p.user_id
       ${clause}
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
    [...params, perPage, offset],
  );

  return {
    items: rows.map(shapePin),
    total,
    page: Number(page),
    perPage,
    pages: Math.max(1, Math.ceil(total / perPage)),
  };
}

function shapePin(pin) {
  if (!pin) return null;
  return {
    id: pin.id,
    code: pin.code,
    name: pin.name,
    player: pin.player,
    game: pin.game,
    instance: pin.instance,
    visibility: pin.visibility,
    status: pin.status,
    verdict: pin.verdict,
    riskScore: pin.risk_score,
    riskHistory: pin.risk_history,
    durationMs: pin.duration_ms,
    notes: pin.notes,
    createdAt: pin.created_at,
    expiresAt: pin.expires_at,
    startedAt: pin.started_at,
    finishedAt: pin.finished_at,
    detectionsCount: pin.detections_count ?? 0,
    ownerUsername: pin.owner_username ?? null,
    downloadUrl: downloadUrl(pin.code),
    counts: pin.counts || undefined,
  };
}

/** Grouped detection counts used by the Scan Results sidebar. */
function detectionBreakdown(pinId) {
  const rows = all('SELECT category, COUNT(*) AS c FROM detections WHERE pin_id = ? GROUP BY category', [pinId]);
  const byCategory = {};
  let total = 0;
  for (const row of rows) {
    byCategory[row.category || 'Overview'] = row.c;
    total += row.c;
  }
  return { total, byCategory };
}

function pinDetail(pin) {
  const detections = all('SELECT * FROM detections WHERE pin_id = ? ORDER BY id ASC', [pin.id]).map((d) => ({
    id: d.id,
    title: d.title,
    detail: d.detail,
    severity: d.severity,
    category: d.category,
    createdAt: d.created_at,
  }));

  const pc = get('SELECT * FROM pc_info WHERE pin_id = ?', [pin.id]);
  const shares = all('SELECT id, email, access, created_at FROM shares WHERE pin_id = ?', [pin.id]).map((s) => ({
    id: s.id,
    email: s.email,
    access: s.access,
    createdAt: s.created_at,
  }));

  const details = shapePin({ ...pin, detections_count: detections.length });

  return {
    ...details,
    detections,
    detectionBreakdown: detectionBreakdown(pin.id),
    pcInfo: pc
      ? {
          bootTime: pc.boot_time,
          vpn: pc.vpn,
          recycleTime: pc.recycle_time,
          os: pc.os,
          installDate: pc.install_date,
          game: pc.game,
          windowText: pc.window_text,
          cpu: pc.cpu,
          gpu: pc.gpu,
          ram: pc.ram,
          disk: pc.disk,
        }
      : null,
    shares,
    timeline: [
      { label: 'Created', at: pin.created_at },
      { label: 'Expires', at: pin.expires_at },
      { label: 'Collector connected', at: pin.started_at },
      { label: 'Scan finished', at: pin.finished_at },
    ].filter((entry) => entry.at),
  };
}

/* ------------------------------------------------------------------ */
/*  Mutations                                                          */
/* ------------------------------------------------------------------ */

function updatePin(code, fields) {
  const pin = getPinByCode(code);
  if (!pin) return null;

  const allowed = ['name', 'player', 'game', 'visibility', 'notes', 'instance'];
  const keys = Object.keys(fields).filter((key) => allowed.includes(key) && fields[key] !== undefined);
  if (!keys.length) return pin;

  const setSql = keys.map((key) => `${key} = ?`).join(', ');
  run(`UPDATE pins SET ${setSql} WHERE id = ?`, [...keys.map((key) => fields[key]), pin.id]);
  return getPinById(pin.id);
}

function deletePin(code, actorId = null) {
  const pin = getPinByCode(code);
  if (!pin) return false;
  run('DELETE FROM pins WHERE id = ?', [pin.id]);
  audit(actorId, 'pin.deleted', { code });
  return true;
}

/** The collector connected: the scan is now running. */
function startPin(code) {
  const pin = getPinByCode(code);
  if (!pin) return null;
  if (pin.status === 'finished') return pin;
  run("UPDATE pins SET status = 'running', started_at = COALESCE(started_at, ?) WHERE id = ?", [Date.now(), pin.id]);
  return getPinById(pin.id);
}

/**
 * Store a finished report.
 * @param {string} code
 * @param {object} report { verdict, riskScore, riskHistory, durationMs, detections, pcInfo, notes }
 */
function finishPin(code, report) {
  const pin = getPinByCode(code);
  if (!pin) return null;

  const now = Date.now();

  const transaction = db.transaction(() => {
    run(
      `UPDATE pins
          SET status = 'finished', verdict = ?, risk_score = ?, risk_history = ?, duration_ms = ?,
              notes = COALESCE(?, notes), finished_at = ?, started_at = COALESCE(started_at, ?)
        WHERE id = ?`,
      [
        report.verdict || 'clean',
        Number.isFinite(report.riskScore) ? Math.max(0, Math.min(100, Math.round(report.riskScore))) : null,
        Number.isFinite(report.riskHistory) ? Math.round(report.riskHistory) : null,
        Number.isFinite(report.durationMs) ? Math.round(report.durationMs) : null,
        report.notes || null,
        now,
        now - (Number.isFinite(report.durationMs) ? report.durationMs : 0),
        pin.id,
      ],
    );

    run('DELETE FROM detections WHERE pin_id = ?', [pin.id]);
    for (const detection of report.detections || []) {
      run(
        'INSERT INTO detections (pin_id, title, detail, severity, category, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [pin.id, detection.title, detection.detail || null, detection.severity || 'warning', detection.category || 'Overview', now],
      );
    }

    if (report.pcInfo) {
      const pc = report.pcInfo;
      run(
        `INSERT INTO pc_info (pin_id, boot_time, vpn, recycle_time, os, install_date, game, window_text, cpu, gpu, ram, disk)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (pin_id) DO UPDATE SET
           boot_time = excluded.boot_time, vpn = excluded.vpn, recycle_time = excluded.recycle_time,
           os = excluded.os, install_date = excluded.install_date, game = excluded.game,
           window_text = excluded.window_text, cpu = excluded.cpu, gpu = excluded.gpu,
           ram = excluded.ram, disk = excluded.disk`,
        [
          pin.id,
          pc.bootTime || null,
          pc.vpn || null,
          pc.recycleTime || null,
          pc.os || null,
          pc.installDate || null,
          pc.game || pin.game,
          pc.windowText || null,
          pc.cpu || null,
          pc.gpu || null,
          pc.ram || null,
          pc.disk || null,
        ],
      );
    }
  });

  transaction();
  audit(pin.user_id, 'pin.finished', { code: pin.code, verdict: report.verdict });
  return getPinById(pin.id);
}

/** Housekeeping sweep: pins older than the TTL that never ran. */
function expireStalePins() {
  return run(
    "UPDATE pins SET status = 'expired' WHERE status IN ('pending', 'running') AND expires_at <= ?",
    [Date.now()],
  ).changes;
}

/* ------------------------------------------------------------------ */
/*  Sharing                                                            */
/* ------------------------------------------------------------------ */

function sharePin(code, { email, access = 'view', createdBy = null }) {
  const pin = getPinByCode(code);
  if (!pin) return null;

  const normalized = String(email || '').trim().toLowerCase();
  const existing = get('SELECT * FROM shares WHERE pin_id = ? AND email = ?', [pin.id, normalized]);
  if (existing) {
    run('UPDATE shares SET access = ? WHERE id = ?', [access, existing.id]);
    return { id: existing.id, email: normalized, access, token: existing.token };
  }

  const token = crypto.randomBytes(16).toString('hex');
  const info = run('INSERT INTO shares (pin_id, email, access, token, created_at, created_by) VALUES (?, ?, ?, ?, ?, ?)', [
    pin.id,
    normalized,
    access,
    token,
    Date.now(),
    createdBy,
  ]);
  audit(createdBy, 'pin.shared', { code, email: normalized, access });
  return { id: info.lastInsertRowid, email: normalized, access, token };
}

function removeShare(code, email) {
  const pin = getPinByCode(code);
  if (!pin) return false;
  return run('DELETE FROM shares WHERE pin_id = ? AND email = ?', [pin.id, String(email).toLowerCase()]).changes > 0;
}

/* ------------------------------------------------------------------ */
/*  Statistics                                                         */
/* ------------------------------------------------------------------ */

function statsForUser(userId, { dailyQuota = null } = {}) {
  const now = Date.now();
  const startOfToday = new Date().setHours(0, 0, 0, 0);
  const startOfMonth = new Date(new Date().setDate(1)).setHours(0, 0, 0, 0);
  const startOfLastMonth = new Date(new Date(new Date().setDate(1)).setMonth(new Date().getMonth() - 1)).setHours(0, 0, 0, 0);

  const count = (sql, params = []) => get(sql, params).c;

  const today = count('SELECT COUNT(*) AS c FROM pins WHERE user_id = ? AND created_at >= ?', [userId, startOfToday]);
  const total = count('SELECT COUNT(*) AS c FROM pins WHERE user_id = ?', [userId]);
  const thisMonth = count('SELECT COUNT(*) AS c FROM pins WHERE user_id = ? AND created_at >= ?', [userId, startOfMonth]);
  const lastMonth = count(
    'SELECT COUNT(*) AS c FROM pins WHERE user_id = ? AND created_at >= ? AND created_at < ?',
    [userId, startOfLastMonth, startOfMonth],
  );
  const pending = count("SELECT COUNT(*) AS c FROM pins WHERE user_id = ? AND status IN ('pending','running')", [userId]);
  const finished = count("SELECT COUNT(*) AS c FROM pins WHERE user_id = ? AND status = 'finished'", [userId]);
  const expired = count("SELECT COUNT(*) AS c FROM pins WHERE user_id = ? AND status = 'expired'", [userId]);
  const cheating = count("SELECT COUNT(*) AS c FROM pins WHERE user_id = ? AND verdict = 'cheating'", [userId]);

  const finishedThisWeek = count(
    "SELECT COUNT(*) AS c FROM pins WHERE user_id = ? AND status = 'finished' AND finished_at >= ?",
    [userId, now - 7 * DAY_MS],
  );

  const growth = lastMonth === 0 ? (thisMonth > 0 ? 100 : 0) : Math.round(((thisMonth - lastMonth) / lastMonth) * 100);

  return {
    daily: { used: today, quota: dailyQuota, unlimited: dailyQuota === null, resetsAt: startOfToday + DAY_MS },
    total,
    thisMonth,
    lastMonth,
    growth,
    pending,
    finished,
    expired,
    cheating,
    finishedThisWeek,
    completionRate: total === 0 ? 0 : Math.round((finished / total) * 1000) / 10,
  };
}

module.exports = {
  ALPHABET,
  GAMES,
  STATUSES,
  VISIBILITIES,
  generateCode,
  uniqueCode,
  createPin,
  getPinById,
  getPinByCode,
  getPinByIngestToken,
  canView,
  canEdit,
  listPins,
  shapePin,
  pinDetail,
  detectionBreakdown,
  updatePin,
  deletePin,
  startPin,
  finishPin,
  expireStalePins,
  sharePin,
  removeShare,
  statsForUser,
  downloadUrl,
};
