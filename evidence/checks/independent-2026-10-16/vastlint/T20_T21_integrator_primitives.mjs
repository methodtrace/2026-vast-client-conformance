// T20/T21: the playback queue controller has no 'loaded' or 'rewind' entry point, and updateProgress() going backwards
// dispatches nothing. Does the session expose a primitive an integrator can use instead?
import { startServer, LIB, sleep } from './server.mjs';
const { createVastSession, createVastPlaybackQueueController } = await import(LIB);
const s = await startServer();
for (const [v, ev] of [['t_interact/start.xml', 'loaded'], ['t_rewind/start.xml', 'rewind']]) {
  s.log.length = 0;
  const ses = createVastSession({ source: { kind: 'url', url: s.doc(v) } });
  const q = createVastPlaybackQueueController({ session: ses, autoResolve: true });
  await q.initialize();
  console.log(`${v}: controller methods = ${Object.keys(q).join(',')}`);
  await ses.trackAd(0, ev); await sleep(30);
  console.log(`  session.trackAd(0,'${ev}') -> ${s.log.filter(u => u.startsWith('/t/')).join(' ')}`);
}
await s.close();
