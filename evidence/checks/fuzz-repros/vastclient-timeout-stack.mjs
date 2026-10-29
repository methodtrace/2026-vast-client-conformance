// @dailymotion/vast-client 6.5.0 (non-minified Node build) driven directly through VASTClient.get on a fuzz example,
// printing the stack of any uncaught exception (R01 check) and the outcome of the get() promise.
// Usage: node evidence/checks/fuzz-repros/vastclient-timeout-stack.mjs <dir with start.xml> [timeoutMs=2000]
import path from 'node:path';
import { createRequire } from 'node:module';
import { startServer } from '../../../code/harness/server.mjs';
const require = createRequire(import.meta.url);
const { VASTClient } = require('../../../code/harness/node_modules/@dailymotion/vast-client/dist/vast-client-node.js');
process.on('uncaughtException', e => console.log('UNCAUGHT EXCEPTION:', e.stack.split('\n').slice(0, 4).join('\n')));
const dir = path.resolve(process.argv[2]);
const srv = await startServer({ root: path.dirname(dir) });
const vc = new VASTClient(0, 0);
try { const r = await vc.get(`${srv.base}/doc/x/${path.basename(dir)}/start.xml`, { timeout: Number(process.argv[3] || 2000) }); console.log('get() resolved, ads:', r.ads.length); }
catch (e) { console.log('get() rejected:', e.message); }
await new Promise(r => setTimeout(r, 7000));
console.log('log:', JSON.stringify([...srv.log.values()].flat().map(x => x.path + x.query)));
await srv.close(); process.exit(0);
