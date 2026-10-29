#!/usr/bin/env python3
"""Saturation analysis of fuzz campaign 3 (results/fuzz/fuzz-r3: mulberry32 generator).

Inputs : results/fuzz/fuzz-r3/cases.jsonl.gz, rounds.json, classes.json
         results/fuzz/fuzz-r{1,2}/cases.jsonl.gz (overlap check only)
         results/fuzz/analysis/baseline-seeds.jsonl (classes an unmutated seed already raises)
Outputs: results/fuzz/analysis/saturation-r3.tsv        per round: cases, cumulative unique cases, classes seen, new, cumulative
         results/fuzz/analysis/class-frequencies-r3.tsv per class: unique cases, rounds hit, first case
         stdout: the numbers quoted in the paper (campaign 3)
Usage  : python3 -I evidence/checks/fuzz-repros/analyze-r3.py   (from the repository root)
"""
import collections, gzip, json, math, os, re

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..'))
R3 = os.path.join(ROOT, 'results/fuzz/fuzz-r3')
OUT = os.path.join(ROOT, 'results/fuzz/analysis')
norm = lambda s: re.sub(r'\s+', ' ', re.sub(r'\b\d+(\.\d+)?\b', 'N', re.sub(r'https?://[^\s\'")]+', '<url>', str(s))))[:160]
INTERNAL = re.compile(r"Cannot read propert|is not a function|is not iterable|undefined is not|null is not|Maximum call stack|Invalid array length|is not defined")


def keys(o):  # same classification as code/harness/fuzz/fuzz.mjs (crash messages are not kept in cases.jsonl; none occur)
    c = o['client']; ks = []
    if o['hang']: ks.append(f'{c}|hang|no result within 30 s')
    if o['crash']: ks.append(f'{c}|crash|?')
    for u in o['uncaught'] or []:
        ks.append(f"{c}|{'unhandled' if u.startswith('unhandled rejection') else 'uncaught'}|{norm(u)}")
    e = o['error'] or ''
    if e.startswith('adapter crash'): ks.append(f'{c}|adapter|{norm(e.splitlines()[0])}')
    elif INTERNAL.search(e): ks.append(f'{c}|internal|{norm(e)}')
    return ks


cases = [json.loads(l) for l in gzip.open(os.path.join(R3, 'cases.jsonl.gz'), 'rt')]
rounds = json.load(open(os.path.join(R3, 'rounds.json')))
cls = json.load(open(os.path.join(R3, 'classes.json')))
K = lambda d: (d['seed'], tuple(d['mutations']))

# ---- uniqueness and overlap with r1/r2
uniq = {}
for d in cases: uniq.setdefault(K(d), d)
old = set()
for r in ['r1', 'r2']:
    for l in gzip.open(os.path.join(ROOT, f'results/fuzz/fuzz-{r}/cases.jsonl.gz'), 'rt'): old.add(K(json.loads(l)))
dups = len(cases) - len(uniq)
print(f'cases={len(cases)} unique(seed,mutations)={len(uniq)} duplicates_within_r3={dups} also_in_r1_or_r2={sum(1 for k in uniq if k in old)}')
print(f"seeds={rounds['seeds']} distinct seeds drawn={len({d['seed'] for d in cases})}")
mutcount = collections.Counter(len(d['mutations']) for d in cases)
print('mutations per case:', dict(sorted(mutcount.items())))
hit = sum(1 for d in uniq.values() if any(keys(o) for o in d['outcomes']))
print(f'unique cases raising >= 1 class: {hit}')

# ---- consistency of recomputed classes with classes.json
inc = collections.Counter(); rds = collections.defaultdict(set); first = {}
for d in cases:
    ks = {x for o in d['outcomes'] for x in keys(o)}
    for x in ks:
        rds[x].add(d['round']); first.setdefault(x, d['id'])
for d in uniq.values():
    for x in {x for o in d['outcomes'] for x in keys(o)}: inc[x] += 1
assert set(inc) == {c['key'] for c in cls}, (set(inc) ^ {c['key'] for c in cls})
assert all(first[c['key']] == c['firstCase'] for c in cls)
print(f'classes={len(inc)} (matches classes.json, first cases match)')

