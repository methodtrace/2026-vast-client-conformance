// Calls iab-vast-parser 1.2.1 directly (no loader, no adapter, no jsdom) on one XML file and prints the stack.
// Usage: node evidence/checks/fuzz-repros/iab-parse-stack.cjs <file.xml>
const fs = require('fs');
const path = require('path');
const parse = require(path.resolve(__dirname, '../../../code/harness/node_modules/iab-vast-parser'));
const xml = fs.readFileSync(process.argv[2], 'utf8');
try {
  const v = parse(xml);
  console.log('PARSED OK; ads:', v.ads ? v.ads.length : '?', 'adPod:', !!v.adPod);
} catch (e) {
  console.log('THROWN', e.constructor.name, e.code !== undefined ? 'code=' + e.code : '', '\n' + e.stack.split('\n').slice(0, 8).join('\n'));
  process.exitCode = 2;
}
