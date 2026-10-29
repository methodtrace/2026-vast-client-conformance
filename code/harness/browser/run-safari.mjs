// Runs the requirement catalog in Safari through safaridriver (plain W3C WebDriver over HTTP, browser/webdriver.mjs),
// the same way browser/run-browser.mjs runs Playwright engines: the same recording server, browser vectors, test page
// (page.html via browser/dist), window.VASTCONF.run entry, oracles (suite/evaluate.mjs) and output layout
// (<out>/safari/results.jsonl, matrix.tsv and summary.json; progress lines appended to <out>/progress.log).
//
// Usage: node browser/run-safari.mjs --out <dir> [--only REGEX] [--clients a,b] [--isolation session|window]
//        [--driver /usr/bin/safaridriver] [--driver-url http://127.0.0.1:4444]   (an already running driver; tests)
//        [--no-ima-probe]   skip IMA without probing (records the reason)
//        [--with-ima]       also run Google IMA (optional: without this flag, VASTCONF_WITH_IMA=1 or 'ima' named in --clients, IMA is left out)
// Needs, once per Mac: `safaridriver --enable` (asks for the account password). macOS only (or a WebDriver endpoint).
//
// Differences from the Playwright runner, each forced by WebDriver or Safari and recorded in the results:
//  - Isolation: Safari allows one WebDriver session at a time. Default: a new session for every client run (each
//    session is a fresh, isolated automation window with its own empty website data, the analogue of a new Playwright
//    context). --isolation window keeps one session and opens a new window per run (faster; shares cookies/cache).
//  - Autoplay: Safari blocks unmuted autoplay without a user gesture, and since Safari 18.2 WebDriver script calls no
//    longer carry user activation. Before each run the runner clicks the page with a WebDriver pointer action (a
//    trusted gesture); the adapters still retry muted when play() is refused and report startedMuted.
//  - Frame clicks (IMA's skip button and click element live in its cross-origin frame): window.vastconfFrameClick is a
//    bridge; the run is started without blocking and polled, and between polls the runner answers bridge requests
//    with WebDriver frame switching and an element click, as Playwright's exposeFunction does.
//  - Console and network: WebDriver exposes no console or network events. Uncaught errors come from the page's own
//    instrumentation (entry.mjs: error, unhandledrejection) as before; console calls are recorded from the moment the
//    runner installs a hook (after load); requestFailures is not available (null).
//  - Popups (click-through windows): new window handles after a run are visited, their URL recorded, then closed.
//  - IMA: needs HTTPS (test certificate, browser/tls/) and its external requests answered from the archive
//    (VASTCONF_EXT_ARCHIVE). Without page.route, the IMA session uses a local forward proxy (browser/webdriver-proxy.mjs)
//    through the W3C proxy capability, with acceptInsecureCerts. Before any IMA cell the runner probes: a session with
//    both capabilities must be created, and a canary page on unresolvable *.vastconf.invalid hosts must load its script,
//    frame and fetch through the proxy. If any of that fails, IMA is skipped in Safari and the reason is recorded in
//    summary.json (IMA is then covered by the Playwright engines only).
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { startServer } from '../server.mjs';
import { REQUIREMENTS, CAPS } from '../suite/requirements.mjs';
import { observation, grade, scriptFor } from '../suite/evaluate.mjs';
import { WebDriver, startSafariDriver } from './webdriver.mjs';
import { startExtProxy, canaryPassed } from './webdriver-proxy.mjs';

