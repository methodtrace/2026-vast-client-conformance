// npm i @dailymotion/vast-client@6.5.0   then   node minimal-repro.mjs ; echo "exit code $?"
import http from 'node:http';
import { VASTClient } from '@dailymotion/vast-client';

const srv = http.createServer((req, res) => {
  if (req.url === '/wrapper.xml') {
    res.writeHead(200, { 'content-type': 'application/xml' });
    return res.end(`<VAST version="4.3"><Ad id="w"><Wrapper><AdSystem>x</AdSystem>
<VASTAdTagURI><![CDATA[http://127.0.0.1:${srv.address().port}/hang.xml]]></VASTAdTagURI></Wrapper></Ad></VAST>`);
  }
  // /hang.xml: never answer (a slow or unresponsive ad server in the Wrapper chain)
});

process.on('unhandledRejection', e => console.log('unhandledRejection', e));
srv.listen(0, '127.0.0.1', async () => {
  try {
    const r = await new VASTClient().get(`http://127.0.0.1:${srv.address().port}/wrapper.xml`, { timeout: 500 });
    console.log('resolved, ads:', r.ads.length);
  } catch (e) {
    console.log('caught:', e.message);
  }
  srv.close();
});
