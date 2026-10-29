// After a mid-chain fetch failure, which hops (and so which Wrapper Error URIs) does the library still expose?
import { startServer, LIB } from './server.mjs';
const { createVastSession } = await import(LIB);
const docs = Object.fromEntries([0, 1, 2].map(i => [`d${i}.xml`, `<?xml version="1.0"?><VAST version="4.3"><Ad id="w${i}"><Wrapper><AdSystem>x</AdSystem>
<Error><![CDATA[{{BASE}}/t/chk/w${i}/err?code=[ERRORCODE]]]></Error><Impression><![CDATA[{{BASE}}/t/chk/w${i}/imp]]></Impression>
<VASTAdTagURI><![CDATA[{{BASE}}/x/${i < 2 ? `d${i + 1}.xml` : 'missing.xml'}]]></VASTAdTagURI></Wrapper></Ad></VAST>`]));
const s = await startServer(docs);
const ses = createVastSession({ source: { kind: 'url', url: `${s.base}/x/d0.xml` } });
const hopEvents = [];
ses.subscribe(sn => { for (const e of sn.events) if (e.type === 'resolve:hop' && !hopEvents.includes(e.detail.url)) hopEvents.push(e.detail.url); });
try { await ses.resolve(); } catch (e) { console.log('resolve() threw:', e.message); }
const sn = ses.getSnapshot();
console.log('snapshot.wrapperChain urls:', sn.wrapperChain.map(h => h.url.replace(s.base, '')));
console.log('snapshot.tracking.plan.errors:', sn.tracking.plan.errors.map(t => t.url.replace(s.base, '')));
console.log('resolve:hop event urls (no XML attached):', hopEvents.map(u => u.replace(s.base, '')));
await s.close();
