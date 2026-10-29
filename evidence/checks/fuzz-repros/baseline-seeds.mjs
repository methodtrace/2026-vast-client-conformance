// Runs every fuzz seed UNMUTATED through the four Node clients (same adapter, options and URL layout as fuzz.mjs),
// so the differential analysis can tell a disagreement the mutation caused from one the seed already had.
// One client process at a time. Usage: nice -n 15 node evidence/checks/fuzz-repros/baseline-seeds.mjs > results/fuzz/analysis/baseline-seeds.jsonl
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { startServer } from '../../../code/harness/server.mjs';

const pexec = promisify(execFile);
const P = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..');
const H = path.join(P, 'code/harness');
const CLIENTS = ['vastclient', 'videoadsdk', 'iabloader', 'vastlint'];
const seeds = [];
const VEC = path.join(H, 'suite/vectors');
for (const v of fs.readdirSync(VEC)) {
  const d = path.join(VEC, v); if (!fs.statSync(d).isDirectory() || v.startsWith('_')) continue;
  const files = fs.readdirSync(d).filter(f => f.endsWith('.xml'));
  if (files.includes('start.xml')) seeds.push({ name: `vec:${v}`, files: Object.fromEntries(files.map(f => [f, fs.readFileSync(path.join(d, f), 'utf8')])) });
}
const IAB = path.join(P, 'sources/iab-vast-samples');
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.xml') ? [path.join(d, e.name)] : []));
for (const f of walk(IAB)) seeds.push({ name: `iab:${path.relative(IAB, f)}`, files: { 'start.xml': fs.readFileSync(f, 'utf8') } });
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vastconf-base-'));
const srv = await startServer({ root });
let n = 0;
const ONLY = process.env.SEEDS ? new Set(process.env.SEEDS.split(',')) : null; // optional: SEEDS=vec:a,iab:b runs only those seeds
for (const sd of seeds) {
  if (ONLY && !ONLY.has(sd.name)) continue;
  const id = `b${String(++n).padStart(4, '0')}`;
  const dir = path.join(root, id); fs.mkdirSync(dir);
  for (const [f, x] of Object.entries(sd.files)) fs.writeFileSync(path.join(dir, f), x.replaceAll(`/doc/{{CASE}}/${sd.name.slice(4)}/`, `/doc/{{CASE}}/${id}/`));
  const outcomes = [];
  for (const c of CLIENTS) {
    const args = ['--no-deprecation', path.join(H, 'adapters/run.mjs'), c, `${srv.base}/doc/${id}c${c}/${id}/start.xml`, JSON.stringify({ timeout: 2000, drainMs: 200 })];
    if (c !== 'iabloader') args.push(JSON.stringify({ kind: 'full' }));
    try {
      const { stdout } = await pexec('nice', ['-n', '15', 'node', ...args], { timeout: 30000, maxBuffer: 64 << 20 });
      const r = JSON.parse(stdout.trim().split('\n').pop());
      outcomes.push({ client: c, ok: r.ok, resolved: (r.resolved || []).length, error: String(r.error || '').slice(0, 160), uncaught: r.uncaught });
    } catch (e) { outcomes.push({ client: c, ok: null, resolved: null, error: e.killed ? 'hang' : 'crash', uncaught: null }); }
  }
  process.stdout.write(JSON.stringify({ seed: sd.name, outcomes }) + '\n');
}
await srv.close();
fs.rmSync(root, { recursive: true, force: true });
