// Recording server for the VAST conformance harness.
// Serves VAST documents and logs every inbound request (wrapper fetches, tracking pixels, error pixels).
//
// Routes
//   GET /doc/<case>/<relpath>   serve <root>/<relpath> after URL rewriting (see rewrite())
//   GET /x/<case>/<host>/<path> any other URL from a served document; logged, 200 + 1x1 GIF, or VAST if a
//                               mapping for that external URL exists in <root>/_external/<host>/<path>
//   GET /_log/<case>            JSON array of requests logged for <case> (read by the runner)
//   ?status=<code> on any URL returns that HTTP status with an empty body (HTTP error vectors)
//   ?delay=<ms> on any URL delays the response (timeout vectors)
//   ?redirect=<relpath> on a /doc URL answers 302 to /doc/<case>/<relpath> (HTTP redirect vectors)
//   ?gzip=1 on a /doc URL sends the document gzip-compressed (Content-Encoding: gzip)
//   ?ctype=<type> on a /doc URL overrides the Content-Type header (default application/xml)
//   GET /t/<case>/<label>...   tracking/error pixel: logged, 200 + 1x1 GIF
//   GET /js/<case>/<label>...  verification resource: logged, 200 + a harmless script (application/javascript)
//
// Every absolute http(s) URL inside a served document is rewritten to /x/<case>/<host>/<path>, so a client
// fetching or pinging it reaches this server. {{BASE}} and {{CASE}} placeholders in vectors expand first.
import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

// tls: { key, cert } serves HTTPS; publicHost: the host name clients use (mapped to `host` by the browser), so a
// client that refuses IP-literal or insecure origins (the IMA SDK) sees an ordinary HTTPS ad server.
export function startServer({ root, port = 0, host = '127.0.0.1', mounts = [], mediaRoot = null, assetRoot = null, tls = null, publicHost = null }) {
  const scheme = tls ? 'https' : 'http';
  // mediaRoot: real media files served at /media/<file> with HTTP range support (for real <video> elements)
  // assetRoot: static harness assets (test page, bundles) served at /harness/<file>
  // mounts: [{ prefix: 'host/path/prefix/', root: '/local/dir' }] maps external URLs onto local files
  const log = new Map(); // case -> [entries]
  const t0 = Date.now();
  const handler = async (req, res) => {
    const u = new URL(req.url, `${scheme}://${req.headers.host}`);
    const parts = u.pathname.split('/').filter(Boolean);
    const base = `${scheme}://${req.headers.host}`;
    if (parts[0] === 'harness' && assetRoot) { return serveStatic(req, res, path.join(assetRoot, ...parts.slice(1).map(decodeURIComponent)), null); }
    if (parts[0] === 'media' && mediaRoot) {
      const caseM = u.searchParams.get('case') || '_';
      if (!log.has(caseM)) log.set(caseM, []);
      const me = { t: Date.now() - t0, method: req.method, path: u.pathname, query: u.search, kind: 'media', range: req.headers.range || null };
      log.get(caseM).push(me);
      const mDelay = Number(u.searchParams.get('delay') || 0), mStatus = Number(u.searchParams.get('status') || 0);
      if (mDelay > 0) await new Promise(r => setTimeout(r, mDelay));
      if (mStatus > 0) { me.status = mStatus; res.writeHead(mStatus, { 'access-control-allow-origin': req.headers.origin || '*' }); res.end(); return; }
      return serveStatic(req, res, path.join(mediaRoot, ...parts.slice(1).map(decodeURIComponent)), req.headers.origin);
    }
    if (parts[0] === '_log') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(log.get(parts[1]) || []));
      return;
    }
    const caseId = parts[1] || '_';
    const entry = { t: Date.now() - t0, method: req.method, path: u.pathname, query: u.search, kind: parts[0] };
    if (!log.has(caseId)) log.set(caseId, []);
    log.get(caseId).push(entry);
    const delay = Number(u.searchParams.get('delay') || 0);
    const status = Number(u.searchParams.get('status') || 0);
    if (delay > 0) await new Promise(r => setTimeout(r, delay));
    const cors = { 'access-control-allow-origin': req.headers.origin || '*', 'access-control-allow-credentials': 'true' };
    if (status > 0) { entry.status = status; res.writeHead(status, cors); res.end(); return; }
    // verification resource: a real, harmless JavaScript file (it defines nothing and calls nothing), so a player that
    // can execute verification code is not stopped by a type mismatch; ?status=404 on it gives a resource that fails to load
    if (parts[0] === 'js') { res.writeHead(200, { 'content-type': 'application/javascript; charset=utf-8', 'cache-control': 'no-store', ...cors }); res.end('/* VASTCONF harness verification resource: intentionally does nothing */\n'); return; }
    const redirect = u.searchParams.get('redirect');
    if (redirect && parts[0] === 'doc') { entry.status = 302; res.writeHead(302, { ...cors, location: `/doc/${caseId}/${redirect}` }); res.end(); return; }
    let file = null;
    if (parts[0] === 'doc') file = path.join(root, ...parts.slice(2).map(decodeURIComponent));
    else if (parts[0] === 'x') {
      const ext = path.join(root, '_external', ...parts.slice(2).map(decodeURIComponent));
      if (fs.existsSync(ext) && fs.statSync(ext).isFile()) file = ext;
      const ext2 = parts.slice(2).map(decodeURIComponent).join('/');
      for (const m of mounts) if (!file && ext2.startsWith(m.prefix)) {
        const f = path.join(m.root, ext2.slice(m.prefix.length));
        if (fs.existsSync(f) && fs.statSync(f).isFile()) file = f;
      }
    }
    if (file && fs.existsSync(file) && fs.statSync(file).isFile()) {
      const body = rewrite(fs.readFileSync(file, 'utf8'), base, caseId);
      entry.served = file;
      const headers = { 'content-type': u.searchParams.get('ctype') || 'application/xml; charset=utf-8', ...cors };
      if (u.searchParams.get('gzip') === '1') { headers['content-encoding'] = 'gzip'; res.writeHead(200, headers); res.end(zlib.gzipSync(Buffer.from(body, 'utf8'))); return; }
      // stall=<ms>: send the headers and the first 40 bytes, then hold the rest for <ms> (a stalled body)
      const stall = Number(u.searchParams.get('stall') || 0);
      if (stall > 0) { res.writeHead(200, headers); res.write(body.slice(0, 40)); entry.stalled = stall; setTimeout(() => { try { res.end(body.slice(40)); } catch {} }, stall); return; }
      res.writeHead(200, headers);
      res.end(body);
      return;
    }
    if (parts[0] === 'doc') { res.writeHead(404, cors); res.end(); entry.status = 404; return; }
    res.writeHead(200, { 'content-type': 'image/gif', ...cors });
    res.end(GIF);
  };
  const server = tls ? https.createServer(tls, handler) : http.createServer(handler);
  return new Promise(resolve => server.listen(port, host, () => {
    const { port: p } = server.address();
    resolve({ server, port: p, base: `${scheme}://${publicHost || host}:${p}`, log, close: () => new Promise(r => server.close(r)) });
  }));
}

