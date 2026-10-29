// @dailymotion/vast-client 6.5.0: VASTParser.parseVAST() called directly on a document (no adapter, no jsdom,
// no network), using the non-minified Node build so frames carry readable file:line.
// Usage: node evidence/checks/fuzz-repros/vastclient-parse-stack.cjs <file.xml>
const fs = require('fs'); const path = require('path');
const VC = path.resolve(__dirname, '../../../code/harness/node_modules/@dailymotion/vast-client');
const { VASTParser } = require(VC + '/dist/vast-client-node.js');
const { DOMParser } = require(path.resolve(__dirname, '../../../code/harness/node_modules/@xmldom/xmldom'));
const xml = fs.readFileSync(process.argv[2], 'utf8').replaceAll('{{BASE}}', 'http://127.0.0.1:9').replaceAll('{{CASE}}', 'c');
const doc = new DOMParser().parseFromString(xml, 'text/xml');
const p = new VASTParser();
p.on('VAST-warning', w => console.log('VAST-warning:', w.message));
p.parseVAST(doc).then(r => console.log('RESOLVED ads:', r.ads.length), e => { console.log('REJECTED', e.constructor.name, e.message); console.log(e.stack.split('\n').slice(1, 6).join('\n')); });
