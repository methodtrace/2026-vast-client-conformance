// rmp-vast's load path, reproduced outside the browser: @dailymotion/vast-client 6.4.2 (the version rmp-vast 17.2.0
// bundles) called exactly as rmp-vast index.js:586-599 calls it, versus vast-client's defaults. Node uses @xmldom
// instead of the browser DOMParser, so W11 here is indicative only.
import { startServer } from './server.mjs';
import vc from '@dailymotion/vast-client';
const { VASTClient } = vc;
const s = await startServer();
const RMP = { timeout: 5000, withCredentials: false, fetchOptions: {}, wrapperLimit: 4, resolveAll: false, allowMultipleAds: true }; // index.js:587-594 with utils.js:223 default
async function run(label, v, opts) {
  s.log.length = 0;
  const c = new VASTClient();
  const errs = [];
  c.getParser().on('VAST-error', e => errs.push(e.ERRORCODE));
  let r, thrown = null;
  try { r = await c.get(s.doc(v), opts); } catch (e) { thrown = e.message; }
  await new Promise(x => setTimeout(x, 100));
  console.log(`== ${label} ${v}\n  ads: ${r ? r.ads.map(a => `${a.id}(seq=${a.sequence},err=${a.errorCode ?? '-'})`).join(',') || 'none' : 'thrown ' + thrown}`);
  console.log(`  VAST-error codes emitted: ${errs.join(',') || 'none'}; hasRemainingAds: ${c.hasRemainingAds()}`);
  console.log(`  requests: ${s.log.join(' ')}`);
}
await run('rmp-vast options', 'w_five/start.xml', RMP);
await run('rmp-vast options', 'w_six/start.xml', RMP);
await run('rmp-vast options', 'w_malformed/start.xml', RMP);
await run('rmp-vast options', 'w_allow_multiple_false/start.xml', RMP);
await run('vast-client defaults (no allowMultipleAds override)', 'w_allow_multiple_false/start.xml', { resolveAll: false });
await run('rmp-vast options', 'w_allow_multiple_default/start.xml', RMP);
await run('vast-client defaults (no allowMultipleAds override)', 'w_allow_multiple_default/start.xml', { resolveAll: false });
await run('rmp-vast options', 'w_fallback_noad/start.xml', RMP);
await run('rmp-vast options', 'm_request_context/start.xml', RMP);
await run('rmp-vast options', 'p_pod_fail/start.xml', RMP);
await s.close();
