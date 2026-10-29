// Compares a replay run with the stored campaign, case by case: descriptor (corpus seed + mutation list), failure classes and outcome fields.
// Usage: node evidence/checks/fuzz-repros/fuzz-replay-compare.mjs results/fuzz/fuzz-r3/cases.jsonl.gz <replay-out>/cases.jsonl > compare.json
// Classes are derived from the stored outcome records with the rules of classes() in code/harness/fuzz/fuzz.mjs; the "slow" class needs res.ms,
// which cases.jsonl does not keep, so it is not compared. Timing (wall) is reported but not compared.
import fs from 'node:fs'; import zlib from 'node:zlib';
const norm = s => String(s).replace(/https?:\/\/[^\s'")]+/g, '<url>').replace(/\b\d+(\.\d+)?\b/g, 'N').replace(/\s+/g, ' ').slice(0, 160);
function keys(o) {
  const out = [];
  if (o.hang) out.push(`${o.client}|hang|no result within 30 s`);
  if (o.crash) out.push(`${o.client}|crash|${norm(o.crash)}`);
  for (const u of o.uncaught || []) out.push(`${o.client}|${u.startsWith('unhandled rejection') ? 'unhandled' : 'uncaught'}|${norm(u)}`);
  const e = String(o.error || '');
  if (e.startsWith('adapter crash')) out.push(`${o.client}|adapter|${norm(e.split('\n')[0])}`);
  else if (/Cannot read propert|is not a function|is not iterable|undefined is not|null is not|Maximum call stack|Invalid array length|is not defined/.test(e)) out.push(`${o.client}|internal|${norm(e)}`);
  return out;
}
const stored = new Map(zlib.gunzipSync(fs.readFileSync(process.argv[2])).toString().trim().split('\n').map(l => { const d = JSON.parse(l); return [d.id, d]; }));
const rep = fs.readFileSync(process.argv[3], 'utf8').trim().split('\n').map(JSON.parse);
const res = []; 
for (const r of rep) {
  const s = stored.get(r.id);
  const ks = d => d.outcomes.flatMap(keys).sort();
  const okp = d => d.outcomes.map(o => `${o.client}:${o.ok}/${o.resolved}`).join(' ');
  const errp = d => d.outcomes.map(o => `${o.client}:${o.error}`).join(' | ');
  const classSame = JSON.stringify(ks(s)) === JSON.stringify(ks(r));
  const verdictSame = okp(s) === okp(r) && errp(s) === errp(r);
  res.push({ id: r.id, descriptorSame: JSON.stringify([s.seed, s.mutations]) === JSON.stringify([r.seed, r.mutations]), classSame, verdictSame, storedKeys: ks(s), replayKeys: ks(r), stored: okp(s), replay: okp(r), storedErr: errp(s), replayErr: errp(r), storedWall: Math.max(...s.outcomes.map(o => o.wall)), replayWall: Math.max(...r.outcomes.map(o => o.wall)) });
}
const diff = res.filter(x => !x.classSame || !x.verdictSame || !x.descriptorSame);
console.log(JSON.stringify({ compared: res.length, descriptorMatches: res.filter(x => x.descriptorSame).length, classMatches: res.filter(x => x.classSame).length, outcomeMatches: res.filter(x => x.classSame && x.verdictSame).length, withClassStored: res.filter(x => x.storedKeys.length).length, differences: diff }, null, 1));
