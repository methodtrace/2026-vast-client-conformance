// Side finding: in w_noad / w_fallback_noad the no-ad response's VAST-level Error URI was requested twice in the
// rmp-vast browser run. vast-client 6.4.2 pings Error URIs itself with new Image() (src/util/util.js:3-12, browser
// only), so in Node we count its 'VAST-error' emissions instead (vast_parser.js:45-51 emits and tracks together).
import { startServer } from './server.mjs';
import vc from '@dailymotion/vast-client';
const s = await startServer();
for (const v of ['w_noad/start.xml', 'w_fallback_noad/start.xml']) {
  const c = new vc.VASTClient();
  const errs = [];
  c.getParser().on('VAST-error', e => errs.push(e.ERRORCODE));
  const r = await c.get(s.doc(v), { timeout: 5000, wrapperLimit: 4, resolveAll: false, allowMultipleAds: true });
  console.log(`${v}: ads=${r.ads.length}; response.errorURLTemplates=${JSON.stringify(r.errorURLTemplates.map(u => u.replace(s.base, '')))}; vast-client VAST-error (=Image ping in browser) codes: ${errs.join(',')}`);
}
await s.close();
