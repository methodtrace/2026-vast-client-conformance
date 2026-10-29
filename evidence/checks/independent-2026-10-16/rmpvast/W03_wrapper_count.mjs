// How many Wrappers does rmp-vast's configuration of vast-client 6.4.2 (wrapperLimit = maxNumRedirects = 4) accept?
import { startServer } from './server.mjs';
import vc from '@dailymotion/vast-client';
const chain = n => {
  const d = {};
  for (let i = 0; i < n; i++) d[`c${n}_${i}.xml`] = `<?xml version="1.0"?><VAST version="4.3"><Ad id="w${i}"><Wrapper><AdSystem>x</AdSystem><Error><![CDATA[{{BASE}}/t/chk/w${i}/err?code=[ERRORCODE]]]></Error><Impression><![CDATA[{{BASE}}/t/chk/w${i}/imp]]></Impression><VASTAdTagURI><![CDATA[{{BASE}}/x/${i + 1 < n ? `c${n}_${i + 1}.xml` : `c${n}_in.xml`}]]></VASTAdTagURI></Wrapper></Ad></VAST>`;
  d[`c${n}_in.xml`] = `<?xml version="1.0"?><VAST version="4.3"><Ad id="in"><InLine><AdSystem>x</AdSystem><AdTitle>t</AdTitle><Impression><![CDATA[{{BASE}}/t/chk/in/imp]]></Impression><Creatives><Creative><Linear><Duration>00:00:10</Duration><MediaFiles><MediaFile delivery="progressive" type="video/mp4" width="1" height="1"><![CDATA[{{BASE}}/m.mp4]]></MediaFile></MediaFiles></Linear></Creative></Creatives></InLine></Ad></VAST>`;
  return d;
};
const docs = Object.assign({}, ...[2, 3, 4, 5].map(chain));
const s = await startServer(docs);
for (const limit of [4, 5, 6]) for (const n of [3, 4, 5]) {
  s.log.length = 0;
  const c = new vc.VASTClient();
  const r = await c.get(`${s.base}/x/c${n}_0.xml`, { wrapperLimit: limit, resolveAll: false, allowMultipleAds: true });
  await new Promise(x => setTimeout(x, 50));
  console.log(`wrapperLimit=${limit} chain of ${n} wrappers -> ads ${r.ads.map(a => a.id).join(',') || 'none'}; docs fetched ${s.log.filter(u => u.startsWith('/x/')).length}; errors ${s.log.filter(u => /err/.test(u)).join(' ') || 'none'}`);
}
await s.close();
