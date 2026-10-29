// iab-vast-parser 1.2.1: what parse() does with a non-XML HTTP body (an empty 204 body, or the 1x1 GIF the
// recording server answers for unknown hosts), with the raw TypeError stack of the internal call (toElement +
// unmarshal) printed as well. Usage: node evidence/checks/fuzz-repros/iab-parse-body.cjs
const path = require('path');
const NM = path.resolve(__dirname, '../../../code/harness/node_modules');
const parse = require(NM + '/iab-vast-parser');
const { DOMParser } = require(NM + '/xmldom');
const Unmarshaler = require(NM + '/iab-vast-parser/lib/xml/unmarshaler').default;
const schema = require(NM + '/iab-vast-parser/lib/vast/schema').default;
const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64').toString('utf8');
for (const [name, body] of [['empty body (HTTP 204)', ''], ['GIF body', gif], ['plain text', 'not xml'], ['HTML', '<html><body>x</body></html>']]) {
  console.log('---', name);
  try { const v = parse(body); console.log('parse() returned; ads', v.ads.length); }
  catch (e) { console.log('parse() threw', e.constructor.name, 'code=' + e.code, e.message); }
  try {
    const doc = new DOMParser({ errorHandler: {} }).parseFromString(body, 'text/xml');
    console.log('  xmldom returned', doc === undefined ? 'undefined' : 'documentElement=' + (doc.documentElement && doc.documentElement.nodeName));
    if (doc && doc.documentElement == null) { doc.getElementsByTagName('parsererror'); new Unmarshaler(schema).unmarshal(doc); }
  } catch (e) { console.log('  raw:', e.stack.split('\n').slice(0, 4).join('\n       ')); }
}
