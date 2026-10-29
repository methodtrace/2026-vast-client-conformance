// Drives iab-vast-loader 2.5.1 directly (VASTLoader.load, no adapter, no jsdom) against a fuzz example served by the
// recording server, and prints the rejection's stack. With BUNDLE pointing at a bundle built with --sourcemap and
// `node --enable-source-maps`, frames map back to node_modules/<pkg>/lib/*.js.
// Usage: node --enable-source-maps evidence/checks/fuzz-repros/iab-load-stack.mjs <exampleRoot> <case> [timeoutMs]
import path from 'node:path';
import { startServer } from '../../../code/harness/server.mjs';

const [, , root, caseId, tmo] = process.argv;
const bundle = process.env.BUNDLE || path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../code/harness/build/dist/iab-vast-loader.bundle.mjs');
const { VASTLoader } = await import(bundle);
const srv = await startServer({ root: path.resolve(root) });
const url = `${srv.base}/doc/${caseId}x/${caseId}/start.xml`;
const loader = new VASTLoader(url, { timeout: Number(tmo || 2000) });
try {
  const chain = await loader.load();
  console.log('RESOLVED chain length', chain.length);
} catch (e) {
  console.log('REJECTED', e.constructor.name, 'code=' + e.code, 'message=' + e.message);
  console.log(String(e.stack).split('\n').slice(0, 10).join('\n'));
  if (e.cause) console.log('cause:', e.cause.stack || e.cause);
}
console.log('log:', JSON.stringify([...srv.log.values()].flat().map(x => [x.path, x.query, x.status || 200])));
await srv.close();
process.exit(0);
