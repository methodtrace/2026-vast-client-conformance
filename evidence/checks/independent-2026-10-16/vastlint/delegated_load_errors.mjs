// Is load-time error reporting "delegated" for vastlint-client? Observe what the library does by itself on failed chains,
// what it exposes (codes? free text?), and whether an integrator can reach the Wrapper Error URIs afterwards.
import { startServer, LIB, sleep } from './server.mjs';
const { createVastSession } = await import(LIB);
const deep404 = n => Object.fromEntries([...Array(n)].map((_, i) => [`d${i}.xml`, `<?xml version="1.0"?><VAST version="4.3"><Ad id="w${i}"><Wrapper><AdSystem>x</AdSystem>
<Error><![CDATA[{{BASE}}/t/chk/w${i}/err?code=[ERRORCODE]]]></Error><Impression><![CDATA[{{BASE}}/t/chk/w${i}/imp]]></Impression>
<VASTAdTagURI><![CDATA[{{BASE}}/x/${i + 1 < n ? `d${i + 1}.xml` : 'missing.xml?status=404'}]]></VASTAdTagURI></Wrapper></Ad></VAST>`]));
const s = await startServer(deep404(3));
async function probe(label, url) {
  s.log.length = 0;
  const events = [];
  const ses = createVastSession({ source: { kind: 'url', url } });
  ses.subscribe(sn => { const e = sn.events[sn.events.length - 1]; if (e) events.push(e.type); });
  let thrown = null, snap;
  try { snap = await ses.resolve(); } catch (e) { thrown = e.message; snap = ses.getSnapshot(); }
  await sleep(50);
  console.log(`== ${label}\n  thrown: ${thrown}\n  stoppedReason: ${snap.resolution ? snap.resolution.stoppedReason : null}\n  status: ${snap.status}; any numeric code field in snapshot: ${/\b(30[0-9]|100|900)\b/.test(JSON.stringify({ r: snap.resolution, e: String(snap.error) }))}`);
  console.log(`  requests by library alone: ${s.log.join(' ')}`);
  console.log(`  wrapperChain hops in snapshot: ${snap.wrapperChain.length}; tracking.plan.errors: ${snap.tracking.plan.errors.length}; resolvedAds: ${snap.resolvedAds.length}`);
  // what the integrator can do afterwards
  s.log.length = 0;
  try { await ses.track('error', { macros: { ERRORCODE: 301 } }); } catch (e) { console.log('  session.track(error) threw:', e.message); }
  if (snap.resolvedAds.length) { try { await ses.trackAd(0, 'error', { macros: { ERRORCODE: 302 } }); } catch (e) { console.log('  trackAd threw', e.message); } }
  await sleep(50);
  console.log(`  integrator-dispatched: ${s.log.join(' ') || 'none'}`);
}
await probe('w_http404 (1 wrapper -> 404)', s.doc('w_http404/start.xml'));
await probe('3 wrappers deep -> 404', `${s.base}/x/d0.xml`);
await probe('w_six (max_depth)', s.doc('w_six/start.xml'));
await probe('e_noad_root', s.doc('e_noad_root/start.xml'));
await s.close();
