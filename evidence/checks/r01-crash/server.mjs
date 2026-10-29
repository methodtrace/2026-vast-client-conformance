// Local VAST server for the R01 reproduction. Every path is served from 127.0.0.1.
//   /inline.xml           valid VAST 4.3 InLine, immediate
//   /wrapper.xml?to=X     Wrapper whose VASTAdTagURI is /X
//   /hang.xml             accepts the connection, never sends headers
//   /stall.xml            sends 200 headers and part of the body, then never finishes
//   /slow.xml?ms=N        sends inline.xml after N ms
import http from 'node:http';

const inline = `<?xml version="1.0" encoding="UTF-8"?>
<VAST version="4.3"><Ad id="a1"><InLine><AdSystem>r01</AdSystem><AdTitle>r01</AdTitle>
<Impression><![CDATA[http://127.0.0.1:PORT/px/imp]]></Impression>
<Creatives><Creative id="c1"><Linear><Duration>00:00:10</Duration>
<MediaFiles><MediaFile delivery="progressive" type="video/mp4" width="640" height="360"><![CDATA[http://127.0.0.1:PORT/m.mp4]]></MediaFile></MediaFiles>
</Linear></Creative></Creatives></InLine></Ad></VAST>`;
const wrapper = to => `<?xml version="1.0" encoding="UTF-8"?>
<VAST version="4.3"><Ad id="w1"><Wrapper><AdSystem>r01</AdSystem>
<Impression><![CDATA[http://127.0.0.1:PORT/px/wimp]]></Impression>
<VASTAdTagURI><![CDATA[http://127.0.0.1:PORT/${to}]]></VASTAdTagURI></Wrapper></Ad></VAST>`;

export function start(port = 0) {
  const held = new Set();
  const log = [];
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    log.push({ t: Date.now(), path: u.pathname + u.search });
    const P = srv.address().port;
    const send = body => { res.writeHead(200, { 'content-type': 'application/xml' }); res.end(body.replaceAll('PORT', P)); };
    if (u.pathname === '/inline.xml') return send(inline);
    if (u.pathname === '/wrapper.xml') return send(wrapper(u.searchParams.get('to') || 'inline.xml'));
    if (u.pathname === '/hang.xml') { held.add(res); return; }
    if (u.pathname === '/stall.xml') { res.writeHead(200, { 'content-type': 'application/xml' }); res.write('<?xml version="1.0"?><VAST version="4.3">'); held.add(res); return; }
    if (u.pathname === '/slow.xml') { setTimeout(() => send(inline), +u.searchParams.get('ms') || 1000); return; }
    res.writeHead(204); res.end();
  });
  return new Promise(r => srv.listen(port, '127.0.0.1', () => r({
    port: srv.address().port, log,
    close: () => { for (const h of held) h.destroy(); srv.closeAllConnections?.(); srv.close(); },
  })));
}