const here = path.dirname(new URL(import.meta.url).pathname);
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const outDir = path.resolve(arg('out', path.join(here, '../../../data/browser')));
const only = arg('only') ? new RegExp(arg('only')) : null;
const clientFilter = arg('clients') ? arg('clients').split(',') : null;
const isolation = arg('isolation', 'session');
const driverUrl = arg('driver-url');
const driverBin = arg('driver', '/usr/bin/safaridriver');
const noImaProbe = process.argv.includes('--no-ima-probe');
// IMA is optional: it runs only when asked for (same rule as run-browser.mjs)
const withIma = process.argv.includes('--with-ima') || process.env.VASTCONF_WITH_IMA === '1' || !!(clientFilter && clientFilter.includes('ima'));
const ENGINE = 'safari';
const CELL_TIMEOUT_MS = Number(process.env.VASTCONF_CELL_TIMEOUT_MS || 150000);
const POLL_MS = 250;
// A copy of run-browser.mjs CONFIGS (that file starts servers at import, so it cannot be imported). Keep the block
// between 'const CONFIGS = [' and '].filter' textually identical: webdriver-test.mjs (package stage 08a) fails otherwise.
const CONFIGS = [
  { label: 'vastclient', client: 'vastclient', opts: {} },
  { label: 'videoadsdk', client: 'videoadsdk', opts: {} },
  { label: 'iabloader', client: 'iabloader', opts: {} },
  { label: 'iabloader+nsap', client: 'iabloader', opts: { noSingleAdPods: true } },
  { label: 'shaka', client: 'shaka', opts: {} },
  { label: 'rmpvast', client: 'rmpvast', opts: {} },
  // rmp-vast with its OMID support on (omidSupport: true; rmp-vast's default is false), so the verification
  // requirements are also graded for the configuration in which rmp-vast handles AdVerifications at all
  { label: 'rmpvast+omid', client: 'rmpvast', opts: { omidSupport: true } },
  { label: 'ima', client: 'ima', opts: {} },
].filter(c => !clientFilter || clientFilter.includes(c.label))
  .filter(c => c.client !== 'ima' || withIma);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const EXT_DIR = process.env.VASTCONF_EXT_ARCHIVE ? path.resolve(process.env.VASTCONF_EXT_ARCHIVE) : null;

fs.mkdirSync(outDir, { recursive: true });
const progress = fs.createWriteStream(path.join(outDir, 'progress.log'), { flags: 'a' });
const say = s => { process.stdout.write(s + '\n'); progress.write(new Date().toISOString() + ' ' + s + '\n'); };
const startedAt = new Date().toISOString();
const engineSummary = { launched: false, startedAt, isolation, driver: driverUrl || driverBin };

// Safari runs as its own process, possibly at the same time as run-browser.mjs (which rewrites <out>/summary.json
// when it finishes), so its engine summary goes to <out>/safari/summary.json, in the same shape.
const bdir = path.join(outDir, ENGINE);
fs.mkdirSync(bdir, { recursive: true });
function writeSummary() {
  const s = { started: startedAt, finished: new Date().toISOString(), host: { platform: process.platform, arch: process.arch, release: os.release(), cpus: os.cpus().length }, browsers: { [ENGINE]: engineSummary } };
  fs.writeFileSync(path.join(bdir, 'summary.json'), JSON.stringify(s, null, 1));
}

// ---- the driver
let driver = null, wd;
try {
  if (driverUrl) wd = new WebDriver(driverUrl);
  else { driver = await startSafariDriver({ bin: driverBin }); wd = new WebDriver(driver.url); }
} catch (e) {
  say(`SAFARI DRIVER FAILED: ${e.message}`);
  engineSummary.error = e.message;
  if (process.platform === 'darwin') engineSummary.hint = 'run once: safaridriver --enable (asks for your password), then rerun';
  writeSummary(); progress.end();
  process.exit(0);
}

// ---- servers (as run-browser.mjs)
const srv = await startServer({ root: path.join(here, '../suite/vectors-browser'), mediaRoot: path.join(here, 'media'), assetRoot: path.join(here, 'dist') });
const wantIma = CONFIGS.some(c => c.client === 'ima');
const tlsCred = { key: fs.readFileSync(path.join(here, 'tls/key.pem')), cert: fs.readFileSync(path.join(here, 'tls/cert.pem')) };
const srvTls = wantIma ? await startServer({ root: path.join(here, '../suite/vectors-browser'), mediaRoot: path.join(here, 'media'), assetRoot: path.join(here, 'dist'), tls: tlsCred, publicHost: 'localhost' }) : null;
const proxy = wantIma && EXT_DIR ? await startExtProxy({ archiveDir: EXT_DIR, tls: tlsCred }) : null;

const BASE_CAPS = { browserName: 'safari', pageLoadStrategy: 'normal' };
const IMA_CAPS = proxy ? { ...BASE_CAPS, acceptInsecureCerts: true, proxy: { proxyType: 'manual', httpProxy: proxy.url, sslProxy: proxy.url } } : null;
const TIMEOUTS = { script: CELL_TIMEOUT_MS + 10000, pageLoad: 30000, implicit: 0 };

