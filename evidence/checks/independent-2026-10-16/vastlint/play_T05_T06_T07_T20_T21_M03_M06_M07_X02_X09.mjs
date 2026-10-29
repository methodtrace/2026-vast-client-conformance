// Play-mode checks for vastlint-client through createVastPlaybackQueueController, the library's own pod-aware controller.
// Each case reports the raw tracking requests seen at a local server.
import { startServer, LIB, sleep } from './server.mjs';
const { createVastSession, createVastPlaybackQueueController } = await import(LIB);
const s = await startServer();
async function run(v, drive) {
  s.log.length = 0;
  const ses = createVastSession({ source: { kind: 'url', url: s.doc(v) } });
  const q = createVastPlaybackQueueController({ session: ses, autoResolve: true, mediaSelection: { supportedMimeTypes: ['video/mp4'] } });
  await q.initialize();
  await drive(q, ses);
  await sleep(50);
  const snap = ses.getSnapshot();
  console.log(`== ${v}\n  ${s.log.filter(u => u.startsWith('/t/')).join('\n  ')}`);
  return { q, ses, snap };
}
const full = async q => { await q.start(); for (let i = 1; i <= 40; i++) await q.updateProgress(i * 0.25, 10); await q.completeCurrent(); };
await run('t_inline_full/start.xml', full);                             // T05 T06 T07
await run('t_interact/start.xml', async q => { await q.start(); await q.updateProgress(3, 10); await q.pause(); await q.resume(); await q.updateProgress(10, 10); await q.completeCurrent(); }); // T20
await run('t_rewind/start.xml', async q => { await q.start(); for (let t = 0.5; t <= 6; t += 0.5) await q.updateProgress(t, 10); await q.updateProgress(4, 10); for (let t = 4.5; t <= 10; t += 0.5) await q.updateProgress(t, 10); await q.completeCurrent(); }); // T21
await run('m_macros/start.xml', full);                                  // M03
const r = await run('m_optional/start.xml', full);                      // M06 M07
console.log('  adServingId exposed in snapshot:', r.snap.resolvedAds[0].adPod.adServingId, '; universalAdIds:', JSON.stringify(r.snap.resolvedAds[0].universalAdIds.map(u => [u.idRegistry, u.value])));
// The controller's start() takes no macros; can an integrator supply them on impression at all? Only via session.track/trackAd.
const r2 = await run('m_optional/start.xml', async (q, ses) => { await ses.trackAd(0, 'impression', { macros: { ADSERVINGID: 'in-serving', LIMITADTRACKING: 0 } }); });
const x = await run('x_comment/start.xml', full);                       // X02
console.log('  impressionUrls as parsed:', JSON.stringify(x.snap.resolvedAds[0].impressionUrls));
const xh = (x.snap.tracking.history || []).filter(h => h.event === 'impression');
console.log('  impression dispatch history:', JSON.stringify(xh.map(h => [h.resolvedUrl, h.ok, h.error])));
const e = await run('x_extension_impression/start.xml', full);          // X09
console.log('  impressionUrls as parsed:', JSON.stringify(e.snap.resolvedAds[0].impressionUrls.map(u => u.replace(s.base, ''))));
// T05: does an integrator-level primitive exist? session.trackAd(...,'progress',{offset}) selects by offset string
const p = await run('t_inline_full/start.xml', async (q, ses) => { await ses.trackAd(0, 'progress', { offset: '00:00:05' }); });
await s.close();