const TYPES = { '.m4a': 'audio/mp4', '.oga': 'audio/ogg', '.bin': 'application/octet-stream', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css', '.map': 'application/json', '.json': 'application/json', '.webm': 'video/webm', '.mp4': 'video/mp4', '.xml': 'application/xml' };

// Static file with single-range support (real media elements, Safari in particular, request byte ranges).
function serveStatic(req, res, file, origin) {
  const cors = { 'access-control-allow-origin': origin || '*', 'accept-ranges': 'bytes', 'cache-control': 'no-store' };
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404, cors); res.end(); return; }
  const size = fs.statSync(file).size;
  const type = TYPES[path.extname(file)] || 'application/octet-stream';
  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  if (m) {
    let start = m[1] === '' ? size - Number(m[2]) : Number(m[1]);
    let end = m[1] !== '' && m[2] !== '' ? Number(m[2]) : size - 1;
    if (Number.isNaN(start) || start < 0) start = 0;
    end = Math.min(end, size - 1);
    if (start > end) { res.writeHead(416, { ...cors, 'content-range': `bytes */${size}` }); res.end(); return; }
    res.writeHead(206, { ...cors, 'content-type': type, 'content-length': end - start + 1, 'content-range': `bytes ${start}-${end}/${size}` });
    if (req.method === 'HEAD') { res.end(); return; }
    fs.createReadStream(file, { start, end }).pipe(res);
    return;
  }
  res.writeHead(200, { ...cors, 'content-type': type, 'content-length': size });
  if (req.method === 'HEAD') { res.end(); return; }
  fs.createReadStream(file).pipe(res);
}

// Rewrite absolute URLs (in text nodes, CDATA and attributes) to the recorder, keeping macros intact.
export function rewrite(xml, base, caseId) {
  xml = xml.replaceAll('{{BASE}}', base).replaceAll('{{CASE}}', caseId);
  return xml.replace(/https?:\/\/([^\s<>"'\]\/]+)(\/[^\s<>"'\]]*)?/g, (m, hostPart, rest) => {
    if (m.startsWith(base)) return m;
    // the discard port on loopback is a deliberately refused connection (error grid); it must stay as written
    if (/^http:\/\/127\.0\.0\.1:9\//.test(m)) return m;
    return `${base}/x/${caseId}/${hostPart}${rest || '/'}`;
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = process.argv[2] || '.';
  const port = Number(process.argv[3] || 8765);
  startServer({ root, port }).then(s => console.log(`serving ${root} at ${s.base}`));
}