async function openSession(caps) {
  const s = await wd.newSessionRetry({ alwaysMatch: caps }, { onRetry: (e, i) => say(`   session retry ${i}: ${e.message.slice(0, 120)}`) });
  await s.setTimeouts(TIMEOUTS);
  try { await s.setWindowRect({ width: 1024, height: 768 }); } catch {}
  return s;
}
const closeSession = async s => { if (s) { try { await s.delete(); } catch {} await sleep(300); } };

// ---- IMA probe: the session must accept both capabilities and really route through the proxy
const ima = { enabled: false, reason: wantIma ? null : (withIma ? 'no IMA configuration selected' : 'not requested') };
if (wantIma) {
  if (!EXT_DIR) ima.reason = 'VASTCONF_EXT_ARCHIVE not set: IMA would load the live SDK; skipped';
  else if (noImaProbe) ima.reason = 'skipped by --no-ima-probe';
  else {
    let s = null;
    try {
      s = await openSession(IMA_CAPS);
      const got = s.capabilities || {};
      ima.capabilities = { acceptInsecureCerts: got.acceptInsecureCerts ?? null, proxy: got.proxy ?? null, browserVersion: got.browserVersion ?? null };
      await s.navigate('https://page.vastconf.invalid/canary.html');
      let c = null;
      const end = Date.now() + 8000;
      while (Date.now() < end) { c = await s.execute('return window.__canary || null'); if (canaryPassed(c)) break; await sleep(250); }
      ima.canary = c;
      // and the HTTPS recording server through the same session (CONNECT to localhost is tunnelled unchanged)
      await s.navigate(`${srvTls.base}/harness/page.html`);
      const ready = await waitReady(s, 15000);
      ima.tlsPageReady = ready;
      if (canaryPassed(c) && ready) ima.enabled = true;
      else ima.reason = `proxy canary failed (${['script', 'frame', 'fetch', 'frameFetch', 'frameSecure', 'archive'].map(k => `${k} ${c ? c[k] : null}`).join(', ')}; https page ready ${ready}): Safari did not route through the proxy, refused the certificate, or the frame was not a secure context`;
    } catch (e) {
      ima.reason = `IMA session refused: ${e.message.slice(0, 300)}`;
    }
    await closeSession(s);
  }
  say(ima.enabled ? '   IMA in Safari: enabled (proxy and certificate probe passed)' : `   IMA in Safari: SKIPPED: ${ima.reason}`);
}
engineSummary.ima = ima;

// ---- page helpers
async function waitReady(s, ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) { try { if (await s.execute('return !!(window.VASTCONF && window.VASTCONF.ready)')) return true; } catch {} await sleep(200); }
  return false;
}
// Installed after load: the frame-click bridge (adapters call globalThis.vastconfFrameClick / vastconfFrameDump), a console
// hook, and the non-blocking run starter. The runner answers bridge requests between polls.
const INSTALL = `
  if (!window.__vastconfwd) {
    const B = window.__vastconfwd = { seq: 0, pending: [], waiters: {}, console: [], result: null, done: false };
    const ask = (kind, arg) => new Promise(res => { const id = ++B.seq; B.waiters[id] = res; B.pending.push({ id, kind, arg }); });
    window.vastconfFrameClick = sels => ask('click', sels);
    window.vastconfFrameDump = () => ask('dump', null);
    B.answer = (id, v) => { const w = B.waiters[id]; delete B.waiters[id]; if (w) w(v); };
    for (const k of ['log', 'info', 'warn', 'error', 'debug']) { const o = console[k]; console[k] = function (...a) { try { B.console.push({ type: k === 'warn' ? 'warning' : k, text: a.map(x => { try { return typeof x === 'string' ? x : JSON.stringify(x); } catch { return String(x); } }).join(' ').slice(0, 500) }); } catch {} return o.apply(this, a); }; }
  }
  return true;`;
const START = `
  const B = window.__vastconfwd; B.done = false; B.result = null;
  window.VASTCONF.run(arguments[0], arguments[1], arguments[2], arguments[3])
    .then(r => { B.result = r; B.done = true; }, e => { B.result = { ok: false, error: 'run rejected: ' + String(e && e.message || e) }; B.done = true; });
  return true;`;