# ---- per round
rows = []; seen = set(); cum_u = set()
by_round = collections.defaultdict(list)
for d in cases: by_round[d['round']].append(d)
for rd in sorted(by_round):
    obs = set(); new = 0
    for d in by_round[rd]:
        cum_u.add(K(d))
        for x in {x for o in d['outcomes'] for x in keys(o)}:
            obs.add(x)
            if x not in seen: seen.add(x); new += 1
    rows.append((rd, len(by_round[rd]), len(cum_u), len(obs), new, len(seen)))
with open(os.path.join(OUT, 'saturation-r3.tsv'), 'w') as f:
    f.write('round\tcases\tcumulative_unique_cases\tclasses_observed_in_round\tnew_classes\tcumulative_classes\n')
    for r in rows: f.write('\t'.join(map(str, r)) + '\n')
for r in rows: print('round %d: cases %d, cumulative unique %d, classes seen %d, new %d, cumulative %d' % r)
for r in rounds['rounds']: print('  rounds.json:', r)

# discovery curve: unique-case index at which each class first appears
order = []; seen2 = set()
for i, d in enumerate(uniq.values(), 1):
    for x in sorted({x for o in d['outcomes'] for x in keys(o)}):
        if x not in seen2: seen2.add(x); order.append((i, x))
print('first appearance (unique-case index):', [i for i, _ in order])

# ---- frequency distribution and richness estimates (incidence = number of unique cases raising the class)
n = len(uniq); S = len(inc)
fk = collections.Counter(inc.values())
f1, f2 = fk.get(1, 0), fk.get(2, 0)
chao1_classic = S + (f1 * f1 / (2 * f2) if f2 else float('nan'))
chao1_bc = S + (n - 1) / n * f1 * (f1 - 1) / (2 * (f2 + 1))   # bias-corrected, defined for f2 = 0
# incidence-based Chao2 with m sampling units = unique cases (equivalent here, each case is one unit)
chao2 = S + ((n - 1) / n) * (f1 * f1 / (2 * f2) if f2 else f1 * (f1 - 1) / 2)
# variance of bias-corrected Chao1 (Chao 1987 form for f2 = 0 case, Chao & Chiu 2016) and log-normal CI
if f1 > 0:
    a = (n - 1) / n
    if f2 > 0:
        var = f2 * (a * (f1 / f2) ** 2 / 2 + a * a * (f1 / f2) ** 3 + a * a * (f1 / f2) ** 4 / 4)
    else:
        var = a * f1 * (f1 - 1) / 2 + a * a * f1 * (2 * f1 - 1) ** 2 / 4 - a * a * f1 ** 4 / (4 * chao1_bc)
    T = chao1_bc - S
    if T > 0:
        Kc = math.exp(1.96 * math.sqrt(math.log(1 + var / T ** 2)))
        ci = (S + T / Kc, S + T * Kc)
    else: ci = (S, S)
else: var, ci = 0.0, (S, S)
gt = f1 / n
# ACE (abundance-based coverage estimator, rare threshold 10)
rare = {k: v for k, v in inc.items() if v <= 10}
n_rare = sum(rare.values()); S_rare = len(rare); S_abund = S - S_rare
C_ace = 1 - f1 / n_rare if n_rare else 1
if C_ace > 0 and n_rare > 1:
    g2 = max(S_rare / C_ace * sum(i * (i - 1) * fk.get(i, 0) for i in range(1, 11)) / (n_rare * (n_rare - 1)) - 1, 0)
    ace = S_abund + S_rare / C_ace + f1 / C_ace * g2
else: ace = float('nan')
print(f'unique cases n={n}; classes S={S}; frequency counts f_k={dict(sorted(fk.items()))}')
print(f'Chao1 classic={chao1_classic:.2f}  bias-corrected={chao1_bc:.2f} (95% log-normal CI {ci[0]:.1f} to {ci[1]:.1f}); Chao2={chao2:.2f}; ACE={ace:.2f}')
print(f'Good-Turing P(next unique case shows an unseen class) ~ f1/n = {gt:.4f}; sample coverage ~ {1 - gt:.4f}')
# power of the stop rule: P(a class of incidence rate p is missed by one round of m cases) = (1-p)^m
last = rows[-1][1]
for c in sorted(inc, key=lambda k: inc[k]):
    p = inc[c] / n
    if inc[c] <= 3: print(f'  class with {inc[c]} unique case(s): rate {p:.4f}; P(missed by one {last}-case round) = {(1 - p) ** last:.2f}')
