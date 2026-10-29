// Separate claim: VASTAdTagURI written as escaped text with &amp; is requested truncated at the first &amp;,
// while Impression URIs written the same way are decoded correctly.
import { startServer, LIB, sleep } from './server.mjs';
import { inspectDocument } from '../../../../code/harness/node_modules/vastlint/index.node.mjs';
const { createVastSession, createVastPlaybackQueueController } = await import(LIB);
const wrapper = (uri, imp) => `<?xml version="1.0"?><VAST version="4.3"><Ad id="w0"><Wrapper><AdSystem>x</AdSystem>
<Impression>${imp}</Impression><VASTAdTagURI>${uri}</VASTAdTagURI></Wrapper></Ad></VAST>`;
const inline = `<?xml version="1.0"?><VAST version="4.3"><Ad id="in"><InLine><AdSystem>x</AdSystem><AdTitle>t</AdTitle>
<Impression><![CDATA[{{BASE}}/t/chk/in/imp]]></Impression><Creatives><Creative><Linear><Duration>00:00:10</Duration>
<MediaFiles><MediaFile delivery="progressive" type="video/mp4" width="1" height="1"><![CDATA[{{BASE}}/m.mp4]]></MediaFile></MediaFiles></Linear></Creative></Creatives></InLine></Ad></VAST>`;
const cases = {
  'escaped.xml': wrapper('{{BASE}}/x/in.xml?a=1&amp;b=2&amp;c=3', '{{BASE}}/t/chk/w0/imp?a=1&amp;b=2'),
  'cdata.xml': wrapper('<![CDATA[{{BASE}}/x/in.xml?a=1&b=2&c=3]]>', '<![CDATA[{{BASE}}/t/chk/w0/imp?a=1&b=2]]>'),
  'numeric.xml': wrapper('{{BASE}}/x/in.xml?a=1&#38;b=2', '{{BASE}}/t/chk/w0/imp?a=1&#38;b=2'),
  'in.xml': inline,
};
const s = await startServer(cases);
for (const c of ['escaped.xml', 'cdata.xml', 'numeric.xml']) {
  s.log.length = 0;
  const raw = cases[c].replaceAll('{{BASE}}', s.base);
  console.log(`== ${c}\n  vastlint.inspectDocument().wrapperUri = ${JSON.stringify(inspectDocument(raw).wrapperUri)}`);
  const ses = createVastSession({ source: { kind: 'url', url: `${s.base}/x/${c}` } });
  const q = createVastPlaybackQueueController({ session: ses, autoResolve: true });
  await q.initialize(); await q.start(); await sleep(50);
  console.log('  requests:', s.log.join('  '));
}
await s.close();
