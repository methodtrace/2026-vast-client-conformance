const { VASTClient } = require(require('path').join(__dirname, '../../../code/harness/node_modules/@dailymotion/vast-client/dist/vast-client-node.js'));
const mode = process.argv[2];
globalThis.fetch = (url, opts) => new Promise((res, rej) => {
  if (mode === 'abort-aware') opts.signal.addEventListener('abort', () => { const e = new Error('aborted'); e.name = 'AbortError'; rej(e); });
  // 'hang' mode: never settles
});
process.on('exit', c => console.log(`[${mode}] process exit code`, c));
const c = new VASTClient();
const t0 = Date.now();
c.get('http://stub.invalid/vast.xml', { timeout: 200 })
  .then(r => console.log(`[${mode}] resolved`, r))
  .catch(e => console.log(`[${mode}] .catch observed after ${Date.now()-t0}ms:`, e.message));
setTimeout(() => console.log(`[${mode}] still alive at 600ms`), 600);