const POLL = `const B = window.__vastconfwd; const p = B.pending.splice(0); return { done: B.done, pending: p };`;
const COLLECT = `const B = window.__vastconfwd; return { result: B.result, console: B.console.slice(0, 200) };`;

// Searches the current context and its frames (depth-first, up to 3 levels) for the first displayed element matching
// any selector, and clicks it. Leaves the session in the top-level context.
async function frameClick(s, sels, depth = 0) {
  for (const sel of sels) {
    let els = [];
    try { els = await s.findElements(sel); } catch {}
    for (const el of els) {
      try {
        if (!(await s.isDisplayed(el))) continue;
        let how = 'element click';
        try { await s.click(el); }
        catch { how = 'pointer action'; await s.performActions([{ type: 'pointer', id: 'mouse', parameters: { pointerType: 'mouse' }, actions: [
          { type: 'pointerMove', duration: 0, origin: { 'element-6066-11e4-a52e-4f735466cecf': el }, x: 0, y: 0 }, { type: 'pointerDown', button: 0 }, { type: 'pointerUp', button: 0 }] }]); }
        let frame = null; try { frame = String(await s.execute('return location.href')).split('#')[0].slice(0, 120); } catch {}
        return { clicked: sel, frame, how };
      } catch {}
    }
  }
  if (depth >= 3) return { clicked: null };
  let frames = [];
  try { frames = await s.findElements('iframe, frame'); } catch {}
  for (const f of frames) {
    try { await s.switchToFrame(f); } catch { continue; }
    const r = await frameClick(s, sels, depth + 1);
    try { await s.switchToParentFrame(); } catch {}
    if (r.clicked) return r;
  }
  return { clicked: null };
}
async function frameDump(s, depth = 0, out = []) {
  try {
    out.push({ frame: String(await s.execute('return location.href')).split('#')[0].slice(0, 120),
      els: await s.execute(`return Array.from(document.querySelectorAll('button, a, [role=button], [class*=kip], [class*=lick], [class*=ction]')).slice(0, 40).map(e => e.tagName.toLowerCase() + '.' + String(e.className).slice(0, 60) + '|' + (e.textContent || '').trim().slice(0, 30) + '|' + (e.getAttribute('aria-label') || ''))`) });
  } catch (e) { out.push({ error: String(e.message).slice(0, 80) }); }
  if (depth >= 3) return out;
  let frames = []; try { frames = await s.findElements('iframe, frame'); } catch {}
  for (const f of frames) { try { await s.switchToFrame(f); } catch { continue; } await frameDump(s, depth + 1, out); try { await s.switchToParentFrame(); } catch {} }
  return out;
}

