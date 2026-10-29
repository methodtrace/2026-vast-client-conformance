#!/usr/bin/env python3
"""Differential and saturation analysis of the first two fuzz campaigns (results/fuzz/fuzz-r1, fuzz-r2).

Inputs : results/fuzz/fuzz-r{1,2}/cases.jsonl.gz, rounds.json
         results/fuzz/analysis/baseline-seeds.jsonl (every seed run unmutated, evidence/checks/fuzz-repros/baseline-seeds.mjs)
Outputs: results/fuzz/analysis/differential-groups.tsv   resolve pattern x (inherited from seed | induced by mutation)
         results/fuzz/analysis/differential-operators.tsv per mutation operator: cases, disagreeing, induced disagreements
         results/fuzz/analysis/saturation.tsv            per campaign and round: cases, classes seen, new classes
         stdout: summary numbers quoted in the paper's fuzzing section
Usage  : python3 -I evidence/checks/fuzz-repros/analyze.py   (from the repository root)
Pattern: one digit per client in the order vastclient, videoadsdk, iabloader, vastlint; 1 = resolved >= 1 InLine ad.
"""
import collections, gzip, json, os, re

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..'))
RAW = os.path.join(ROOT, 'results/fuzz')
OUT = os.path.join(ROOT, 'results/fuzz/analysis')
C = ['vastclient', 'videoadsdk', 'iabloader', 'vastlint']
norm = lambda s: re.sub(r'\s+', ' ', re.sub(r'\b\d+(\.\d+)?\b', 'N', re.sub(r'https?://[^\s\'")]+', '<url>', str(s))))[:160]
INTERNAL = re.compile(r"Cannot read propert|is not a function|is not iterable|undefined is not|null is not|Maximum call stack|Invalid array length|is not defined")


def keys(o):  # same classification as code/harness/fuzz/fuzz.mjs (hang/crash/uncaught/unhandled/internal)
    ks = []
    if o['hang']: ks.append(f"{o['client']}|hang")
    if o['crash']: ks.append(f"{o['client']}|crash")
    for u in o['uncaught'] or []:
        ks.append(f"{o['client']}|{'unhandled' if u.startswith('unhandled rejection') else 'uncaught'}|{norm(u)}")
    if INTERNAL.search(o['error'] or ''): ks.append(f"{o['client']}|internal|{norm(o['error'])}")
    return ks


def op(m):
    m = re.sub(r'^[^:]+: ', '', m)
    if m.startswith('net '): return 'net ' + m.split()[-1].split('=')[0]
    for p in ['delete', 'duplicate', 'move', 'copy', 'attr', 'remove', 'add', 'text', 'cdata->text', 'comment in', 'rename', 'truncate',
              'BOM', 'encoding decl', 'no XML declaration', 'DTD entity', 'namespace prefix', 'insert char', 'whitespace removed', 'VAST version']:
        if m.startswith(p): return p
    return m


pat = lambda o: ''.join('1' if o[c]['resolved'] else '0' for c in C)
cases = {r: [json.loads(l) for l in gzip.open(os.path.join(RAW, f'fuzz-{r}/cases.jsonl.gz'), 'rt')] for r in ['r1', 'r2']}
base = {}
for l in open(os.path.join(OUT, 'baseline-seeds.jsonl')):
    d = json.loads(l); base[d['seed']] = pat({x['client']: x for x in d['outcomes']})

# ---- overlap between campaigns
k = lambda d: (d['seed'], tuple(d['mutations']))
r2 = {}
for d in cases['r2']: r2.setdefault(k(d), d)
paired = [(d, r2[k(d)]) for d in cases['r1'] if k(d) in r2]
same = sum(1 for a, b in paired for x, y in zip(a['outcomes'], b['outcomes'])
           if (x['resolved'], x['error'], x['uncaught'], x['hang'], bool(x['crash'])) == (y['resolved'], y['error'], y['uncaught'], y['hang'], bool(y['crash'])))
uniq = {}
for r in ['r1', 'r2']:
    for d in cases[r]: uniq.setdefault(k(d), d)
