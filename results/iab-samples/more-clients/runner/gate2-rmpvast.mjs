// Gate 2 for rmp-vast (browser-only): serve the 49 IAB VAST 4.x samples through the recording server, as gate2.mjs
// does (Wrapper targets on raw.githubusercontent.com mapped onto the local copies), and run
// window.VASTCONF.run('rmpvast', url, { timeout: 3000 }, { kind: 'full' }) for each in Playwright Chromium.
// rmp-vast plays the ad, so a sample "resolves" when an ad started (adstarted).
// The samples' MediaFiles are IAB-hosted video/mp4 URLs; the recording server would answer them with a 1x1 GIF, so
// media requests (*.mp4 under /x/) are answered with the harness's 10-second ad media remuxed into MP4 (VP9/Opus,
// since Playwright Chromium has no H.264 decoder). Every such answer is recorded per sample.
// Usage: node browser/gate2-rmpvast.mjs <repoShim> <outDir> <mediaMp4>
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { startServer } from '../server.mjs';
import { materializeSamples, versionOf } from '../lib/samples.mjs';

const here = path.dirname(new URL(import.meta.url).pathname);
const [, , repo, outDir, mediaMp4] = process.argv;
const sampleRoot = path.resolve(repo, '.local-data/iab-vast-samples');
const manifest = materializeSamples(path.resolve(repo, 'sources/iab-vast-samples'), sampleRoot);
const targets = manifest.filter(m => /^4\./.test(versionOf(m.path) || ''));
const mediaBody = fs.readFileSync(mediaMp4);
const srv = await startServer({ root: sampleRoot, mediaRoot: path.join(here, 'media'), assetRoot: path.join(here, 'dist'),
  mounts: [{ prefix: 'raw.githubusercontent.com/InteractiveAdvertisingBureau/VAST_Samples/master/', root: sampleRoot }] });
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, 'results.jsonl');
fs.writeFileSync(out, '');
const LNA = '--disable-features=LocalNetworkAccessChecks,BlockInsecurePrivateNetworkRequests,PrivateNetworkAccessSendPreflights,PrivateNetworkAccessRespectPreflightResults';
const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required', LNA] });
const bver = browser.version();
const only = process.env.G2_ONLY ? new RegExp(process.env.G2_ONLY) : null;
const rows = [];
let i = 0;
for (const m of targets) {
  i++;
  if (only && !only.test(m.path)) continue;
  const caseId = `g2-${String(i).padStart(3, '0')}-rmpvast`;
  const url = `${srv.base}/doc/${caseId}/${m.path.split('/').map(encodeURIComponent).join('/')}`;
  const ctx = await browser.newContext({ viewport: { width: 800, height: 600 } });
  const page = await ctx.newPage();
  const mediaServed = [], external = [], pageErrors = [], consoleLog = [];
  await page.route(u => !u.href.startsWith(srv.base) && !u.href.startsWith('data:') && !u.href.startsWith('blob:'), r => { external.push(r.request().url()); return r.abort(); });
  await page.route(u => u.href.startsWith(`${srv.base}/x/`) && /\.mp4(\?|$)/i.test(u.pathname + (u.search ? '?' : '')), r => {
    mediaServed.push(r.request().url().replace(srv.base, ''));
    return r.fulfill({ status: 200, headers: { 'content-type': 'video/mp4', 'access-control-allow-origin': '*' }, body: mediaBody });
  });
  page.on('pageerror', e => pageErrors.push(String(e && e.message || e).slice(0, 300)));
  page.on('console', msg => { if (consoleLog.length < 40) consoleLog.push({ type: msg.type(), text: msg.text().slice(0, 300) }); });
  const t0 = Date.now();
  let res;
  try {
    await page.goto(`${srv.base}/harness/page.html`, { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(() => window.VASTCONF && window.VASTCONF.ready, null, { timeout: 30000 });
    res = await Promise.race([
      page.evaluate(([u]) => window.VASTCONF.run('rmpvast', u, { timeout: 3000 }, { kind: 'full' }), [url]),
      new Promise((_, rej) => setTimeout(() => rej(new Error('cell timeout 90 s')), 90000)),
    ]);
  } catch (e) { res = { ok: false, error: 'harness: ' + String(e.message).split('\n')[0] }; }
  await ctx.close().catch(() => {});
  await new Promise(r => setTimeout(r, 100));
  const steps = (res.steps || []).map(s => s.step);
  const row = {
    config: 'rmpvast', client: res.client || null, browser: 'chromium', browserVersion: bver, sample: m.path, sha256: m.sha256, vastVersion: versionOf(m.path),
    started: Array.isArray(res.played) ? res.played.length > 0 : false, ok: !!res.ok, error: res.error || null, errorCode: res.errorCode ?? null,
    errors: res.errors || [], played: res.played || [], mediaSrc: res.mediaSrc || [], steps, adComplete: steps.includes('adcomplete'),
    wallMs: Date.now() - t0, mediaServed, external, pageErrors, uncaught: res.uncaught || [], browserConsole: consoleLog,
    requests: (srv.log.get(caseId) || []).map(e => `${e.kind} ${e.path.replace(`/${e.kind}/${caseId}/`, '')}${e.query || ''}${e.status ? ' [' + e.status + ']' : ''}`),
  };
  rows.push(row);
  fs.appendFileSync(out, JSON.stringify(row) + '\n');
  console.log(`${String(i).padStart(2)} ${row.started ? 'started' : 'NO AD  '} ${row.adComplete ? 'complete' : '        '} ${row.wallMs} ms ${m.path}${row.error ? ' :: ' + row.error : ''}`);
}
await browser.close();
await srv.close();
const failed = rows.filter(r => !r.started).map(r => ({ sample: r.sample, error: r.error, errorCode: r.errorCode, steps: r.steps }));
const summary = { samples: rows.length, browser: `chromium ${bver}`, finished: new Date().toISOString(),
  clients: { rmpvast: { config: 'rmpvast', client: rows[0] && rows[0].client, samples: rows.length, started: rows.length - failed.length,
    completed: rows.filter(r => r.adComplete).length, failed } } };
fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 1));
console.log(`rmpvast ${rows.length - failed.length}/${rows.length} started, ${summary.clients.rmpvast.completed} complete`);