// One client run in Safari. Returns the adapter result decorated like run-browser.mjs does.
let shared = null; // --isolation window: one session for every non-IMA run
async function runCell(cfg, url, opts, script, S) {
  const isIma = cfg.client === 'ima';
  const caps = isIma ? IMA_CAPS : BASE_CAPS;
  const extBefore = proxy ? proxy.log.length : 0;
  const popups = [], notes = [];
  let s = null, own = true, mainHandle = null, res;
  const t0 = Date.now();
  try {
    if (isolation === 'window' && !isIma) {
      if (!shared) shared = await openSession(caps);
      s = shared; own = false;
      const w = await s.newWindow('tab'); const old = await s.windowHandle();
      await s.switchToWindow(w.handle); try { await s.switchToWindow(old); await s.closeWindow(); } catch {} await s.switchToWindow(w.handle);
    } else {
      // Safari allows one session at a time: an IMA run (own session, other capabilities) first ends the shared one
      if (shared) { await closeSession(shared); shared = null; }
      s = await openSession(caps);
    }
    mainHandle = await s.windowHandle();
    await s.navigate(`${S.base}/harness/page.html`);
    if (!(await waitReady(s, 30000))) throw new Error('page not ready (window.VASTCONF.ready) within 30 s');
    await s.execute(INSTALL);
    // a trusted user gesture on the page before the ad starts (Safari's autoplay policy); top-left corner, empty area
    try { await s.clickAt(5, 5); notes.push('gesture: pointer click at 5,5'); } catch (e) { notes.push('gesture failed: ' + e.message.slice(0, 100)); }
    await s.execute(START, [cfg.client, url, opts, script]);
    const end = Date.now() + CELL_TIMEOUT_MS;
    let done = false;
    while (Date.now() < end) {
      const p = await s.execute(POLL);
      for (const q of p.pending || []) {
        let ans;
        try { ans = q.kind === 'click' ? await frameClick(s, q.arg || []) : await frameDump(s); }
        catch (e) { ans = q.kind === 'click' ? { clicked: null, error: String(e.message).slice(0, 120) } : []; }
        try { await s.switchToFrame(null); } catch {}
        await s.execute('window.__vastconfwd.answer(arguments[0], arguments[1]); return true;', [q.id, ans]);
      }
      if (p.done) { done = true; break; }
      await sleep(POLL_MS);
    }
    if (!done) throw new Error(`cell timeout ${Math.round(CELL_TIMEOUT_MS / 1000)} s`);
    const c = await s.execute(COLLECT);
    res = c.result || { ok: false, error: 'harness: no result' };
    res.browserConsole = c.console || [];
  } catch (e) { res = { ok: false, error: 'harness: ' + String(e.message).split('\n')[0] }; }
  // popups: any window other than the test page
  if (s) {
    try {
      for (const h of await s.windowHandles()) {
        if (h === mainHandle) continue;
        const rec = { url: null };
        try { await s.switchToWindow(h); await sleep(300); rec.url = await s.currentUrl(); await s.closeWindow(); } catch (e) { rec.error = String(e.message).slice(0, 100); }
        popups.push(rec);
      }
      if (mainHandle) try { await s.switchToWindow(mainHandle); } catch {}
    } catch {}
  }
  if (own) await closeSession(s);
  res.wallMs = Date.now() - t0;
  res.popups = popups.map(p => p.url);
  if (!res.clickThroughUrl) { const pu = popups.map(p => p.url).find(u => u && u !== 'about:blank'); if (pu) { res.clickThroughUrl = pu; res.clickThroughFrom = 'popup'; } }
  res.external = proxy ? proxy.log.slice(extBefore) : [];
  res.browserConsole = res.browserConsole || [];
  res.pageErrors = [];          // no pageerror event under WebDriver; uncaught errors come from the page instrumentation
  res.requestFailures = null;   // not observable under WebDriver
  res.webdriver = { isolation: isIma ? 'session' : isolation, notes };
  res.uncaught = [...new Set(res.uncaught || [])];
  return res;
}

