// Local forward proxy for Safari IMA cells (browser/run-safari.mjs). WebDriver has nothing like Playwright's
// page.route, so the Safari session for an IMA cell is pointed at this proxy (W3C `proxy` capability, manual,
// httpProxy and sslProxy) and every request to a host other than the recording server is answered here, from the same
// pinned archive and with the same rules as run-browser.mjs extRoute:
//   - Google telemetry beacons: 204, never sent
//   - a URL in the archive (index.tsv; the publisher-config request keyed without its query): the archived bytes
//   - anything else: the connection is dropped (a network error, like route.abort()); nothing is fetched live
// HTTPS to an external host is terminated here with the harness's test certificate (browser/tls/, CN=localhost); the
// browser accepts it only because the session asks for acceptInsecureCerts. CONNECT to localhost or 127.0.0.1 (the
// recording servers) is tunnelled unchanged. Hosts under vastconf.invalid serve a canary page that run-safari.mjs loads
// first, to prove that the browser really sends script, frame, fetch, in-frame and Google-host traffic through the proxy before any IMA
// cell runs (a .invalid name cannot resolve, so a browser that ignores the proxy fails the canary and sends nothing).
// TELEMETRY and extKey are copies of run-browser.mjs (not exported there); keep them identical.
import http from 'node:http';
import net from 'node:net';
import tls from 'node:tls';
import fs from 'node:fs';
import path from 'node:path';

export const TELEMETRY = /^https?:\/\/((pagead2\.googlesyndication\.com|securepubads\.g\.doubleclick\.net|googleads\.g\.doubleclick\.net)\/(pagead\/(gen_204|ping|adview|interaction|conversion)|pcs\/view|activeview)|ep\d\.adtrafficquality\.google\/(generate_204|pagead\/sodar|getconfig\/sodar))/;
export const extKey = url => (/\/pagead\/ima_ppub_config/.test(url) ? url.split('?')[0] : url);
const LOCAL = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

export function readArchiveIndex(dir) {
  const idx = new Map();
  const f = dir && path.join(dir, 'index.tsv');
  if (f && fs.existsSync(f))
    for (const line of fs.readFileSync(f, 'utf8').split('\n').slice(1).filter(Boolean)) {
      const [url, sha, status, type, file] = line.split('\t'); idx.set(url, { sha, status: Number(status), type, file });
    }
  return idx;
}

// The canary: script, frame, fetch, a credentialed fetch from a cross-origin frame that must be a secure context (IMA's
// bridge frame needs one), and the archived ima3.js fetched from its real host (Google hosts are HSTS-preloaded, so this
// shows that the intercepted certificate is accepted there too, not only on the .invalid names).
const IMA3 = 'https://imasdk.googleapis.com/js/sdkloader/ima3.js';
const canaryPage = ima3Len => `<!doctype html><html><head><meta charset="utf-8"><title>vastconf proxy canary</title></head><body>
<script>window.__canary = { script: false, frame: false, fetch: false, frameFetch: false, frameSecure: false, archive: ${ima3Len === null ? 'null' : 'false'} };
addEventListener('message', e => { if (e.origin === 'https://frame.vastconf.invalid' && e.data && e.data.vastconf) { window.__canary.frame = true; window.__canary.frameFetch = e.data.fetch === true; window.__canary.frameSecure = e.data.secure === true; } });
fetch('https://fetch.vastconf.invalid/x.json').then(r => r.json()).then(j => { window.__canary.fetch = j.ok === true; }, e => { window.__canary.fetchError = String(e); });
${ima3Len === null ? '' : `fetch('${IMA3}', { mode: 'cors' }).then(r => r.text()).then(t => { window.__canary.archive = t.length === ${ima3Len}; }, e => { window.__canary.archiveError = String(e); });`}</script>
<script src="https://script.vastconf.invalid/canary.js"></script>
<iframe src="https://frame.vastconf.invalid/frame.html" width="10" height="10"></iframe></body></html>`;
const CANARY = {
  '/canary.js': ['text/javascript', 'window.__canary.script = true;'],
  // as IMA's bridge frame does: a credentialed fetch from a cross-origin frame (which must be a secure context)
  '/frame.html': ['text/html; charset=utf-8', '<!doctype html><script>fetch("https://fetch2.vastconf.invalid/x.json", { credentials: "include" }).then(r => r.json()).then(j => j.ok === true, () => false).then(ok => parent.postMessage({ vastconf: 1, fetch: ok, secure: window.isSecureContext === true }, "*"))</script>'],
  '/x.json': ['application/json', '{"ok":true}'],
};
export const canaryPassed = c => !!(c && c.script && c.frame && c.fetch && c.frameFetch && c.frameSecure && c.archive !== false);