print(f"cases r1={len(cases['r1'])} r2={len(cases['r2'])} total={len(cases['r1']) + len(cases['r2'])} unique(seed,mutations)={len(uniq)}")
print(f"r1 cases repeated verbatim in r2: {len(paired)}; paired client outcomes identical: {same} of {4 * len(paired)}")

# ---- saturation
rows = []
for r in ['r1', 'r2']:
    seen = set(); per = collections.defaultdict(lambda: [0, set(), 0])
    for d in cases[r]:
        ks = {x for o in d['outcomes'] for x in keys(o)}
        p = per[d['round']]; p[0] += 1; p[1] |= ks
        for x in ks:
            if x not in seen: seen.add(x); p[2] += 1
    for rd in sorted(per):
        rows.append((r, rd, per[rd][0], len(per[rd][1]), per[rd][2]))
with open(os.path.join(OUT, 'saturation.tsv'), 'w') as f:
    f.write('campaign\tround\tcases\tclasses_observed_in_round\tnew_classes\n')
    for row in rows: f.write('\t'.join(map(str, row)) + '\n')
inc = collections.Counter()
for d in uniq.values():
    for x in {x for o in d['outcomes'] for x in keys(o)}: inc[x] += 1
f1 = sum(1 for v in inc.values() if v == 1); f2 = sum(1 for v in inc.values() if v == 2)
chao = len(inc) + (f1 * f1 / (2 * f2) if f2 else f1 * (f1 - 1) / 2)
print(f"merged unique cases: classes={len(inc)} singletons={f1} doubletons={f2} Chao1={chao:.1f} Good-Turing P(next case new class)~{f1 / len(uniq):.4f}")
for x, v in sorted(inc.items(), key=lambda t: -t[1]): print(f"   {v:3d} unique cases  {x[:95]}")
seed_classes = set()
for l in open(os.path.join(OUT, 'baseline-seeds.jsonl')):
    d = json.loads(l)
    for o in d['outcomes']:
        oo = {'client': o['client'], 'hang': o['error'] == 'hang', 'crash': o['error'] == 'crash' and None, 'uncaught': o['uncaught'], 'error': o['error']}
        seed_classes |= set(keys(oo))
print(f"classes already raised by some unmutated seed: {len(seed_classes & set(inc))} of {len(inc)}")
for x in sorted(seed_classes & set(inc)): print('   ', x[:95])

# ---- differential
groups = collections.defaultdict(lambda: [0, 0])
opstat = collections.defaultdict(lambda: [0, 0, 0])
dis = ind = 0
for d in uniq.values():
    o = {x['client']: x for x in d['outcomes']}
    if any(o[c]['resolved'] is None for c in C): continue
    p = pat(o); disagree = len(set(p)) > 1
    induced = disagree and base.get(d['seed']) != p
    dis += disagree; ind += induced
    if disagree: groups[p][0 if not induced else 1] += 1
    for x in {op(m) for m in d['mutations']}:
        s = opstat[x]; s[0] += 1; s[1] += disagree; s[2] += induced
print(f"unique cases with a resolve disagreement: {dis}; of them induced by the mutation (seed alone gives another pattern): {ind}")
with open(os.path.join(OUT, 'differential-groups.tsv'), 'w') as f:
    f.write('pattern(vastclient,videoadsdk,iabloader,vastlint)\tinherited_from_seed\tinduced_by_mutation\n')
    for p_, (a, b) in sorted(groups.items(), key=lambda t: -sum(t[1])): f.write(f"{p_}\t{a}\t{b}\n"); print(f"   {p_} inherited {a:3d} induced {b:3d}")
with open(os.path.join(OUT, 'differential-operators.tsv'), 'w') as f:
    f.write('operator\tunique_cases\tdisagreeing\tinduced_disagreeing\tinduced_rate\n')
    for x, (n, a, b) in sorted(opstat.items(), key=lambda t: -t[1][2] / t[1][0]):
        f.write(f"{x}\t{n}\t{a}\t{b}\t{b / n:.2f}\n")
