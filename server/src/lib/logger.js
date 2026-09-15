'use strict';

/** Tiny scoped logger (matches the Discord bot's style). */

const LEVELS = {
  info: '\x1b[36mINFO \x1b[0m',
  warn: '\x1b[33mWARN \x1b[0m',
  error: '\x1b[31mERROR\x1b[0m',
  debug: '\x1b[35mDEBUG\x1b[0m',
  ready: '\x1b[32mREADY\x1b[0m',
};

const enabled = process.env.NO_COLOR === undefined;

function stamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function write(level, scope, ...args) {
  const stream = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  stream(`${stamp()} ${enabled ? LEVELS[level] : level.toUpperCase()} [${scope}]`, ...args);
}

function scoped(scope) {
  return {
    info: (...a) => write('info', scope, ...a),
    warn: (...a) => write('warn', scope, ...a),
    error: (...a) => write('error', scope, ...a),
    ready: (...a) => write('ready', scope, ...a),
    debug: (...a) => {
      if (process.env.NODE_ENV !== 'production' || process.env.DEBUG) write('debug', scope, ...a);
    },
  };
}

module.exports = { scoped, ...scoped('hexscan') };
