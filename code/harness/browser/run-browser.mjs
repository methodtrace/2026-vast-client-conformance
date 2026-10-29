// Runs the requirement catalog in real browsers (Playwright): every client runs inside a page, against the browser
// vector variant (real media), with real <video> playback. Same oracles as the Node suite (suite/requirements.mjs).
// Usage: node browser/run-browser.mjs --out <dir> [--browsers chromium,firefox,webkit,chrome] [--only REGEX] [--clients a,b]
//        [--parallel]   run the engines at the same time (one shared recording server; case ids carry an engine prefix)
//        [--with-ima]   also run Google IMA (needs the pinned archive in VASTCONF_EXT_ARCHIVE). IMA is optional: without this
//                       flag (or VASTCONF_WITH_IMA=1, or naming 'ima' in --clients) only the open-source clients run.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { chromium, firefox, webkit } from 'playwright';
import { startServer } from '../server.mjs';
import { REQUIREMENTS, CAPS } from '../suite/requirements.mjs';
import { observation, grade, scriptFor } from '../suite/evaluate.mjs';

const here = path.dirname(new URL(import.meta.url).pathname);
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const outDir = path.resolve(arg('out', path.join(here, '../../../data/browser')));
const browsers = arg('browsers', 'chromium,firefox,webkit').split(',').filter(Boolean);
const only = arg('only') ? new RegExp(arg('only')) : null;
const clientFilter = arg('clients') ? arg('clients').split(',') : null;
const parallel = process.argv.includes('--parallel');
// IMA is optional (its pinned archive is private and may not be supplied): it runs only when asked for, by --with-ima,
// VASTCONF_WITH_IMA=1, or by naming it in --clients
const withIma = process.argv.includes('--with-ima') || process.env.VASTCONF_WITH_IMA === '1' || !!(clientFilter && clientFilter.includes('ima'));
// 'chrome' is the user's installed Google Chrome (Playwright channel), which, unlike Playwright's Chromium, ships H.264.
const ENGINES = { chromium, firefox, webkit, chrome: chromium };
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
// External requests (only the IMA SDK makes them): answered from a pinned archive; with VASTCONF_EXT_RECORD=1, a response
// missing from the archive is fetched once by Node and stored (index.tsv: url, sha256, status, content-type, file).
const EXT_DIR = process.env.VASTCONF_EXT_ARCHIVE ? path.resolve(process.env.VASTCONF_EXT_ARCHIVE) : null;
const EXT_RECORD = process.env.VASTCONF_EXT_RECORD === '1';
const extIndex = new Map();
if (EXT_DIR && fs.existsSync(path.join(EXT_DIR, 'index.tsv')))
  for (const line of fs.readFileSync(path.join(EXT_DIR, 'index.tsv'), 'utf8').split('\n').slice(1).filter(Boolean)) {
    const [url, sha, status, type, file] = line.split('\t'); extIndex.set(url, { sha, status: Number(status), type, file });
  }