// archiveDir: the IMA archive (VASTCONF_EXT_ARCHIVE); tls: { key, cert } (PEM). Returns { port, url, log, close }.
export function startExtProxy({ archiveDir, tls: cred, host = '127.0.0.1', port = 0 }) {
  const index = readArchiveIndex(archiveDir);
  const log = [];
  const ima3 = index.get(IMA3);
  const ima3Len = ima3 ? fs.readFileSync(path.join(archiveDir, ima3.file), 'utf8').length : null;
  const canary = { ...CANARY, '/canary.html': ['text/html; charset=utf-8', canaryPage(ima3Len)] };
  const handler = (req, res) => {
    const enc = !!req.socket.encrypted;
    // proxied plain HTTP arrives in absolute form; requests inside a terminated TLS tunnel carry a path and a Host
    const url = /^https?:\/\//.test(req.url) ? req.url : `${enc ? 'https' : 'http'}://${req.headers.host}${req.url}`;
    const u = new URL(url);
    if (LOCAL.has(u.hostname)) return forwardLocal(req, res, u);
    const cors = { 'access-control-allow-origin': req.headers.origin || '*', 'access-control-allow-credentials': 'true', 'cache-control': 'no-store' };
    if (req.method === 'OPTIONS') {
      res.writeHead(204, { ...cors, 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': req.headers['access-control-request-headers'] || '*' });
      return res.end();
    }
    if (u.hostname.endsWith('.vastconf.invalid')) {
      const c = canary[u.pathname];
      log.push({ url, served: c ? 'canary' : 'canary 404' });
      res.writeHead(c ? 200 : 404, { ...cors, 'content-type': c ? c[0] : 'text/plain' });
      return res.end(c ? c[1] : '');
    }
    if (TELEMETRY.test(url)) { log.push({ url, served: 'telemetry stub (204, not sent)' }); res.writeHead(204, { 'access-control-allow-origin': '*' }); return res.end(); }
    const hit = index.get(extKey(url));
    if (hit) {
      log.push({ url, served: 'archive' });
      res.writeHead(hit.status, { 'content-type': hit.type, 'access-control-allow-origin': '*', 'cache-control': 'no-store' });
      return res.end(fs.readFileSync(path.join(archiveDir, hit.file)));
    }
    log.push({ url, served: 'blocked (not in archive)' });
    req.socket.destroy();
  };
  const inner = http.createServer(handler); // never listens: receives decrypted tunnel sockets
  inner.on('clientError', (e, s) => { try { s.destroy(); } catch {} });
  const server = http.createServer(handler);
  server.on('clientError', (e, s) => { try { s.destroy(); } catch {} });
  const tunnels = new Set();
  server.on('connect', (req, sock, head) => {
    tunnels.add(sock); sock.on('close', () => tunnels.delete(sock));
    sock.on('error', () => {});
    const i = req.url.lastIndexOf(':');
    const h = req.url.slice(0, i).replace(/^\[|\]$/g, ''), p = Number(req.url.slice(i + 1)) || 443;
    if (LOCAL.has(h) || LOCAL.has(`[${h}]`)) {
      const up = net.connect(p, '127.0.0.1', () => { sock.write('HTTP/1.1 200 Connection Established\r\n\r\n'); if (head && head.length) up.write(head); up.pipe(sock); sock.pipe(up); });
      up.on('error', () => sock.destroy()); sock.on('close', () => up.destroy());
      return;
    }
    sock.write('HTTP/1.1 200 Connection Established\r\n\r\n');
    if (head && head.length) sock.unshift(head);
    const t = new tls.TLSSocket(sock, { isServer: true, key: cred.key, cert: cred.cert, ALPNProtocols: ['http/1.1'] });
    t.on('error', () => sock.destroy());
    inner.emit('connection', t);
  });
  return new Promise(resolve => server.listen(port, host, () => {
    const p = server.address().port;
    resolve({ port: p, url: `${host}:${p}`, log, index,
      close: () => new Promise(r => { for (const s of tunnels) s.destroy(); server.close(() => r()); }) });
  }));
}

function forwardLocal(req, res, u) {
  const up = http.request({ host: '127.0.0.1', port: u.port || 80, method: req.method, path: u.pathname + u.search, headers: req.headers }, r => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
  up.on('error', () => { try { res.writeHead(502); res.end(); } catch {} });
  req.pipe(up);
}