print(f'one empty round of {last} cases excludes (95%) only classes with rate above {1 - 0.05 ** (1 / last):.4f}')
# expected new classes in the next m cases (Shen, Chao & Lin 2003 extrapolation)
for m in [289, 1000, 1442]:
    f0 = chao1_bc - S
    ext = f0 * (1 - (1 - f1 / (n * f0 + f1)) ** m) if f0 > 0 else 0
    print(f'  expected new classes in the next {m} unique cases (Chao1-bc extrapolation): {ext:.2f}')

# classes already raised by an unmutated seed (baseline covers the 134 seeds of r1/r2)
base = {}
for l in open(os.path.join(OUT, 'baseline-seeds.jsonl')):
    d = json.loads(l); base[d['seed']] = d
seed_classes = set()
for d in base.values():
    for o in d['outcomes']:
        oo = {'client': o['client'], 'hang': o['error'] == 'hang', 'crash': None, 'uncaught': o['uncaught'], 'error': o['error']}
        seed_classes |= set(keys(oo))
seeds_r3 = {d['seed'] for d in cases}
print('seeds drawn in r3 but not in the baseline:', sorted(seeds_r3 - set(base)))
print(f'classes raised by an unmutated seed: {len(seed_classes & set(inc))} of {len(inc)}:', sorted(seed_classes & set(inc)))

with open(os.path.join(OUT, 'class-frequencies-r3.tsv'), 'w') as f:
    f.write('class_key\tunique_cases\trounds_hit\tfirst_case\traised_by_unmutated_seed\n')
    for x, v in sorted(inc.items(), key=lambda t: -t[1]):
        f.write(f"{x}\t{v}\t{','.join(map(str, sorted(rds[x])))}\t{first[x]}\t{'yes' if x in seed_classes else 'no'}\n")
        print(f'   {v:3d}  rounds {sorted(rds[x])}  {x[:100]}')

# ---- root-cause level (classes collapsed to the root causes of the paper's Appendix D; C4 is the stalled-body hang)
ROOT_OF = {"iabloader|internal|Cannot read properties of null (reading 'length')": 'I2',
           "iabloader|internal|Cannot read properties of undefined (reading 'map')": 'I3',
           "iabloader|internal|Cannot read properties of undefined (reading 'documentElement')": 'I1',
           'iabloader|internal|$impl.extensions.extension.map is not a function': 'I4',
           'iabloader|internal|$impl.creatives.creative.forEach is not a function': 'I4',
           'iabloader|internal|$impl.impression.filter is not a function': 'I4',
           "iabloader|internal|Cannot read properties of undefined (reading 'forEach')": 'I4',
           'videoadsdk|unhandled|unhandled rejection: VastChain does not contain a supported vpaid creative': 'C3',
           "videoadsdk|unhandled|unhandled rejection: Failed to execute 'dispatchEvent' on 'EventTarget': parameter N is not of type 'Event'.": 'A1',
           "vastclient|internal|Cannot read properties of undefined (reading 'ad')": 'C2',
           'vastclient|uncaught|URLHandler: Request timed out after N ms (N)': 'C1',
           'vastclient|hang|no result within 30 s': 'C4'}
rinc = collections.Counter()
for d in uniq.values():
    for x in {ROOT_OF[x] for o in d['outcomes'] for x in keys(o)}: rinc[x] += 1
rf = collections.Counter(rinc.values()); r1_, r2_ = rf.get(1, 0), rf.get(2, 0)
rchao = len(rinc) + (n - 1) / n * r1_ * (r1_ - 1) / (2 * (r2_ + 1))
print(f'root causes={len(rinc)} {dict(sorted(rinc.items()))}; f1={r1_} f2={r2_}; Chao1-bc={rchao:.2f}; Good-Turing={r1_ / n:.4f}')
lib = {k: v for k, v in rinc.items() if k != 'A1'}
print(f'library root causes (A1 excluded): {len(lib)}')