// ---- the catalog (structure as run-browser.mjs runEngine)
let n = 0;
const runs = new Map();
const rows = [];
let bver = null;
try {
  const s = await openSession(BASE_CAPS);
  bver = s.capabilities.browserVersion || null;
  engineSummary.capabilities = { browserName: s.capabilities.browserName, browserVersion: bver, platformName: s.capabilities.platformName, 'safari:platformVersion': s.capabilities['safari:platformVersion'] ?? null };
  await closeSession(s);
  engineSummary.launched = true;
} catch (e) {
  say(`SAFARI SESSION FAILED: ${e.message}`);
  engineSummary.error = e.message;
  if (/Allow Remote Automation|remote automation/i.test(e.message)) engineSummary.hint = 'run once: safaridriver --enable (asks for your password), then rerun';
}
if (engineSummary.launched) {
  say(`== safari ${bver} (isolation: ${isolation})`);
  const active = CONFIGS.filter(c => c.client !== 'ima' || ima.enabled);
  async function observe(req, cfg) {
    const opts = { timeout: 3000, ...cfg.opts, ...(req.opts || {}), ...(process.env.VASTCONF_DUMP_FRAMES ? { dumpFrames: true } : {}) };
    const script = scriptFor(req, cfg.client);
    const key = JSON.stringify([req.vector, script, opts, cfg.label]);
    if (!runs.has(key)) {
      const caseId = `sa${String(++n).padStart(4, '0')}`;
      const S = cfg.client === 'ima' ? srvTls : srv;
      const url = `${S.base}/doc/${caseId}/${req.vector}/start.xml${req.entryQuery || ''}`;
      const res = await runCell(cfg, url, opts, script, S);
      await sleep(100);
      const log = (S.log.get(caseId) || []).map(e => ({ ...e, path: e.kind === 'media' ? e.path : e.path.replace(`/${e.kind}/${caseId}/`, '') }));
      runs.set(key, { caseId, url, res, log });
      say(`   ran ${caseId} ${cfg.label.padEnd(15)} ${req.vector} ${script ? script.kind : 'load'} ${res.ok ? 'ok' : 'not-ok'} ${res.wallMs} ms${res.error ? ' ' + String(res.error).slice(0, 80) : ''}`);
    }
    const { caseId, res, log } = runs.get(key);
    return { caseId, o: observation(res, log, cfg.client, cfg.label), log };
  }
  for (const req of REQUIREMENTS) {
    if (only && !only.test(req.id)) continue;
    for (const cfg of active) {
      const { caseId, o, log } = await observe(req, cfg);
      const v = grade(req, o, { caps: CAPS, layer: 'browser' });
      rows.push({ browser: ENGINE, browserVersion: bver, id: req.id, area: req.area, strength: req.strength, duty: req.duty, layer: req.layer || 'all', vector: req.vector,
        config: cfg.label, client: cfg.client, clientVersion: o.res.client && o.res.client.version, caseId, verdict: v.verdict, detail: v.detail,
        requests: log.map(e => `${e.t} ${e.kind} ${e.path}${e.query || ''}${e.range ? ' range=' + e.range : ''}${e.status ? ' [' + e.status + ']' : ''}`),
        result: { ok: o.res.ok, error: o.res.error || null, errorCode: o.res.errorCode ?? null, steps: o.res.steps || null, ms: o.res.ms, wallMs: o.res.wallMs,
          resolved: (o.res.resolved || []).map(a => a.id), resolvedAds: o.res.resolved || [], played: o.res.played || null, mediaSrc: o.res.mediaSrc || null, clickThroughUrl: o.res.clickThroughUrl || null, uncaught: o.res.uncaught || [],
          skip: o.res.skipControlBeforeOffset === undefined ? null : { before: o.res.skipControlBeforeOffset, after: o.res.skipControlAfterOffset, skipDelay: o.res.skipDelay ?? null },
          pixels: o.res.pixels || [], telemetry: o.res.telemetry || null, browserConsole: (o.res.browserConsole || []).slice(0, 50),
          requestFailures: o.res.requestFailures ?? null, notDrivable: o.res.notDrivable || null, notDrivableKinds: o.res.notDrivableKinds || null, iconRendered: o.res.iconRendered ?? null, external: o.res.external || [], sdkVersion: o.res.sdkVersion || null,
          startedMuted: o.res.startedMuted ?? null, popups: o.res.popups || [], webdriver: o.res.webdriver || null } });
    }
  }
  if (shared) await closeSession(shared);
  fs.writeFileSync(path.join(bdir, 'results.jsonl'), rows.map(r => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : ''));
  const cfgs = active.map(c => c.label);
  const ids = [...new Set(rows.map(r => r.id))];
  const cell = (id, c) => rows.find(r => r.id === id && r.config === c);
  const tsv = ['id\tarea\tstrength\t' + cfgs.join('\t')];
  for (const id of ids) { const r0 = cell(id, cfgs[0]); tsv.push([id, r0.area, r0.strength, ...cfgs.map(c => (cell(id, c) || {}).verdict)].join('\t')); }
  fs.writeFileSync(path.join(bdir, 'matrix.tsv'), tsv.join('\n') + '\n');
  Object.assign(engineSummary, { version: bver, finishedAt: new Date().toISOString(), parallel: false, cells: rows.length, runs: runs.size,
    configs: cfgs, verdicts: rows.reduce((a, r) => ((a[r.verdict] = (a[r.verdict] || 0) + 1), a), {}),
    startedMuted: [...runs.values()].filter(r => r.res.startedMuted).length });
  say(`== safari done: ${rows.length} cells, ${runs.size} client runs${ima.enabled ? '' : ' (IMA skipped)'}`);
}
await srv.close();
if (srvTls) await srvTls.close();
if (proxy) await proxy.close();
if (driver) await driver.stop();
writeSummary();
progress.end();
