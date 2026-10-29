// Load-time checks for vastlint-client: W03 (5 wrappers), W19 (followAdditionalWrappers), W20/W21 (allowMultipleAds),
// W11 (malformed target), M12 (macros in VASTAdTagURI). Driven directly through createVastSession, defaults only.
import { startServer, LIB } from './server.mjs';
const { createVastSession } = await import(LIB);
const s = await startServer();
for (const v of ['w_five/start.xml', 'w_follow_false/start.xml', 'w_allow_multiple_false/start.xml', 'w_allow_multiple_default/start.xml', 'w_malformed/start.xml', 'm_request_context/start.xml']) {
  s.log.length = 0;
  const ses = createVastSession({ source: { kind: 'url', url: s.doc(v) } });
  let snap, err = null;
  try { snap = await ses.resolve(); } catch (e) { err = e.message; snap = ses.getSnapshot(); }
  console.log(`== ${v}`);
  console.log('  requests:', s.log.join(' '));
  console.log('  stoppedReason:', snap.resolution && snap.resolution.stoppedReason, 'err:', err);
  console.log('  resolvedAds:', snap.resolvedAds.map(a => `${a.adPod.adId}(seq=${a.adPod.sequence},resolved=${a.resolved})`).join(','));
  console.log('  chainValid:', snap.resolution && snap.resolution.chainValid, 'totalErrors:', snap.resolution && snap.resolution.totalErrors);
  if (v.startsWith('w_malformed')) console.log('  last-hop issues:', JSON.stringify((snap.validation || {}).issues?.filter(i => i.severity === 'error').map(i => i.id)));
}
// W03 with maxWrapperDepth 6 (documents) to confirm it is the default that rejects
s.log.length = 0;
const ses6 = createVastSession({ source: { kind: 'url', url: s.doc('w_five/start.xml') }, maxWrapperDepth: 6 });
const sn6 = await ses6.resolve();
console.log('== w_five with maxWrapperDepth:6 ->', sn6.resolution.stoppedReason, s.log.length, 'requests');
await s.close();
