'use strict';

/**
 * Demo report generator.
 *
 * Used by `npm run seed` and by the "simulate collector" endpoint so the whole
 * pending -> finished flow can be explored without a real collector agent.
 * The detections mirror the wording of the reference product.
 */

const DETECTION_POOL = [
  { title: 'Unrecognized module', detail: 'Process: {game}.exe · Module: sample-module.dll', severity: 'instance', category: 'Overview', weight: 3 },
  { title: 'Execution trace found', detail: 'Source: Prefetch · File: example-loader.exe', severity: 'warning', category: 'Overview', weight: 2 },
  { title: 'Modified file signature', detail: 'Source: Amcache · Signature requires review', severity: 'boot', category: 'Integrity logs', weight: 2 },
  { title: 'Injected thread detected', detail: 'Target: {game}.exe · Remote thread origin unknown', severity: 'instance', category: 'Overview', weight: 4 },
  { title: 'Suspicious driver loaded', detail: 'Driver: vuln-driver.sys · Known vulnerable signature', severity: 'boot', category: 'Integrity logs', weight: 5 },
  { title: 'Unknown overlay window', detail: 'Window text: "overlay_host" · Not bounded to the game process', severity: 'instance', category: 'Suspicious logs', weight: 3 },
  { title: 'Timestomped system file', detail: 'Source: MFT · Timestamp precedes install date', severity: 'warning', category: 'Integrity logs', weight: 4 },
  { title: 'Recent cheat string in memory', detail: 'Pattern match on loaded pages (obfuscated)', severity: 'instance', category: 'Suspicious logs', weight: 5 },
  { title: 'Debugger attached', detail: 'Process debugging flag set while the game was running', severity: 'instance', category: 'Overview', weight: 3 },
  { title: 'Startup entry added', detail: 'Registry Run key written in the last 24 hours', severity: 'boot', category: 'Suspicious logs', weight: 2 },
  { title: 'Cleared event logs', detail: 'Source: Security · 1102 event missing', severity: 'warning', category: 'Integrity logs', weight: 4 },
  { title: 'Screen capture hook', detail: 'DXGI duplication target outside the game window', severity: 'instance', category: 'Overview', weight: 4 },
];

const SYSTEMS = [
  { os: 'Windows 11 Pro', install: '2026-01-12 09:30', cpu: 'AMD Ryzen 5 5600X', gpu: 'NVIDIA RTX 3060', ram: '16 GB', disk: 'Samsung 980 1TB' },
  { os: 'Windows 10 Home', install: '2025-08-04 18:12', cpu: 'Intel i5-10400F', gpu: 'NVIDIA GTX 1660 Super', ram: '16 GB', disk: 'Kingston A2000 500GB' },
  { os: 'Windows 11 Home', install: '2024-11-21 11:05', cpu: 'Intel i7-12700K', gpu: 'NVIDIA RTX 4070', ram: '32 GB', disk: 'WD Black SN850X' },
  { os: 'Windows 10 Pro', install: '2023-05-30 20:44', cpu: 'AMD Ryzen 7 5800X3D', gpu: 'AMD RX 6700 XT', ram: '32 GB', disk: 'Crucial P3 1TB' },
];

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const shuffle = (list) => [...list].sort(() => Math.random() - 0.5);

/**
 * Build a believable report.
 * @param {object} options { game, player, cheat }
 */
function generateReport({ game = 'FiveM', player = 'suspect', cheat = null } = {}) {
  const cheatCase = cheat === null ? Math.random() < 0.55 : Boolean(cheat);
  const system = pick(SYSTEMS);

  const detections = [];
  if (cheatCase) {
    const count = 4 + Math.floor(Math.random() * 6);
    for (const entry of shuffle(DETECTION_POOL).slice(0, count)) {
      detections.push({
        title: entry.title,
        detail: String(entry.detail).replace(/\{game\}/g, game.replace(/\s+/g, '')),
        severity: entry.severity,
        category: entry.category,
        weight: entry.weight,
      });
    }
  } else if (Math.random() < 0.6) {
    const entry = pick(DETECTION_POOL.filter((d) => d.severity !== 'instance'));
    detections.push({
      title: entry.title,
      detail: String(entry.detail).replace(/\{game\}/g, game.replace(/\s+/g, '')),
      severity: entry.severity,
      category: entry.category,
      weight: entry.weight,
    });
  }

  const weight = detections.reduce((sum, d) => sum + (d.weight || 2), 0);
  const riskScore = detections.length === 0 ? Math.floor(Math.random() * 6) : Math.min(98, 22 + weight * 4);

  const verdict = riskScore >= 60 ? 'cheating' : riskScore >= 25 ? 'suspicious' : 'clean';
  const minutes = 1 + Math.floor(Math.random() * 3);

  return {
    verdict,
    riskScore,
    riskHistory: 25 + Math.floor(Math.random() * 65),
    durationMs: (minutes * 60 + Math.floor(Math.random() * 59)) * 1000,
    warnings: detections.filter((d) => d.severity === 'warning').length,
    detections: detections.map(({ weight: _weight, ...rest }) => rest),
    pcInfo: {
      bootTime: `${1 + Math.floor(Math.random() * 9)}d ago`,
      vpn: Math.random() < 0.25 ? 'Yes' : 'No',
      recycleTime: `${10 + Math.floor(Math.random() * 50)} min ago`,
      os: system.os,
      installDate: system.install,
      game,
      windowText: pick(['None', 'HexScan', 'Discord', 'Steam', 'Screen Capture Host']),
      cpu: system.cpu,
      gpu: system.gpu,
      ram: system.ram,
      disk: system.disk,
    },
    player,
  };
}

module.exports = { generateReport, DETECTION_POOL, SYSTEMS };
