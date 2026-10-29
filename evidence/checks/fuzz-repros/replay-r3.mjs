// Campaign 3 (results/fuzz/fuzz-r3): replays the first example of every class through the harness adapter, N times,
// with the same classification as code/harness/fuzz/fuzz.mjs, and records the 1-minute load average before each run.
// The examples are stored as served, so examples/ is the server root. Async child process (a sync call would block
// the recording server and turn every request into a timeout). One client process at a time.
// Usage: nice -n 5 node evidence/checks/fuzz-repros/replay-r3.mjs [reps=3] [wallMs=30000] > results/fuzz/analysis/replay-r3.jsonl
//   ONLY=<client> and CASES=f00361,... restrict the run.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { startServer } from '../../../code/harness/server.mjs';

const pexec = promisify(execFile);
const P = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..');
const REPS = Number(process.argv[2] || 3), WALL = Number(process.argv[3] || 30000), TIMEOUT = 2000;
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
    if ((res.ms || 0) > TIMEOUT * 3 + 5000) out.push(`${client}|slow|run took more than ${(TIMEOUT * 3 + 5000) / 1000} s`);
  }
  return out;
}
async function runOne(client, url, env) {
  const args = ['--no-deprecation', path.join(P, 'code/harness/adapters/run.mjs'), client, url, JSON.stringify({ timeout: TIMEOUT, drainMs: 200 })];
  if (client !== 'iabloader') args.push(JSON.stringify({ kind: 'full' }));
  const t0 = Date.now();
  try {
    const { stdout } = await pexec('nice', ['-n', '5', 'node', ...args], { timeout: WALL, maxBuffer: 64 << 20, env: { ...process.env, ...env } });
    const line = stdout.trim().split('\n').pop();
    try { return { res: JSON.parse(line), wall: Date.now() - t0 }; } catch { return { crash: 'no result: ' + line.slice(0, 120), wall: Date.now() - t0 }; }
  } catch (e) { return e.killed ? { hang: true, wall: Date.now() - t0 } : { crash: `exit ${e.code ?? ''}: ` + String(e.stderr || e.message).split('\n').filter(Boolean).slice(-1)[0], wall: Date.now() - t0 }; }
}
const R3 = path.join(P, 'results/fuzz/fuzz-r3');
const classes = JSON.parse(fs.readFileSync(path.join(R3, 'classes.json'), 'utf8'));
const only = process.env.ONLY, cases = process.env.CASES ? process.env.CASES.split(',') : null;
const env = process.env.VASTCONF_MODULE ? { VASTCONF_MODULE: process.env.VASTCONF_MODULE } : {};
const srv = await startServer({ root: path.join(R3, 'examples') });
for (const c of classes) {
  if ((only && c.client !== only) || (cases && !cases.includes(c.firstCase))) continue;
  const runs = [];
  for (let i = 0; i < REPS; i++) {
    const load1 = os.loadavg()[0];
    const caseId = `${c.firstCase}rep${i}`;
    const r = await runOne(c.client, `${srv.base}/doc/${caseId}/${c.firstCase}/start.xml`, env);
    const ks = keys(c.client, r);
    const reqs = (srv.log.get(caseId) || []).filter(x => x.kind === 'doc').map(x => ({ t: x.t, path: x.path.split('/').slice(3).join('/') + x.query }));
    runs.push({ reproduced: ks.includes(c.key), keys: ks, ok: r.res ? r.res.ok : null, error: r.res ? String(r.res.error || '').slice(0, 200) : r.crash || (r.hang ? 'hang' : null),
      uncaught: r.res ? r.res.uncaught : null, wall: r.wall, ms: r.res ? r.res.ms : null, load1: Math.round(load1 * 100) / 100, docRequests: reqs.length });
  }
  process.stdout.write(JSON.stringify({ campaign: 'r3', key: c.key, firstCase: c.firstCase, module: env.VASTCONF_MODULE || null, wall: WALL, reproduced: runs.filter(x => x.reproduced).length, of: REPS, runs }) + '\n');
}
await srv.close();
