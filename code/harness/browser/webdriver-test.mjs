// Tests for browser/webdriver.mjs, browser/webdriver-proxy.mjs and browser/run-safari.mjs without a browser: a fake
// W3C WebDriver server (this file) executes the runner's scripts in a Node vm context that stands in for the test
// page (window.VASTCONF.run makes the real HTTP requests a client would, to the real recording server), and emulates
// frames, element clicks, popups, timeouts and the capability refusals Safari can answer with.
// Usage: node browser/webdriver-test.mjs        (exit code 0 = all passed; needs no browser, no network)
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import tls from 'node:tls';
import vm from 'node:vm';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { WebDriver, WebDriverError, ELEMENT_KEY } from './webdriver.mjs';
import { startExtProxy, readArchiveIndex } from './webdriver-proxy.mjs';
import { startServer } from '../server.mjs';

const here = path.dirname(new URL(import.meta.url).pathname);
const CERT = fs.readFileSync(path.join(here, 'tls/cert.pem'));
const KEY = fs.readFileSync(path.join(here, 'tls/key.pem'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];
async function test(name, fn) {
  const t0 = Date.now();
  try { await fn(); results.push({ name, ok: true }); console.log(`ok   ${name} (${Date.now() - t0} ms)`); }
  catch (e) { results.push({ name, ok: false }); console.log(`FAIL ${name}: ${e && e.stack || e}`); }
}

// ---- HTTP helpers that go through the proxy as a browser would
function viaProxyHttps(proxyPort, url) {
  const u = new URL(url);
  return new Promise((resolve, reject) => {
    const c = http.request({ host: '127.0.0.1', port: proxyPort, method: 'CONNECT', path: `${u.hostname}:${u.port || 443}` });
    c.on('connect', (res, sock) => {
      if (res.statusCode !== 200) return reject(new Error('CONNECT ' + res.statusCode));
      const t = tls.connect({ socket: sock, servername: net.isIP(u.hostname) ? undefined : u.hostname, rejectUnauthorized: false }, () => {
        const r = https.request({ createConnection: () => t, host: u.hostname, path: u.pathname + u.search, method: 'GET', headers: { host: u.host } }, resp => {
          const b = []; resp.on('data', d => b.push(d)); resp.on('end', () => { resolve({ status: resp.statusCode, headers: resp.headers, body: Buffer.concat(b).toString() }); sock.destroy(); });
        });
        r.on('error', reject); r.end();
      });
      t.on('error', reject);
    });
    c.on('error', reject); c.end();
  });
}
function viaProxyHttp(proxyPort, url) {
  return new Promise((resolve, reject) => {
    const r = http.request({ host: '127.0.0.1', port: proxyPort, method: 'GET', path: url, headers: { host: new URL(url).host } }, resp => {
      const b = []; resp.on('data', d => b.push(d)); resp.on('end', () => resolve({ status: resp.statusCode, body: Buffer.concat(b).toString() }));
    });
    r.on('error', e => resolve({ status: 'error', error: e.code || e.message })); r.end();
  });
}
function get(url) { // direct, trusting the test certificate for https://localhost
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, url.startsWith('https') ? { ca: CERT } : {}, resp => { const b = []; resp.on('data', d => b.push(d)); resp.on('end', () => resolve({ status: resp.statusCode, body: Buffer.concat(b).toString() })); }).on('error', reject);
  });
}

