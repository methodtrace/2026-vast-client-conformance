// Gate 2 (IAB samples): does each client build and parse the IAB VAST 4.x sample tags through the exact route the paper
// uses (HTTP fetch from the recording server, the client's own top-level load API)?
// Usage: node gate2.mjs <repoRoot> <outDir>
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { startServer } from './server.mjs';
import { materializeSamples, versionOf } from './lib/samples.mjs';

const pexec = promisify(execFile);
const [, , repo = '../..', outDir = '../../data/gate2'] = process.argv;
const here = path.dirname(new URL(import.meta.url).pathname);
const sampleRoot = path.resolve(repo, '.local-data/iab-vast-samples');
const manifest = materializeSamples(path.resolve(repo, 'sources/iab-vast-samples'), sampleRoot);
const targets = manifest.filter(m => /^4\./.test(versionOf(m.path) || ''));
// Each configuration: [label, client id, options]. iab-vast-loader runs twice: library defaults, and with its own
// noSingleAdPods option, which stops a lone <Ad sequence="1"> from being filed as a one-ad pod.
const clients = [['vastclient', 'vastclient', {}], ['videoadsdk', 'videoadsdk', {}], ['iabloader', 'iabloader', {}], ['iabloader+nsap', 'iabloader', { noSingleAdPods: true }]];

const srv = await startServer({ root: sampleRoot, mounts: [{ prefix: 'raw.githubusercontent.com/InteractiveAdvertisingBureau/VAST_Samples/master/', root: sampleRoot }] });
fs.mkdirSync(outDir, { recursive: true });
const rows = [];
let i = 0;
for (const m of targets) {
  i++;
  const caseId = `g2-${String(i).padStart(3, '0')}`;
  for (const [label, c, copts] of clients) {
    const url = `${srv.base}/doc/${caseId}-${label}/${m.path.split('/').map(encodeURIComponent).join('/')}`;
    let r;
    try {
      const { stdout } = await pexec('node', ['--no-deprecation', path.join(here, 'adapters/run.mjs'), c, url, JSON.stringify({ timeout: 3000, ...copts })], { timeout: 30000, maxBuffer: 64 << 20 });
      r = JSON.parse(stdout.trim().split('\n').pop());
    } catch (e) { r = { ok: false, error: 'harness: ' + String(e.message).slice(0, 300) }; }
    r.config = label;
    r.requests = (srv.log.get(`${caseId}-${label}`) || []).map(e => e.path);
    r.sample = m.path; r.sha256 = m.sha256; r.vastVersion = versionOf(m.path);
    rows.push(r);
  }
}
await srv.close();
fs.writeFileSync(path.join(outDir, 'results.jsonl'), rows.map(r => JSON.stringify(r)).join('\n') + '\n');

// Summary: a sample "parses" for a client when the load call yields at least one resolved InLine ad. Wrapper samples
// point into IAB's own repo on raw.githubusercontent.com, which the server maps onto the local copies, so their
// chains resolve fully offline.
const summary = {};
for (const r of rows) {
  const c = r.config;
  const s = (summary[c] ||= { config: c, client: r.client, samples: 0, parsed: 0, failed: [] });
  s.samples++;
  const ok = Boolean(r.resolved && r.resolved.length > 0);
  if (ok) s.parsed++; else s.failed.push({ sample: r.sample, error: r.error || null, errorCode: r.errorCode ?? null });
}
fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify({ samples: targets.length, clients: summary }, null, 1));
for (const s of Object.values(summary)) console.log(`${s.config.padEnd(15)} ${s.parsed}/${s.samples}`);