const extLog = [];
if (CONFIGS.some(c => c.client === 'ima') && !(EXT_DIR && (EXT_RECORD || extIndex.size))) {
  console.error('IMA was requested but its archive was not found (VASTCONF_EXT_ARCHIVE must point to a folder with index.tsv). Leave out --with-ima to run the open-source clients only.');
  process.exit(2);
}
// Archive key: the URL, except IMA's publisher-config request, whose query carries the test page URL (a random port),
// which is keyed by origin and path. Google telemetry beacons are answered locally with 204 and never sent or stored.
const TELEMETRY = /^https?:\/\/((pagead2\.googlesyndication\.com|securepubads\.g\.doubleclick\.net|googleads\.g\.doubleclick\.net)\/(pagead\/(gen_204|ping|adview|interaction|conversion)|pcs\/view|activeview)|ep\d\.adtrafficquality\.google\/(generate_204|pagead\/sodar|getconfig\/sodar))/;
const extKey = url => (/\/pagead\/ima_ppub_config/.test(url) ? url.split('?')[0] : url);
async function extRoute(route) {
  const url = route.request().url();
  if (TELEMETRY.test(url)) { extLog.push({ url, served: 'telemetry stub (204, not sent)' }); return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' }, body: '' }); }
  const key = extKey(url);
  const hit = extIndex.get(key);
  if (hit) { extLog.push({ url, served: 'archive' }); return route.fulfill({ status: hit.status, headers: { 'content-type': hit.type, 'access-control-allow-origin': '*' }, body: fs.readFileSync(path.join(EXT_DIR, hit.file)) }); }
  if (EXT_DIR && EXT_RECORD) {
    try {
      const r = await fetch(url, { headers: { 'user-agent': route.request().headers()['user-agent'] || 'vastconf' } });
      const body = Buffer.from(await r.arrayBuffer());
      const crypto = await import('node:crypto');
      const sha = crypto.createHash('sha256').update(body).digest('hex');
      const file = 'files/' + sha.slice(0, 16) + '-' + (new URL(url).pathname.split('/').pop() || 'index').replace(/[^\w.-]/g, '_').slice(0, 60);
      fs.mkdirSync(path.join(EXT_DIR, 'files'), { recursive: true });
      fs.writeFileSync(path.join(EXT_DIR, file), body);
      const type = r.headers.get('content-type') || 'application/octet-stream';
      extIndex.set(key, { sha, status: r.status, type, file });
      const idx = path.join(EXT_DIR, 'index.tsv');
      if (!fs.existsSync(idx)) fs.writeFileSync(idx, 'url\tsha256\tstatus\tcontent_type\tfile\n');
      fs.appendFileSync(idx, [key, sha, r.status, type, file].join('\t') + '\n');
      extLog.push({ url, served: 'recorded', status: r.status });
      return route.fulfill({ status: r.status, headers: { 'content-type': type, 'access-control-allow-origin': '*' }, body });
    } catch (e) { extLog.push({ url, served: 'record failed', error: String(e.message) }); return route.abort(); }
  }
  extLog.push({ url, served: 'blocked (not in archive)' });
  return route.abort();
}
// LNA: IMA requests the tag from its bridge frame on imasdk.googleapis.com; Chromium's Local Network Access check
// blocks a public origin from reaching 127.0.0.1, which a real deployment never meets (ad servers are public). The
// flag only lifts that check; same-origin requests of the other clients are unaffected.
const LNA = '--disable-features=LocalNetworkAccessChecks,BlockInsecurePrivateNetworkRequests,PrivateNetworkAccessSendPreflights,PrivateNetworkAccessRespectPreflightResults';
const LAUNCH = {
  chromium: { args: ['--autoplay-policy=no-user-gesture-required', LNA] },
  firefox: { firefoxUserPrefs: { 'media.autoplay.default': 0, 'media.autoplay.blocking_policy': 0 } },
  webkit: {},
  chrome: { channel: 'chrome', args: ['--autoplay-policy=no-user-gesture-required', LNA] },
};

fs.mkdirSync(outDir, { recursive: true });
const srv = await startServer({ root: path.join(here, '../suite/vectors-browser'), mediaRoot: path.join(here, 'media'), assetRoot: path.join(here, 'dist') });
// The IMA SDK runs its ad requests in a frame on imasdk.googleapis.com and uses fetch with browsingTopics, which a
// browser allows only in a secure context; on an http page the frame is insecure and every request fails (IMA 1005).
// IMA cells therefore use a second server on HTTPS at localhost (test-only self-signed certificate in browser/tls/),
// as a production page and ad server would be. Other clients keep
// the HTTP server, so their reference results are unaffected.
const TLS_HOST = 'localhost';
const srvTls = CONFIGS.some(c => c.client === 'ima') ? await startServer({ root: path.join(here, '../suite/vectors-browser'), mediaRoot: path.join(here, 'media'), assetRoot: path.join(here, 'dist'),
  tls: { key: fs.readFileSync(path.join(here, 'tls/key.pem')), cert: fs.readFileSync(path.join(here, 'tls/cert.pem')) }, publicHost: TLS_HOST }) : null;
const progress = fs.createWriteStream(path.join(outDir, 'progress.log'), { flags: 'a' });
const say = s => { process.stdout.write(s + '\n'); progress.write(new Date().toISOString() + ' ' + s + '\n'); };
let n = 0;
const summary = { started: new Date().toISOString(), host: { platform: process.platform, arch: process.arch, release: os.release(), cpus: os.cpus().length }, browsers: {} };

async function runEngine(bname) {
  const engine = ENGINES[bname];
  let browser;
  const startedAt = new Date().toISOString();
  try { browser = await engine.launch({ headless: true, ...LAUNCH[bname] }); }
  catch (e) { say(`BROWSER LAUNCH FAILED ${bname}: ${String(e.message).split('\n')[0]}`); summary.browsers[bname] = { launched: false, error: String(e.message).slice(0, 500) }; return; }
  const bver = browser.version();
  say(`== ${bname} ${bver}`);
  const runs = new Map();
  const rows = [];
  async function observe(req, cfg) {
    const opts = { timeout: 3000, ...cfg.opts, ...(req.opts || {}), ...(process.env.VASTCONF_DUMP_FRAMES ? { dumpFrames: true } : {}) };
    const script = scriptFor(req, cfg.client);
    const key = JSON.stringify([req.vector, script, opts, cfg.label]);
    if (!runs.has(key)) {
      const caseId = `${bname === 'chrome' ? 'gc' : bname.slice(0, 2)}${String(++n).padStart(4, '0')}`;
      const S = cfg.client === 'ima' ? srvTls : srv;
      const url = `${S.base}/doc/${caseId}/${req.vector}/start.xml${req.entryQuery || ''}`;
      const ctx = await browser.newContext({ viewport: { width: 800, height: 600 }, ignoreHTTPSErrors: cfg.client === 'ima' });
      const page = await ctx.newPage();
      await page.route(u => !u.href.startsWith(S.base) && !u.href.startsWith('data:') && !u.href.startsWith('blob:'), extRoute);
      const extBefore = extLog.length;
      // A user's click on a control inside a client's own (possibly cross-origin) frame: the first element matching any
      // selector, in any frame, is clicked with the mouse. Used where a client draws its controls in its own frame (IMA).
      await page.exposeFunction('vastconfFrameClick', async sels => {
        for (const f of page.frames()) for (const sel of sels) {
          try { const el = await f.$(sel); if (el && await el.isVisible()) { await el.click({ timeout: 3000 }); return { clicked: sel, frame: f.url().split('#')[0].slice(0, 120) }; } } catch {}
        }
        return { clicked: null };
      });
      await page.exposeFunction('vastconfFrameDump', async () => {
        const out = [];
        for (const f of page.frames()) { try { out.push({ frame: f.url().split('#')[0].slice(0, 120), els: await f.$$eval('button, a, [role=button], [class*=kip], [class*=lick], [class*=ction]', es => es.slice(0, 40).map(e => `${e.tagName.toLowerCase()}.${String(e.className).slice(0, 60)}|${(e.textContent || '').trim().slice(0, 30)}|${e.getAttribute('aria-label') || ''}`)) }); } catch (e) { out.push({ frame: f.url().slice(0, 80), error: String(e.message).slice(0, 80) }); } }
        return out;
      });
      const consoleLog = [], pageErrors = [], netLog = [];
      page.on('console', m => consoleLog.push({ type: m.type(), text: m.text().slice(0, 500) }));
      page.on('pageerror', e => pageErrors.push(String(e && e.message || e).slice(0, 500)));
      page.on('requestfailed', r => netLog.push({ failed: r.url(), error: r.failure() && r.failure().errorText }));
      // a click-through opened as a new window (IMA opens it from its own frame): record where the window went
      const popups = [];
      page.on('popup', async pp => { const rec = { url: pp.url() }; popups.push(rec); try { await pp.waitForLoadState('domcontentloaded', { timeout: 3000 }); } catch {} rec.url = pp.url(); try { await pp.close(); } catch {} });
      let res;
      const t0 = Date.now();
      try {
        await page.goto(`${S.base}/harness/page.html`, { waitUntil: 'load', timeout: 30000 });
        await page.waitForFunction(() => window.VASTCONF && window.VASTCONF.ready, null, { timeout: 30000 });
        res = await Promise.race([
          page.evaluate(([c, u, o, s]) => window.VASTCONF.run(c, u, o, s), [cfg.client, url, opts, script]),
          new Promise((_, rej) => setTimeout(() => rej(new Error('cell timeout 150 s')), 150000)),
        ]);
      } catch (e) { res = { ok: false, error: 'harness: ' + String(e.message).split('\n')[0] }; }
      res.wallMs = Date.now() - t0;
      res.popups = popups.map(p => p.url);
      if (!res.clickThroughUrl) { const pu = popups.map(p => p.url).find(u => u && u !== 'about:blank'); if (pu) { res.clickThroughUrl = pu; res.clickThroughFrom = 'popup'; } }
      res.external = extLog.slice(extBefore);
      res.browserConsole = consoleLog; res.pageErrors = pageErrors; res.requestFailures = netLog;
      // pageerror events are the authoritative uncaught-error record in a browser
      res.uncaught = [...new Set([...(res.uncaught || []), ...pageErrors])];
      await ctx.close().catch(() => {});
      await new Promise(r => setTimeout(r, 100));
      const log = (S.log.get(caseId) || []).map(e => ({ ...e, path: e.kind === 'media' ? e.path : e.path.replace(`/${e.kind}/${caseId}/`, '') }));
      runs.set(key, { caseId, url, res, log });
      say(`   ran ${caseId} ${cfg.label.padEnd(15)} ${req.vector} ${script ? script.kind : 'load'} ${res.ok ? 'ok' : 'not-ok'} ${res.wallMs} ms${res.error ? ' ' + String(res.error).slice(0, 80) : ''}`);
    }
    const { caseId, res, log } = runs.get(key);
    const o = observation(res, log, cfg.client, cfg.label);
    return { caseId, o, log };
  }
  for (const req of REQUIREMENTS) {
    if (only && !only.test(req.id)) continue;
    for (const cfg of CONFIGS) {
      const { caseId, o, log } = await observe(req, cfg);
      const v = grade(req, o, { caps: CAPS, layer: 'browser' });
      rows.push({ browser: bname, browserVersion: bver, id: req.id, area: req.area, strength: req.strength, duty: req.duty, layer: req.layer || 'all', vector: req.vector,
        config: cfg.label, client: cfg.client, clientVersion: o.res.client && o.res.client.version, caseId, verdict: v.verdict, detail: v.detail,
        requests: log.map(e => `${e.t} ${e.kind} ${e.path}${e.query || ''}${e.range ? ' range=' + e.range : ''}${e.status ? ' [' + e.status + ']' : ''}`),
        result: { ok: o.res.ok, error: o.res.error || null, errorCode: o.res.errorCode ?? null, steps: o.res.steps || null, ms: o.res.ms, wallMs: o.res.wallMs,
          resolved: (o.res.resolved || []).map(a => a.id), resolvedAds: o.res.resolved || [], played: o.res.played || null, mediaSrc: o.res.mediaSrc || null, clickThroughUrl: o.res.clickThroughUrl || null, uncaught: o.res.uncaught || [],
          skip: o.res.skipControlBeforeOffset === undefined ? null : { before: o.res.skipControlBeforeOffset, after: o.res.skipControlAfterOffset, skipDelay: o.res.skipDelay ?? null },
          pixels: o.res.pixels || [], telemetry: o.res.telemetry || null, browserConsole: (o.res.browserConsole || []).slice(0, 50),
          requestFailures: o.res.requestFailures || [], notDrivable: o.res.notDrivable || null, notDrivableKinds: o.res.notDrivableKinds || null, iconRendered: o.res.iconRendered ?? null, external: o.res.external || [], sdkVersion: o.res.sdkVersion || null,
          startedMuted: o.res.startedMuted ?? null } });
    }
  }
  await browser.close();
  const bdir = path.join(outDir, bname);
  fs.mkdirSync(bdir, { recursive: true });
  fs.writeFileSync(path.join(bdir, 'results.jsonl'), rows.map(r => JSON.stringify(r)).join('\n') + '\n');
  const cfgs = CONFIGS.map(c => c.label);
  const ids = [...new Set(rows.map(r => r.id))];
  const cell = (id, c) => rows.find(r => r.id === id && r.config === c);
  const tsv = ['id\tarea\tstrength\t' + cfgs.join('\t')];
  for (const id of ids) { const r0 = cell(id, cfgs[0]); tsv.push([id, r0.area, r0.strength, ...cfgs.map(c => (cell(id, c) || {}).verdict)].join('\t')); }
  fs.writeFileSync(path.join(bdir, 'matrix.tsv'), tsv.join('\n') + '\n');
  summary.browsers[bname] = { launched: true, version: bver, startedAt, finishedAt: new Date().toISOString(), parallel, cells: rows.length, runs: runs.size,
    verdicts: rows.reduce((a, r) => ((a[r.verdict] = (a[r.verdict] || 0) + 1), a), {}) };
  say(`== ${bname} done: ${rows.length} cells, ${runs.size} client runs`);
}
if (parallel) await Promise.all(browsers.map(b => runEngine(b)));
else for (const b of browsers) await runEngine(b);
await srv.close();
if (srvTls) await srvTls.close();
summary.ima = { requested: withIma, included: CONFIGS.some(c => c.client === 'ima') };
summary.finished = new Date().toISOString();
fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 1));
progress.end();
