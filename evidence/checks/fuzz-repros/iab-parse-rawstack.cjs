// iab-vast-parser 1.2.1 parse() without its catch-all: shows where the original TypeError is thrown
// (parse.js wraps every error from unmarshal/factory as VASTParserError code 101 and drops the stack).
// Usage: node evidence/checks/fuzz-repros/iab-parse-rawstack.cjs <file.xml>
const fs = require('fs'); const path = require('path');
const L = path.resolve(__dirname, '../../../code/harness/node_modules/iab-vast-parser/lib');
const { DOMParser } = require(path.resolve(__dirname, '../../../code/harness/node_modules/xmldom'));
const Unmarshaler = require(L + '/xml/unmarshaler').default;
const schema = require(L + '/vast/schema').default;
const createVast = require(L + '/factory/vast').default;
const ErrorHandler = require(L + '/errors/error-handler').default;
const doc = new DOMParser({ errorHandler: {} }).parseFromString(fs.readFileSync(process.argv[2], 'utf8'), 'text/xml');
const options = { strict: false, noSingleAdPods: false, errorHandler: new ErrorHandler(false) };
try {
  const root = new Unmarshaler(schema).unmarshal(doc.documentElement);
  createVast(root, options);
  console.log('no error');
} catch (e) { console.log(e.stack.split('\n').slice(0, 7).join('\n')); }
