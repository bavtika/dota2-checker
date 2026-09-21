const levels = { debug: 10, info: 20, warn: 30, error: 40 };
const current = levels[(process.env.LOG_LEVEL || 'info').toLowerCase()] ?? levels.info;

function log(level, message, meta) {
  if (levels[level] < current) return;
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...(meta && Object.keys(meta).length ? { meta } : {}),
  };
  const line = JSON.stringify(entry);
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

module.exports = {
  debug: (msg, meta) => log('debug', msg, meta),
  info: (msg, meta) => log('info', msg, meta),
  warn: (msg, meta) => log('warn', msg, meta),
  error: (msg, meta) => log('error', msg, meta),
};
