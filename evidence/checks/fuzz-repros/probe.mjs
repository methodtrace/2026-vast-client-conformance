// Differential probe: runs every sub-directory of <probesDir> (each a start.xml chain) through the four Node clients
// with the harness adapters (one client process at a time) and prints one line per probe: resolved (1/0) per client
// and the error of each client that resolved nothing.
// Usage: nice -n 15 node evidence/checks/fuzz-repros/probe.mjs <probesDir> [clients=vastclient,videoadsdk,iabloader,vastlint]
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { startServer } from '../../../code/harness/server.mjs';

const pexec = promisify(execFile);
const P = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..');
const root = path.resolve(process.argv[2]);
const CLIENTS = (process.argv[3] || 'vastclient,videoadsdk,iabloader,vastlint').split(',');
const srv = await startServer({ root });
for (const name of fs.readdirSync(root).sort()) {
  if (!fs.existsSync(path.join(root, name, 'start.xml'))) continue;
  const row = { probe: name };
  for (const c of CLIENTS) {
    const args = ['--no-deprecation', path.join(P, 'code/harness/adapters/run.mjs'), c, `${srv.base}/doc/${name}${c}/${name}/start.xml`, JSON.stringify({ timeout: 2000, drainMs: 200 })];
    if (c !== 'iabloader') args.push(JSON.stringify({ kind: 'full' }));
    try {
      const { stdout } = await pexec('nice', ['-n', '15', 'node', ...args], { timeout: 30000, maxBuffer: 64 << 20 });
      const r = JSON.parse(stdout.trim().split('\n').pop());
      const n = (r.resolved || []).length;
      row[c] = n ? '1' : '0 ' + JSON.stringify(String(r.error || '').slice(0, 70));
      if (r.uncaught && r.uncaught.length) row[c] += ' [uncaught]';
    } catch (e) { row[c] = e.killed ? 'hang' : 'crash'; }
  }
  console.log(JSON.stringify(row));
}
await srv.close();
