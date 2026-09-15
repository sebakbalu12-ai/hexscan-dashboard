'use strict';

const { createClient } = require('@libsql/client');
const config = require('./config');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || config.tursoUrl || "libsql://hexscan-db-bazsi.aws-eu-west-1.turso.io",
  authToken: process.env.TURSO_AUTH_TOKEN || config.tursoAuthToken || "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODk0OTY3ODAsImlkIjoiMDFhMGE2MzktM2UwMS03MTZiLWJiMjItMWE5ZmZjYjJiMTk2Iiwia2lkIjoiS1k2djF4eEFoenpfbHM4VS1zbUJMUzBxUUlFUldJMHZEQlpCdkg2cjd2NCIsInJpZCI6IjAxNDdiMmYzLTU0ZDEtNDI4ZC05NWFiLTljODBjNzVjMDhiZCJ9.y1uKdD8f4j6IjEeiwabyxlMqRe9mLx02B-bM7xMYEnXLH5zyZZK0I_8jPwy4gjeO-Gmxh70W6iGXVNCW_PqHAg",
});

async function init() {
  try {
    await db.execute("SELECT 1");
    console.log("Sikeres csatlakozás a Turso adatbázishoz!");
  } catch (err) {
    console.error("Hiba a Turso csatlakozás során:", err);
  }
  return db;
}


const run = async (sql, params = []) => {
  return await db.execute({ sql, args: params });
};

const get = async (sql, params = []) => {
  const result = await db.execute({ sql, args: params });
  return result.rows[0] || null;
};

const all = async (sql, params = []) => {
  const result = await db.execute({ sql, args: params });
  return result.rows;
};


async function audit(userId, action, meta = null) {
  const actor = typeof userId === 'number' && Number.isInteger(userId) ? userId : null;
  const payload = actor === null && userId != null ? { ...(meta || {}), actor: String(userId) } : meta;

  await run('INSERT INTO audit_log (user_id, action, meta, created_at) VALUES (?, ?, ?, ?)', [
    actor,
    action,
    payload ? JSON.stringify(payload) : null,
    Date.now(),
  ]);
}

module.exports = { db, init, run, get, all, audit };