# ---- union of the three campaigns (unique (seed, mutations) across r1, r2, r3)
allu = dict(uniq)
for r in ['r1', 'r2']:
    for l in gzip.open(os.path.join(ROOT, f'results/fuzz/fuzz-{r}/cases.jsonl.gz'), 'rt'):
        d = json.loads(l); allu.setdefault(K(d), d)
uinc = collections.Counter()
for d in allu.values():
    for x in {x for o in d['outcomes'] for x in keys(o)}: uinc[x] += 1
uf = collections.Counter(uinc.values()); u1, u2 = uf.get(1, 0), uf.get(2, 0); N = len(allu)
uchao = len(uinc) + (N - 1) / N * u1 * (u1 - 1) / (2 * (u2 + 1))
print(f'r1+r2+r3 union: unique cases={N} classes={len(uinc)} f_k={dict(sorted(uf.items()))} Chao1-bc={uchao:.2f} Good-Turing={u1 / N:.4f}')
seenr = set(); rrows = []
for rd in sorted(by_round):
    new = []
    for d in by_round[rd]:
        for x in sorted({ROOT_OF[x] for o in d['outcomes'] for x in keys(o)}):
            if x not in seenr: seenr.add(x); new.append(x)
    rrows.append((rd, len(new), len(seenr), ','.join(new)))
    print(f'root causes round {rd}: new {len(new)} ({",".join(new) or "-"}), cumulative {len(seenr)}')
seenr = set(); firsts = []
for i, d in enumerate(uniq.values(), 1):
    for x in sorted({ROOT_OF[x] for o in d['outcomes'] for x in keys(o)}):
        if x not in seenr: seenr.add(x); firsts.append(f'{x}@{i}')
print('root-cause first appearance (unique-case index):', firsts)
with open(os.path.join(OUT, 'saturation-r3.tsv'), 'w') as f:
    f.write('round\tcases\tcumulative_unique_cases\tclasses_observed_in_round\tnew_classes\tcumulative_classes\tnew_root_causes\tcumulative_root_causes\troot_causes_added\n')
    for r, rr in zip(rows, rrows): f.write('\t'.join(map(str, r + rr[1:])) + '\n')

# ---- differential recheck: do the r1/r2 differential groups D1-D4 recur in r3 (induced = seed alone gives another pattern)
C = ['vastclient', 'videoadsdk', 'iabloader', 'vastlint']
pat = lambda o: ''.join('1' if o[c]['resolved'] else '0' for c in C)
for fn in ['baseline-seeds.jsonl', 'baseline-seeds-r3-added.jsonl']:
    for l in open(os.path.join(OUT, fn)):
        d = json.loads(l); base[d['seed']] = d
bpat = {s: pat({x['client']: x for x in d['outcomes']}) for s, d in base.items()}
groups = collections.defaultdict(lambda: [0, 0]); dis = ind = 0
for d in uniq.values():
    o = {x['client']: x for x in d['outcomes']}
    if any(o[c]['resolved'] is None for c in C): continue
    p = pat(o)
    if len(set(p)) == 1: continue
    induced = bpat.get(d['seed']) != p
    dis += 1; ind += induced; groups[p][1 if induced else 0] += 1
print(f'r3 unique cases with a resolve disagreement: {dis}; induced: {ind}')
for p_, (a, b) in sorted(groups.items(), key=lambda t: -sum(t[1])): print(f'   {p_} inherited {a:3d} induced {b:3d}')
with open(os.path.join(OUT, 'differential-groups-r3.tsv'), 'w') as f:
    f.write('pattern(vastclient,videoadsdk,iabloader,vastlint)\tinherited_from_seed\tinduced_by_mutation\n')
    for p_, (a, b) in sorted(groups.items(), key=lambda t: -sum(t[1])): f.write(f'{p_}\t{a}\t{b}\n')
