// @dailymotion/vast-client 6.5.0 driven directly through VASTClient.get (no adapter, no jsdom) on a directory served by
// the recording server. Prints a timeline of every fetch (VAST-resolving / VAST-resolved events with wrapper depth,
// duration, status and error), the outcome of get(), its total time, the request log, and the stack of any uncaught
// exception. With MODULE=<path to a vast-client-node.js build> it loads that build instead (e.g. the patched copy).
// Usage: node evidence/checks/fuzz-repros/vastclient-hang-timeline.mjs <dir with start.xml> [timeoutMs=2000] [wrapperLimit]
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import { startServer } from '../../../code/harness/server.mjs';
const require = createRequire(import.meta.url);
const MOD = process.env.MODULE || path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../code/harness/node_modules/@dailymotion/vast-client/dist/vast-client-node.js');
const { VASTClient } = require(MOD);
const uncaught = [];
process.on('uncaughtException', e => { uncaught.push(e.message); console.log(`UNCAUGHT at ${Date.now() - t0} ms:`, e.stack.split('\n').slice(0, 3).join(' | ')); });
const [, , dirArg, tmo = '2000', limit] = process.argv;
const dir = path.resolve(dirArg);
const srv = await startServer({ root: path.dirname(dir) });
const vc = new VASTClient(0, 0);
const p = vc.getParser();
let t0 = Date.now();
p.on('VAST-resolving', e => console.log(`${String(Date.now() - t0).padStart(6)} ms  resolving depth=${e.wrapperDepth} ${e.url.replace(srv.base, '')}`));
p.on('VAST-resolved', e => console.log(`${String(Date.now() - t0).padStart(6)} ms  resolved  depth=${e.wrapperDepth} duration=${e.duration} ms status=${e.statusCode} error=${e.error ? e.error.message : null}`));
p.on('VAST-error', e => console.log(`${String(Date.now() - t0).padStart(6)} ms  VAST-error code=${e.ERRORCODE}`));
const opts = { timeout: Number(tmo) }; if (limit) opts.wrapperLimit = Number(limit);
console.log(`module=${path.relative(process.cwd(), MOD)} timeout=${opts.timeout} wrapperLimit=${opts.wrapperLimit ?? 'default (10)'} load1=${os.loadavg()[0].toFixed(2)}`);
t0 = Date.now();
let outcome;
try { const r = await vc.get(`${srv.base}/doc/x/${path.basename(dir)}/start.xml`, opts); outcome = `resolved, ads=${r.ads.length}`; }
catch (e) { outcome = `rejected: ${e.message}`; }
const total = Date.now() - t0;
console.log(`get() ${outcome} after ${total} ms`);
const docs = [...srv.log.values()].flat().filter(x => x.kind === 'doc');
console.log(`doc requests: ${docs.length}; error pixels: ${JSON.stringify([...srv.log.values()].flat().filter(x => /err/.test(x.path)).map(x => x.query))}`);
console.log('RESULT ' + JSON.stringify({ outcome, totalMs: total, docRequests: docs.length, uncaught, load1: os.loadavg()[0] }));
await srv.close(); process.exit(0);
