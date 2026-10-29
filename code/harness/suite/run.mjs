// Runs every requirement against every client configuration and writes the conformance matrix.
// Usage: node suite/run.mjs <outDir>
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { startServer } from '../server.mjs';
import { REQUIREMENTS, CAPS } from './requirements.mjs';
import { observation, grade, scriptFor } from './evaluate.mjs';

const pexec = promisify(execFile);
const here = path.dirname(new URL(import.meta.url).pathname);
const outDir = path.resolve(process.argv[2] || path.join(here, '../../../data/suite'));
const only = process.argv[3] ? new RegExp(process.argv[3]) : null;
const CONFIGS = [
  { label: 'vastclient', client: 'vastclient', opts: {} },
  { label: 'videoadsdk', client: 'videoadsdk', opts: {} },
  { label: 'iabloader', client: 'iabloader', opts: {} },
  { label: 'iabloader+nsap', client: 'iabloader', opts: { noSingleAdPods: true } },
  { label: 'vastlint', client: 'vastlint', opts: {} },
].filter(c => !process.env.VASTCONF_CONFIGS || process.env.VASTCONF_CONFIGS.split(',').includes(c.label));

const srv = await startServer({ root: path.join(here, 'vectors') });
const runs = new Map(); // one client run per (vector, mode, script, opts, config), shared by requirements
let n = 0;
async function observe(req, cfg) {
  const opts = { timeout: 3000, ...cfg.opts, ...(req.opts || {}) };
  const script = scriptFor(req, cfg.client);
  const key = JSON.stringify([req.vector, script, opts, cfg.label]);
  if (!runs.has(key)) {
    const caseId = `c${String(++n).padStart(4, '0')}`;
    const url = `${srv.base}/doc/${caseId}/${req.vector}/start.xml${req.entryQuery || ''}`;
    const args = ['--no-deprecation', path.join(here, '../adapters/run.mjs'), cfg.client, url, JSON.stringify(opts)];
    if (script) args.push(JSON.stringify(script));
    let res;
    const t0 = Date.now();
    try {
      const { stdout } = await pexec('node', args, { timeout: 90000, maxBuffer: 64 << 20 });
      res = JSON.parse(stdout.trim().split('\n').pop());
    } catch (e) { res = { ok: false, error: 'harness: ' + String(e.message).slice(0, 300) }; }
    res.wallMs = Date.now() - t0;
    await new Promise(r => setTimeout(r, 50));
    const log = (srv.log.get(caseId) || []).map(e => ({ ...e, path: e.path.replace(`/${e.kind}/${caseId}/`, '') }));
    runs.set(key, { caseId, url, res, log });
  }
  const { caseId, res, log } = runs.get(key);
  return { caseId, o: observation(res, log, cfg.client, cfg.label), log };
}

const rows = [];
for (const req of REQUIREMENTS) {
  if (only && !only.test(req.id)) continue;
  for (const cfg of CONFIGS) {
    const { caseId, o, log } = await observe(req, cfg);
    const v = grade(req, o, { caps: CAPS, layer: 'node' });
    rows.push({ id: req.id, area: req.area, spec: req.spec, strength: req.strength, duty: req.duty, layer: req.layer || 'all', claim: req.claim, vector: req.vector,
      mode: req.mode, script: req.script || null, config: cfg.label, client: cfg.client, caseId, verdict: v.verdict, detail: v.detail,
      requests: log.map(e => `${e.t} ${e.kind} ${e.path}${e.query || ''}${e.status ? ' [' + e.status + ']' : ''}`),
      result: { ok: o.res.ok, error: o.res.error || null, errorCode: o.res.errorCode ?? null, steps: o.res.steps || null, ms: o.res.ms, wallMs: o.res.wallMs,
        resolved: (o.res.resolved || []).map(a => a.id), resolvedAds: o.res.resolved || [], played: o.res.played || null, mediaSrc: o.res.mediaSrc || null, clickThroughUrl: o.res.clickThroughUrl || null,
        vastErrorCodes: o.res.vastErrorCodes || null, uncaught: o.res.uncaught || [], pixels: o.res.pixels || [], trackerErrors: o.res.trackerErrors || null,
        skip: o.res.skipControlBeforeOffset === undefined ? null : { before: o.res.skipControlBeforeOffset, after: o.res.skipControlAfterOffset, skipDelay: o.res.skipDelay ?? null },
        startedMuted: o.res.startedMuted ?? null, iconRendered: o.res.iconRendered ?? null, notDrivable: o.res.notDrivable || null, notDrivableKinds: o.res.notDrivableKinds || null } });
    process.stdout.write(`${req.id.padEnd(4)} ${cfg.label.padEnd(15)} ${v.verdict.padEnd(10)} ${String(v.detail).slice(0, 90)}\n`);
  }
}
await srv.close();
fs.mkdirSync(outDir, { recursive: true });
const suffix = only ? '.partial' : '';
fs.writeFileSync(path.join(outDir, `results${suffix}.jsonl`), rows.map(r => JSON.stringify(r)).join('\n') + '\n');
const cfgs = CONFIGS.map(c => c.label);
const ids = [...new Set(rows.map(r => r.id))];
const cell = (id, c) => rows.find(r => r.id === id && r.config === c);
const tsv = ['id\tarea\tstrength\tspec\tclaim\t' + cfgs.join('\t')];
for (const id of ids) { const r0 = cell(id, cfgs[0]); tsv.push([id, r0.area, r0.strength, r0.spec, r0.claim, ...cfgs.map(c => cell(id, c).verdict)].join('\t')); }
fs.writeFileSync(path.join(outDir, `matrix${suffix}.tsv`), tsv.join('\n') + '\n');
