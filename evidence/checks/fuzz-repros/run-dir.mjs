// Serves one directory (start.xml plus referenced documents) with the recording server and runs one client on it
// through the harness adapter (async child process), printing the outcome: ok, resolved count, error, uncaught.
// Usage: node evidence/checks/fuzz-repros/run-dir.mjs <client> <dir> [reps=1]
// The dir's name is used as the case path segment, so documents may reference /doc/{{CASE}}/<dirname>/<file>.
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { startServer } from '../../../code/harness/server.mjs';

const pexec = promisify(execFile);
const P = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..');
const [, , client, dirArg, repsArg] = process.argv;
const dir = path.resolve(dirArg);
const srv = await startServer({ root: path.dirname(dir) });
const name = path.basename(dir);
for (let i = 0; i < Number(repsArg || 1); i++) {
  const url = `${srv.base}/doc/${name}r${i}/${name}/start.xml`;
  const args = ['--no-deprecation', path.join(P, 'code/harness/adapters/run.mjs'), client, url, JSON.stringify({ timeout: 2000, drainMs: 200 })];
  if (client !== 'iabloader') args.push(JSON.stringify({ kind: 'full' }));
  const t0 = Date.now();
  try {
    const { stdout } = await pexec('nice', ['-n', '15', 'node', ...args], { timeout: 30000, maxBuffer: 64 << 20 });
    const r = JSON.parse(stdout.trim().split('\n').pop());
    console.log(JSON.stringify({ ok: r.ok, resolved: (r.resolved || []).length, error: r.error || null, errorCode: r.errorCode ?? null, uncaught: r.uncaught, ms: Date.now() - t0 }));
  } catch (e) { console.log(JSON.stringify({ failed: e.killed ? 'hang' : 'exit ' + e.code, stderr: String(e.stderr || '').slice(-300) })); }
}
await srv.close();
