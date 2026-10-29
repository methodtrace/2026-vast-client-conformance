// Runs the four clients on one chain directory and prints each client's outcome and the Error pixels (codes) it sent.
// Usage: node evidence/checks/fuzz-repros/pixels.mjs <dir with start.xml>
import path from 'node:path'; import { execFile } from 'node:child_process'; import { promisify } from 'node:util';
import { startServer } from '../../../code/harness/server.mjs';
const pexec = promisify(execFile); const dir = path.resolve(process.argv[2]);
const srv = await startServer({ root: path.dirname(dir) }); const n = path.basename(dir);
for (const c of ['vastclient','videoadsdk','iabloader','vastlint']) {
  const args=['--no-deprecation',new URL('../../../code/harness/adapters/run.mjs', import.meta.url).pathname,c,`${srv.base}/doc/${n}${c}/${n}/start.xml`,JSON.stringify({timeout:2000})]; if (c!=='iabloader') args.push(JSON.stringify({kind:'full'}));
  const { stdout } = await pexec('nice', ['-n','15','node',...args], {timeout:30000});
  const r = JSON.parse(stdout.trim().split('\n').pop());
  console.log(n, c, 'ok', r.ok, 'err', String(r.error).slice(0,50), 'code', r.errorCode ?? '', 'errpx', r.pixels.filter(p=>/err/.test(p)).map(p=>p.split('?')[1]), 'imp', r.pixels.filter(p=>/imp/.test(p)).length, 'vcCodes', JSON.stringify(r.vastErrorCodes||''));
}
await srv.close();
