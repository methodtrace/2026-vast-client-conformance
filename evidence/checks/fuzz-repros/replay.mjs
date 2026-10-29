// Replays the first example of every fuzz failure class (both campaigns) through the harness adapter, N times,
// and reports whether the class key reproduces. Same classification as code/harness/fuzz/fuzz.mjs.
// Usage: nice -n 15 node evidence/checks/fuzz-repros/replay.mjs [reps=3] > results/fuzz/analysis/replay.jsonl
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { startServer } from '../../../code/harness/server.mjs';

const pexec = promisify(execFile);
const P = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..');
const REPS = Number(process.argv[2] || 3), TIMEOUT = 2000, WALL = 30000;
const norm = s => String(s).replace(/https?:\/\/[^\s'")]+/g, '<url>').replace(/\b\d+(\.\d+)?\b/g, 'N').replace(/\s+/g, ' ').slice(0, 160);
function keys(client, r) {
  const out = [];
  if (r.hang) out.push(`${client}|hang|no result within 30 s`);
  if (r.crash) out.push(`${client}|crash|${norm(r.crash)}`);
  const res = r.res;
  if (res) {
    for (const u of res.uncaught || []) out.push(`${client}|${u.startsWith('unhandled rejection') ? 'unhandled' : 'uncaught'}|${norm(u)}`);
    if (String(res.error || '').startsWith('adapter crash')) out.push(`${client}|adapter|${norm(res.error.split('\n')[0])}`);
    else if (/Cannot read propert|is not a function|is not iterable|undefined is not|null is not|Maximum call stack|Invalid array length|is not defined/.test(String(res.error || ''))) out.push(`${client}|internal|${norm(res.error)}`);
  }
  return out;
}
async function runOne(client, url) {
  const args = ['--no-deprecation', path.join(P, 'code/harness/adapters/run.mjs'), client, url, JSON.stringify({ timeout: TIMEOUT, drainMs: 200 })];
  if (client !== 'iabloader') args.push(JSON.stringify({ kind: 'full' }));
  const t0 = Date.now();
  try {
    const { stdout } = await pexec('nice', ['-n', '15', 'node', ...args], { timeout: WALL, maxBuffer: 64 << 20 });
    const line = stdout.trim().split('\n').pop();
    try { return { res: JSON.parse(line), wall: Date.now() - t0 }; } catch { return { crash: 'no result: ' + line.slice(0, 120), wall: Date.now() - t0 }; }
  } catch (e) { return e.killed ? { hang: true, wall: Date.now() - t0 } : { crash: `exit ${e.code ?? ''}: ` + String(e.stderr || e.message).split('\n').filter(Boolean).slice(-1)[0], wall: Date.now() - t0 }; }
}
const only = process.env.ONLY; // optional client filter
for (const camp of ['r1', 'r2']) {
  const classes = JSON.parse(fs.readFileSync(path.join(P, `results/fuzz/fuzz-${camp}/classes.json`), 'utf8'));
  const root = path.join(P, 'results/fuzz/analysis/replay-examples', camp);
  const srv = await startServer({ root });
  for (const c of classes) {
    if (only && c.client !== only) continue;
    const runs = [];
    for (let i = 0; i < REPS; i++) {
      const r = await runOne(c.client, `${srv.base}/doc/${c.firstCase}rep${i}/${c.firstCase}/start.xml`);
      const ks = keys(c.client, r);
      runs.push({ reproduced: ks.includes(c.key), keys: ks, ok: r.res ? r.res.ok : null, error: r.res ? String(r.res.error || '').slice(0, 200) : r.crash || (r.hang ? 'hang' : null), uncaught: r.res ? r.res.uncaught : null, wall: r.wall });
    }
    process.stdout.write(JSON.stringify({ campaign: camp, key: c.key, firstCase: c.firstCase, reproduced: runs.filter(x => x.reproduced).length, of: REPS, runs }) + '\n');
  }
  await srv.close();
}