// ---- the fake WebDriver server
// mode flags: refuseInsecure (acceptInsecureCerts not honored), ignoreProxy (session created, proxy not used),
// noFrameFetch (fetch from the cross-origin frame fails), disabled (remote automation off), hang (VASTCONF.run never resolves), busyOnce (first new-session fails as busy)
function startFakeDriver(mode = {}) {
  const sessions = new Map();
  const log = [];
  let sid = 0, busy = !!mode.busyOnce, active = 0, maxActive = 0;
  const reply = (res, status, value) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify({ value })); };
  const err = (res, status, error, message) => reply(res, status, { error, message, stacktrace: '' });
  function newPage(S, url) {
    const ctxObj = { console: { log() {}, info() {}, warn() {}, error() {}, debug() {} }, setTimeout, clearTimeout, Promise, JSON, String, Array, Object, Error, location: { href: url } };
    ctxObj.window = ctxObj; ctxObj.globalThis = ctxObj;
    const u = new URL(url);
    if (u.pathname.endsWith('/harness/page.html')) {
      ctxObj.VASTCONF = { ready: true, run: async (client, tag, opts, script) => {
        if (mode.hang) return new Promise(() => {});
        const steps = [];
        ctxObj.console.log('fake page: running', client); // exercised by the runner's console hook
        const r = await get(tag); steps.push({ step: 'fetch', status: r.status });
        if (script && script.kind === 'skip') { const c = await ctxObj.vastconfFrameClick(['button.videoAdUiSkipButton']); steps.push({ step: 'skip button clicked', ...c }); }
        if (script && script.kind === 'click') { const c = await ctxObj.vastconfFrameClick(['div.videoAdUiClickElement']); steps.push({ step: 'click', ...c }); if (c.clicked) S.windows.push({ handle: 'w-popup-' + S.windows.length, url: 'https://advertiser.example/landing' }); }
        return { client: { id: client, version: 'fake' }, url: tag, opts, ok: r.status === 200, steps, resolved: [], played: [], startedMuted: false, uncaught: [], pixels: [], telemetry: { userAgent: 'fake' } };
      } };
    }
    return { url, ctx: vm.createContext(ctxObj) };
  }
  async function navigate(S, url) {
    const u = new URL(url);
    const useProxy = S.caps.proxy && S.caps.proxy.proxyType === 'manual' && !mode.ignoreProxy;
    if (u.hostname.endsWith('.vastconf.invalid')) {
      const page = newPage(S, url);
      const can = { script: false, frame: false, fetch: false, frameFetch: false, frameSecure: false, archive: false };
      if (useProxy) {
        const pp = Number(S.caps.proxy.sslProxy.split(':').pop());
        try {
          const html = await viaProxyHttps(pp, url);
          if (html.status === 200 && /canary\.js/.test(html.body)) {
            can.script = (await viaProxyHttps(pp, 'https://script.vastconf.invalid/canary.js')).body.includes('__canary.script = true');
            const fr = (await viaProxyHttps(pp, 'https://frame.vastconf.invalid/frame.html')).body;
            can.frame = fr.includes('fetch2.vastconf.invalid');
            if (can.frame && !mode.noFrameFetch) can.frameFetch = JSON.parse((await viaProxyHttps(pp, 'https://fetch2.vastconf.invalid/x.json')).body).ok === true;
            can.frameSecure = can.frame && !mode.insecureFrame;
            const m = /t\.length === (\d+)/.exec(html.body);
            can.archive = !!m && (await viaProxyHttps(pp, 'https://imasdk.googleapis.com/js/sdkloader/ima3.js')).body.length === Number(m[1]) && !mode.hstsRefuses;
            can.fetch = JSON.parse((await viaProxyHttps(pp, 'https://fetch.vastconf.invalid/x.json')).body).ok === true;
          }
        } catch {}
      } else { S.page = null; throw Object.assign(new Error('unknown error'), { wd: ['unknown error', 'A server with the specified hostname could not be found.'] }); }
      page.ctx.__canary = can;
      S.page = page;
      return;
    }
    if (u.protocol === 'https:') await get(url); // the page itself really comes from the HTTPS recording server
    S.page = newPage(S, url);
  }
  const server = http.createServer(async (req, res) => {
    const chunks = []; for await (const c of req) chunks.push(c);
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString() || '{}') : {};
    const p = new URL(req.url, 'http://x').pathname.split('/').filter(Boolean);
    log.push(`${req.method} /${p.join('/')}`);
    if (p[0] === 'status') return reply(res, 200, { ready: true, message: 'fake' });
    if (p[0] !== 'session') return err(res, 404, 'unknown command', req.url);
    if (p.length === 1 && req.method === 'POST') {
      if (mode.disabled) return err(res, 500, 'session not created', 'You must enable \'Allow remote automation\' in the Developer section of Safari Settings to control Safari via WebDriver.');
      if (busy) { busy = false; return err(res, 500, 'session not created', 'Could not create a session: The Safari instance is already paired with another WebDriver session.'); }
      if (active > 0) return err(res, 500, 'session not created', 'Could not create a session: The Safari instance is already paired with another WebDriver session.');
      const caps = (body.capabilities && body.capabilities.alwaysMatch) || {};
      if (caps.acceptInsecureCerts && mode.refuseInsecure) return err(res, 400, 'session not created', "Capability 'acceptInsecureCerts' could not be honored.");
      const id = 's' + (++sid); active++; maxActive = Math.max(maxActive, active);
      sessions.set(id, { caps, page: null, frame: 'top', windows: [{ handle: 'w-main', url: 'about:blank' }], current: 'w-main', clicks: [] });
      return reply(res, 200, { sessionId: id, capabilities: { browserName: 'Safari', browserVersion: '26.0-fake', platformName: 'mac', acceptInsecureCerts: !!caps.acceptInsecureCerts, proxy: caps.proxy || {} } });
    }
    const S = sessions.get(p[1]);
    if (!S) return err(res, 404, 'invalid session id', p[1]);
    const sub = p.slice(2).join('/');
    try {
      if (req.method === 'DELETE' && sub === '') { sessions.delete(p[1]); active--; return reply(res, 200, null); }
      if (sub === 'timeouts' || sub === 'window/rect' || sub === 'actions') return reply(res, 200, null);
      if (sub === 'url' && req.method === 'POST') { await navigate(S, body.url); S.frame = 'top'; return reply(res, 200, null); }
      if (sub === 'url') { const w = S.windows.find(w => w.handle === S.current); return reply(res, 200, w && w.handle !== 'w-main' ? w.url : S.page && S.page.url); }
      if (sub === 'window' && req.method === 'GET') return reply(res, 200, S.current);
      if (sub === 'window' && req.method === 'POST') { if (!S.windows.some(w => w.handle === body.handle)) return err(res, 404, 'no such window', body.handle); S.current = body.handle; return reply(res, 200, null); }
      if (sub === 'window' && req.method === 'DELETE') { S.windows = S.windows.filter(w => w.handle !== S.current); return reply(res, 200, S.windows.map(w => w.handle)); }
      if (sub === 'window/handles') return reply(res, 200, S.windows.map(w => w.handle));
      if (sub === 'window/new') { const h = 'w-new-' + S.windows.length; S.windows.push({ handle: h, url: 'about:blank' }); return reply(res, 200, { handle: h, type: 'tab' }); }
      if (sub === 'frame') { const id = body.id; S.frame = id === null ? 'top' : id[ELEMENT_KEY] === 'f1' ? 'f1' : (() => { throw new Error('no such frame'); })(); return reply(res, 200, null); }
      if (sub === 'frame/parent') { S.frame = 'top'; return reply(res, 200, null); }
      if (sub === 'elements') {
        const v = body.value;
        if (S.frame === 'top' && /iframe/.test(v)) return reply(res, 200, [{ [ELEMENT_KEY]: 'f1' }]);
        if (S.frame === 'f1' && v === 'button.videoAdUiSkipButton') return reply(res, 200, [{ [ELEMENT_KEY]: 'b-skip' }]);
        if (S.frame === 'f1' && v === 'div.videoAdUiClickElement') return reply(res, 200, [{ [ELEMENT_KEY]: 'b-click' }]);
        return reply(res, 200, []);
      }
      if (p[2] === 'element' && p[4] === 'displayed') return reply(res, 200, true);
      if (p[2] === 'element' && p[4] === 'click') { S.clicks.push(p[3]); return reply(res, 200, null); }
      if (sub === 'execute/sync') {
        if (S.frame !== 'top') { if (/location\.href/.test(body.script) && !/querySelectorAll/.test(body.script)) return reply(res, 200, 'https://imasdk.googleapis.com/js/core/bridge3.794.0_en.html'); return reply(res, 200, []); }
        if (!S.page) return err(res, 500, 'javascript error', 'no page');
        S.page.ctx.__args = body.args || [];
        let v;
        try { v = vm.runInContext(`(function(){${body.script}\n}).apply(window, __args)`, S.page.ctx); }
        catch (e) { return err(res, 500, 'javascript error', String(e.message)); }
        if (v && typeof v.then === 'function') v = await v;
        return reply(res, 200, v === undefined ? null : JSON.parse(JSON.stringify(v)));
      }
      return err(res, 404, 'unknown command', `${req.method} ${sub}`);
    } catch (e) { return err(res, 500, (e.wd && e.wd[0]) || 'unknown error', (e.wd && e.wd[1]) || String(e.message)); }
  });
  return new Promise(r => server.listen(0, '127.0.0.1', () => r({ url: `http://127.0.0.1:${server.address().port}`, log, sessions, stats: () => ({ maxActive, created: sid }), close: () => new Promise(c => { server.closeAllConnections && server.closeAllConnections(); server.close(c); }) })));
}

