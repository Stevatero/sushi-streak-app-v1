// Logger strutturato minimale: una riga JSON per evento, pronta per journald/PM2/aggregatori.
// Livello configurabile con LOG_LEVEL (debug | info | warn | error | silent).

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };

function resolveLevel() {
  const configured = (process.env.LOG_LEVEL || '').toLowerCase();
  if (configured in LEVELS) return configured;
  return process.env.NODE_ENV === 'test' ? 'silent' : 'info';
}

let threshold = LEVELS[resolveLevel()];

function serializeError(err) {
  if (!(err instanceof Error)) return err;
  return { name: err.name, message: err.message, code: err.code, stack: err.stack };
}

function write(level, message, fields) {
  if (LEVELS[level] < threshold) return;
  const entry = { time: new Date().toISOString(), level, msg: message };
  if (fields) {
    for (const [key, value] of Object.entries(fields)) {
      entry[key] = key === 'err' ? serializeError(value) : value;
    }
  }
  const line = JSON.stringify(entry);
  if (LEVELS[level] >= LEVELS.warn) process.stderr.write(`${line}\n`);
  else process.stdout.write(`${line}\n`);
}

const logger = {
  debug: (msg, fields) => write('debug', msg, fields),
  info: (msg, fields) => write('info', msg, fields),
  warn: (msg, fields) => write('warn', msg, fields),
  error: (msg, fields) => write('error', msg, fields),
  setLevel: (level) => {
    if (level in LEVELS) threshold = LEVELS[level];
  },
};

module.exports = logger;
