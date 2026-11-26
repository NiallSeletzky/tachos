'use strict';

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

function loadEnvFile(envPath = path.join(__dirname, '.env')) {
  if (!fs.existsSync(envPath)) return false;
  try {
    const raw = fs.readFileSync(envPath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx <= 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
      if (Object.prototype.hasOwnProperty.call(process.env, key) && process.env[key] !== '') {
        continue;
      }
      let value = trimmed.slice(eqIdx + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
        (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
    return true;
  } catch {
    return false;
  }
}

function shouldAutoStart() {
  if (process.env.TACHOS_NO_AUTOSTART === '1') return false;
  if (Array.isArray(process.execArgv) && process.execArgv.includes('--test')) return false;
  return true;
}

function startPassengerServer(options = {}) {
  loadEnvFile(options.envPath);

  const serverModuleUrl = pathToFileURL(path.join(__dirname, 'server.mjs')).href;
  let appPromise = null;

  function ensureApp() {
    if (!appPromise) {
      appPromise = import(serverModuleUrl).then((mod) => mod.createTachosKbServer(options.serverOptions || {}));
    }
    return appPromise;
  }

  // Kick off ESM import immediately while synchronously binding http.Server for Passenger / lsnode.
  ensureApp().catch((err) => {
    process.stderr.write(`TACHOS KB bootstrap error: ${err && err.message ? err.message : 'unknown error'}\n`);
  });

  const server = http.createServer((req, res) => {
    ensureApp()
      .then((app) => app.handleRequest(req, res))
      .catch(() => {
        if (!res.headersSent) {
          res.writeHead(503, { 'content-type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'service_unavailable', message: 'TACHOS KB backend failed to initialise.' }));
        }
      });
  });

  const port = options.port !== undefined
    ? options.port
    : (process.env.PORT ? Number(process.env.PORT) : 3100);
  const host = options.host ?? process.env.HOST ?? '127.0.0.1';

  // Synchronous bind on require() for HostArmada Passenger / LiteSpeed lsnode compatibility.
  if (process.env.PASSENGER_APP_ENV || process.env.LSNODE_SOCKET) {
    server.listen(port);
  } else {
    server.listen(port, host);
  }

  return { server, ensureApp };
}

loadEnvFile();

let activeServer = null;
if (shouldAutoStart()) {
  activeServer = startPassengerServer().server;
}

module.exports = {
  loadEnvFile,
  shouldAutoStart,
  startPassengerServer,
  server: activeServer
};