function runSafari(args, env = {}) {
  return new Promise(resolve => {
    const p = spawn(process.execPath, ['--no-deprecation', path.join(here, 'run-safari.mjs'), ...args], { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = ''; p.stdout.on('data', d => { out += d; }); p.stderr.on('data', d => { out += d; });
    p.on('exit', code => resolve({ code, out }));
  });
}
const readJsonl = f => fs.readFileSync(f, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vastconf-wdtest-'));
const ARCHIVE = path.resolve(here, '../../../sources/ima-html5/2026-10-16');

// ---------------- WebDriver client
await test('client: session, execute, W3C error mapping', async () => {
  const fd = await startFakeDriver();
  const wd = new WebDriver(fd.url);
  assert.equal((await wd.status()).ready, true);
  const s = await wd.newSession({ alwaysMatch: { browserName: 'safari' } });
  assert.equal(s.capabilities.browserVersion, '26.0-fake');
  await assert.rejects(s.execute('return 1'), e => e instanceof WebDriverError && e.error === 'javascript error');
  await s.delete();
  await assert.rejects(s.execute('return 1'), e => e.error === 'invalid session id' && e.status === 404);
  await fd.close();
});
await test('client: busy driver is retried, refused capability is not', async () => {
  const fd = await startFakeDriver({ busyOnce: true, refuseInsecure: true });
  const wd = new WebDriver(fd.url);
  let retries = 0;
  const s = await wd.newSessionRetry({ alwaysMatch: { browserName: 'safari' } }, { waitMs: 10, onRetry: () => retries++ });
  assert.equal(retries, 1); await s.delete();
  let r2 = 0;
  await assert.rejects(wd.newSessionRetry({ alwaysMatch: { browserName: 'safari', acceptInsecureCerts: true } }, { waitMs: 10, onRetry: () => r2++ }), e => /could not be honored/.test(e.message));
  assert.equal(r2, 0);
  await fd.close();
});
await test('client: command timeout and dead driver surface as harness errors', async () => {
  const hang = http.createServer(() => {}); await new Promise(r => hang.listen(0, '127.0.0.1', r));
  const wd = new WebDriver(`http://127.0.0.1:${hang.address().port}`, { commandTimeoutMs: 300 });
  await assert.rejects(wd.status(), e => e.error === 'harness timeout' || e.error === 'connection failed');
  await assert.rejects(wd.req('GET', '/x', undefined, { timeoutMs: 200 }), e => e.error === 'harness timeout');
  hang.closeAllConnections(); hang.close();
  const dead = new WebDriver('http://127.0.0.1:1');
  await assert.rejects(dead.status(), e => e.error === 'connection failed');
});

// ---------------- the copies of run-browser.mjs (it starts servers at import, so they cannot be imported)
await test('copies: CONFIGS, TELEMETRY and extKey identical to run-browser.mjs', async () => {
  const src = f => fs.readFileSync(path.join(here, f), 'utf8');
  const block = (s, a, b) => { const i = s.indexOf(a); assert.ok(i >= 0, a); return s.slice(i, s.indexOf(b, i)); };
  const pw = src('run-browser.mjs'), sa = src('run-safari.mjs'), px = src('webdriver-proxy.mjs');
  assert.equal(block(sa, '\nconst CONFIGS = [', '].filter'), block(pw, '\nconst CONFIGS = [', '].filter'), 'run-safari.mjs CONFIGS differ from run-browser.mjs');
  const line = (s, a) => (s.split('\n').find(l => l.includes(a)) || '').replace(/^export /, '');
  assert.equal(line(px, 'const TELEMETRY = '), line(pw, 'const TELEMETRY = '), 'webdriver-proxy.mjs TELEMETRY differs');
  assert.equal(line(px, 'const extKey = '), line(pw, 'const extKey = '), 'webdriver-proxy.mjs extKey differs');
  const labels = [...block(sa, '\nconst CONFIGS = [', '].filter').matchAll(/label: '([^']+)'/g)].map(m => m[1]);
  assert.deepEqual(labels, ['vastclient', 'videoadsdk', 'iabloader', 'iabloader+nsap', 'shaka', 'rmpvast', 'rmpvast+omid', 'ima']);
  const { TELEMETRY } = await import('./webdriver-proxy.mjs');
  for (const u of ['https://ep1.adtrafficquality.google/getconfig/sodar?sv=200', 'https://ep2.adtrafficquality.google/generate_204?x', 'https://ep2.adtrafficquality.google/pagead/sodar?id=1',
    'https://pagead2.googlesyndication.com/pagead/gen_204?id=x', 'https://securepubads.g.doubleclick.net/pcs/view?x'])
    assert.ok(TELEMETRY.test(u), 'telemetry stub covers ' + u);
  assert.ok(!TELEMETRY.test('https://ep2.adtrafficquality.google/sodar/sodar2.js'), 'Sodar script is an archived SDK resource, not telemetry');
});

// ---------------- proxy
await test('proxy: archive, telemetry stub, block, canary, local tunnel and forward', async () => {
  const srvTls = await startServer({ root: path.join(here, '../suite/vectors-browser'), tls: { key: KEY, cert: CERT }, publicHost: 'localhost' });
  const srvHttp = await startServer({ root: path.join(here, '../suite/vectors-browser') });
  const px = await startExtProxy({ archiveDir: ARCHIVE, tls: { key: KEY, cert: CERT } });
  const idx = readArchiveIndex(ARCHIVE);
  assert.ok(idx.size >= 5, 'archive index read');
  const ima3 = await viaProxyHttps(px.port, 'https://imasdk.googleapis.com/js/sdkloader/ima3.js');
  assert.equal(ima3.status, 200);
  assert.equal(ima3.body, fs.readFileSync(path.join(ARCHIVE, idx.get('https://imasdk.googleapis.com/js/sdkloader/ima3.js').file), 'utf8'));
  const cfg = await viaProxyHttps(px.port, 'https://securepubads.g.doubleclick.net/pagead/ima_ppub_config?ippd=https%3A%2F%2Flocalhost%3A5555%2Fharness%2Fpage.html');
  assert.equal(cfg.status, 200, 'publisher config keyed without its query');
  const tel = await viaProxyHttps(px.port, 'https://pagead2.googlesyndication.com/pagead/gen_204?id=x');
  assert.equal(tel.status, 204);
  await assert.rejects(viaProxyHttps(px.port, 'https://www.google.com/'), 'not in archive: connection dropped');
  const plainBlocked = await viaProxyHttp(px.port, 'http://example.com/x');
  assert.equal(plainBlocked.status, 'error');
  assert.equal((await viaProxyHttps(px.port, 'https://script.vastconf.invalid/canary.js')).status, 200);
  // CONNECT to localhost reaches the HTTPS recording server unchanged (its own certificate, no interception)
  const caseUrl = `${srvTls.base}/doc/pxt1/w_basic/start.xml`;
  const viaTunnel = await viaProxyHttps(px.port, caseUrl);
  assert.equal(viaTunnel.status, (await get(caseUrl.replace('pxt1', 'pxt2'))).status);
  assert.ok((srvTls.log.get('pxt1') || []).length === 1, 'tunnelled request logged by the recording server');
  const fwd = await viaProxyHttp(px.port, `${srvHttp.base}/doc/pxt3/w_basic/start.xml`);
  assert.ok((srvHttp.log.get('pxt3') || []).length === 1 && typeof fwd.status === 'number', 'plain http to 127.0.0.1 forwarded');
  const served = px.log.map(e => e.served);
  for (const k of ['archive', 'telemetry stub (204, not sent)', 'blocked (not in archive)', 'canary']) assert.ok(served.includes(k), k);
  await px.close(); await srvTls.close(); await srvHttp.close();
});

// ---------------- the runner end to end against the fake driver
const Q = 'T1[6-7]|W01';
await test('runner: catalog subset, session per run, frame-click bridge, popup, outputs', async () => {
  const fd = await startFakeDriver();
  const out = path.join(tmp, 'r1');
  const r = await runSafari(['--out', out, '--driver-url', fd.url, '--only', Q, '--clients', 'vastclient,ima'], { VASTCONF_EXT_ARCHIVE: ARCHIVE });
  assert.equal(r.code, 0, r.out);
  const sum = JSON.parse(fs.readFileSync(path.join(out, 'safari/summary.json'), 'utf8')).browsers.safari;
  assert.equal(sum.launched, true); assert.equal(sum.ima.enabled, true, JSON.stringify(sum.ima));
  assert.deepEqual(sum.configs, ['vastclient', 'ima']);
  const rows = readJsonl(path.join(out, 'safari/results.jsonl'));
  assert.equal(rows.length, 3 * 2);
  const mat = fs.readFileSync(path.join(out, 'safari/matrix.tsv'), 'utf8').trim().split('\n');
  assert.equal(mat[0], 'id\tarea\tstrength\tvastclient\tima'); assert.equal(mat.length, 4);
  for (const row of rows) { assert.ok(row.requests.some(x => / doc \S*start\.xml/.test(x)), 'recording server saw the tag request: ' + row.caseId); assert.ok(row.caseId.startsWith('sa')); }
  const skip = rows.find(x => x.id === 'T16' && x.config === 'ima');
  const st = skip.result.steps.find(x => x.step === 'skip button clicked');
  assert.equal(st.clicked, 'button.videoAdUiSkipButton'); assert.match(st.frame, /imasdk\.googleapis\.com/);
  assert.ok(skip.result.browserConsole.some(c => /fake page: running/.test(c.text)), 'console hook');
  assert.equal(skip.result.requestFailures, null);
  assert.equal(skip.result.webdriver.isolation, 'session');
  const st2 = fd.stats();
  assert.equal(st2.maxActive, 1, 'never two sessions at once');
  assert.ok(st2.created >= 1 + 1 + new Set(rows.map(x => x.caseId)).size, 'one session per client run (+ version and IMA probe sessions)');
  assert.ok(fs.readFileSync(path.join(out, 'progress.log'), 'utf8').includes('safari done'));
  await fd.close();
});
await test('runner: click-through popup recorded as clickThroughUrl', async () => {
  const fd = await startFakeDriver();
  const out = path.join(tmp, 'r1b');
  const r = await runSafari(['--out', out, '--driver-url', fd.url, '--only', '^W16$', '--clients', 'ima'], { VASTCONF_EXT_ARCHIVE: ARCHIVE });
  assert.equal(r.code, 0, r.out);
  // W16 runs a 'click' script; the fake page clicks IMA's click element through the bridge and opens a window
  const rows = readJsonl(path.join(out, 'safari/results.jsonl'));
  assert.equal(rows.length, 1);
  const x = rows[0];
  assert.equal(x.result.steps.find(s => s.step === 'click').clicked, 'div.videoAdUiClickElement');
  assert.deepEqual(x.result.popups, ['https://advertiser.example/landing']);
  assert.equal(x.result.clickThroughUrl, 'https://advertiser.example/landing');
  assert.ok(x.result.external.some(e => e.served === 'archive') === false, 'fake page loads nothing external; the log slice is per cell');
  await fd.close();
});
await test('runner: IMA skipped with a reason when acceptInsecureCerts is refused', async () => {
  const fd = await startFakeDriver({ refuseInsecure: true });
  const out = path.join(tmp, 'r2');
  const r = await runSafari(['--out', out, '--driver-url', fd.url, '--only', 'W01', '--clients', 'vastclient,ima'], { VASTCONF_EXT_ARCHIVE: ARCHIVE });
  assert.equal(r.code, 0, r.out);
  const sum = JSON.parse(fs.readFileSync(path.join(out, 'safari/summary.json'), 'utf8')).browsers.safari;
  assert.equal(sum.ima.enabled, false); assert.match(sum.ima.reason, /acceptInsecureCerts' could not be honored/);
  assert.deepEqual(sum.configs, ['vastclient']);
  assert.equal(readJsonl(path.join(out, 'safari/results.jsonl')).length, 1);
  await fd.close();
});
await test('runner: IMA skipped when the proxy capability is silently ignored (canary)', async () => {
  const fd = await startFakeDriver({ ignoreProxy: true });
  const out = path.join(tmp, 'r3');
  const r = await runSafari(['--out', out, '--driver-url', fd.url, '--only', 'W01', '--clients', 'ima'], { VASTCONF_EXT_ARCHIVE: ARCHIVE });
  assert.equal(r.code, 0, r.out);
  const sum = JSON.parse(fs.readFileSync(path.join(out, 'safari/summary.json'), 'utf8')).browsers.safari;
  assert.equal(sum.ima.enabled, false); assert.match(sum.ima.reason, /hostname could not be found|canary failed/);
  await fd.close();
});
await test('runner: IMA skipped when the in-frame fetch fails (canary)', async () => {
  const fd = await startFakeDriver({ noFrameFetch: true });
  const out = path.join(tmp, 'r3b');
  const r = await runSafari(['--out', out, '--driver-url', fd.url, '--only', 'W01', '--clients', 'ima'], { VASTCONF_EXT_ARCHIVE: ARCHIVE });
  assert.equal(r.code, 0, r.out);
  const sum = JSON.parse(fs.readFileSync(path.join(out, 'safari/summary.json'), 'utf8')).browsers.safari;
  assert.equal(sum.ima.enabled, false); assert.match(sum.ima.reason, /frameFetch false/);
  await fd.close();
});
await test('runner: IMA skipped when the Google host refuses the certificate (HSTS) or the frame is insecure', async () => {
  for (const [flag, re] of [['hstsRefuses', /archive false/], ['insecureFrame', /frameSecure false/]]) {
    const fd = await startFakeDriver({ [flag]: true });
    const out = path.join(tmp, 'r3c-' + flag);
    const r = await runSafari(['--out', out, '--driver-url', fd.url, '--only', 'W01', '--clients', 'ima'], { VASTCONF_EXT_ARCHIVE: ARCHIVE });
    assert.equal(r.code, 0, r.out);
    const sum = JSON.parse(fs.readFileSync(path.join(out, 'safari/summary.json'), 'utf8')).browsers.safari;
    assert.equal(sum.ima.enabled, false, flag); assert.match(sum.ima.reason, re);
    await fd.close();
  }
});
await test('runner: IMA skipped without the archive', async () => {
  const fd = await startFakeDriver();
  const out = path.join(tmp, 'r4');
  const env = { ...process.env }; delete env.VASTCONF_EXT_ARCHIVE;
  const r = await runSafari(['--out', out, '--driver-url', fd.url, '--only', 'W01', '--clients', 'ima'], { VASTCONF_EXT_ARCHIVE: '' });
  assert.equal(r.code, 0, r.out);
  const sum = JSON.parse(fs.readFileSync(path.join(out, 'safari/summary.json'), 'utf8')).browsers.safari;
  assert.match(sum.ima.reason, /VASTCONF_EXT_ARCHIVE not set/);
  await fd.close();
});
await test('runner: a hanging run becomes a harness error cell and the run continues', async () => {
  const fd = await startFakeDriver({ hang: true });
  const out = path.join(tmp, 'r5');
  const r = await runSafari(['--out', out, '--driver-url', fd.url, '--only', '^W0[12]$', '--clients', 'vastclient'], { VASTCONF_CELL_TIMEOUT_MS: '1500' });
  assert.equal(r.code, 0, r.out);
  const rows = readJsonl(path.join(out, 'safari/results.jsonl'));
  assert.equal(rows.length, 2);
  for (const x of rows) assert.match(x.result.error, /cell timeout/);
  assert.equal(fd.stats().maxActive, 1); assert.equal(fd.sessions.size, 0, 'every session deleted');
  await fd.close();
});
await test('runner: --isolation window reuses one session', async () => {
  const fd = await startFakeDriver();
  const out = path.join(tmp, 'r6');
  const r = await runSafari(['--out', out, '--driver-url', fd.url, '--only', '^W0[1-3]$', '--clients', 'vastclient'], {});
  assert.equal(r.code, 0, r.out);
  const perRun = fd.stats().created;
  const out2 = path.join(tmp, 'r6b');
  const r2 = await runSafari(['--out', out2, '--driver-url', fd.url, '--only', '^W0[1-3]$', '--clients', 'vastclient', '--isolation', 'window'], {});
  assert.equal(r2.code, 0, r2.out);
  assert.equal(fd.stats().created - perRun, 2, 'version probe + one shared session');
  assert.equal(readJsonl(path.join(out2, 'safari/results.jsonl')).length, 3);
  // with IMA in the mix the shared session is ended before each IMA session (never two at once)
  const out3 = path.join(tmp, 'r6c');
  const r3 = await runSafari(['--out', out3, '--driver-url', fd.url, '--only', '^W0[1-2]$', '--clients', 'vastclient,ima', '--isolation', 'window'], { VASTCONF_EXT_ARCHIVE: ARCHIVE });
  assert.equal(r3.code, 0, r3.out);
  const rows = readJsonl(path.join(out3, 'safari/results.jsonl'));
  assert.equal(rows.length, 4); for (const x of rows) assert.ok(!/harness:/.test(x.result.error || ''), x.result.error);
  assert.equal(fd.stats().maxActive, 1);
  await fd.close();
});
await test('runner: remote automation disabled -> summary with hint, exit 0', async () => {
  const fd = await startFakeDriver({ disabled: true });
  const out = path.join(tmp, 'r7');
  const r = await runSafari(['--out', out, '--driver-url', fd.url, '--only', 'W01', '--clients', 'vastclient'], {});
  assert.equal(r.code, 0, r.out);
  const sum = JSON.parse(fs.readFileSync(path.join(out, 'safari/summary.json'), 'utf8')).browsers.safari;
  assert.equal(sum.launched, false); assert.match(sum.hint, /safaridriver --enable/);
  assert.ok(!fs.existsSync(path.join(out, 'safari/matrix.tsv')));
  await fd.close();
});
await test('runner: no driver binary -> recorded, exit 0', async () => {
  const out = path.join(tmp, 'r8');
  const r = await runSafari(['--out', out, '--driver', '/nonexistent/safaridriver', '--only', 'W01'], {});
  assert.equal(r.code, 0, r.out);
  const sum = JSON.parse(fs.readFileSync(path.join(out, 'safari/summary.json'), 'utf8')).browsers.safari;
  assert.match(sum.error, /not found/);
});

fs.rmSync(tmp, { recursive: true, force: true });
const failed = results.filter(r => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
// a failed test may leave its fake driver listening; exit explicitly
process.exit(failed ? 1 : 0);
