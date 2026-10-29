// Extra check (not in the suite): does vastlint-client dispatch an Impression that is entirely commented out?
import { startServer, LIB, sleep } from './server.mjs';
const { createVastSession, createVastPlaybackQueueController } = await import(LIB);
const doc = `<?xml version="1.0"?><VAST version="4.3"><Ad id="in"><InLine><AdSystem>x</AdSystem><AdTitle>t</AdTitle>
<!-- <Impression><![CDATA[{{BASE}}/t/chk/commented/imp]]></Impression> -->
<Impression><![CDATA[{{BASE}}/t/chk/in/imp]]></Impression><Creatives><Creative><Linear><Duration>00:00:10</Duration>
<MediaFiles><MediaFile delivery="progressive" type="video/mp4" width="1" height="1"><![CDATA[{{BASE}}/m.mp4]]></MediaFile></MediaFiles></Linear></Creative></Creatives></InLine></Ad></VAST>`;
const s = await startServer({ 'c.xml': doc });
const ses = createVastSession({ source: { kind: 'url', url: `${s.base}/x/c.xml` } });
const q = createVastPlaybackQueueController({ session: ses, autoResolve: true });
await q.initialize(); await q.start(); await sleep(50);
console.log('requests:', s.log.join(' '));
await s.close();
