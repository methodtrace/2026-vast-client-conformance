// Tiny local server: serves suite vectors (read-only) with {{BASE}}/{{CASE}} substituted, plus ad-hoc docs; logs raw request lines.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const VEC = new URL('../../../../code/harness/suite/vectors', import.meta.url).pathname;
export async function startServer(extra = {}) {
  const log = [];
  const srv = http.createServer((req, res) => {
    log.push(req.url);
    const base = `http://127.0.0.1:${srv.address().port}`;
    let m;
    if ((m = req.url.match(/^\/x\/([^?]+)/)) && extra[m[1]] !== undefined) {
      res.writeHead(200, { 'content-type': 'application/xml' });
      return res.end(extra[m[1]].replaceAll('{{BASE}}', base).replaceAll('{{CASE}}', 'chk'));
    }
    if (/^\/x\//.test(req.url)) { res.writeHead(404); return res.end('nf'); }
    if ((m = req.url.match(/^\/doc\/[^/]+\/([^?]+)(\?.*)?$/))) {
      const f = path.join(VEC, m[1]);
      if (/status=404/.test(req.url) || !fs.existsSync(f)) { res.writeHead(404); return res.end('nf'); }
      res.writeHead(200, { 'content-type': 'application/xml' });
      return res.end(fs.readFileSync(f, 'utf8').replaceAll('{{BASE}}', base).replaceAll('{{CASE}}', 'chk'));
    }
    res.writeHead(200, { 'content-type': 'image/gif' }); res.end('');
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  return { base, log, close: () => new Promise(r => srv.close(r)), doc: v => `${base}/doc/chk/${v}` };
}
export const LIB = new URL('../../../../code/harness/node_modules/vastlint-client/dist/index.js', import.meta.url).pathname;
export const sleep = ms => new Promise(r => setTimeout(r, ms));
