#!/usr/bin/env python3
"""Rebuilds the extraction inventory behind the requirement catalog: every line of the VAST 4.3 text, from Section 2.1
(line 464 of the IAB Markdown edition) to the end, that contains must, should, required or may (whole word, any case)
and mentions the player ("player", "players" or "Player Support"). The result is 122 lines.

The specification text is IAB Tech Lab material (CC BY 3.0) and is not redistributed here; fetch it first with
`bash code/tools/fetch-sources.sh`. extraction-inventory.tsv lists the line numbers; this script checks them and
prints each line with its text. coverage-map.md maps every duty in these lines to a requirement or a reason.

Usage (from the repository root): python3 results/catalog/extraction-inventory.py [--check]
"""
import os, re, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SPEC = os.path.join(ROOT, 'sources/iab-vast-spec/VAST4.x/4.3.md')
TSV = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'extraction-inventory.tsv')
FIRST = 464  # Section 2.1, the first compliance section
KW = re.compile(r'\b(must|should|required|may)\b', re.I)
PL = re.compile(r'\bplayers?\b|Player Support', re.I)

if not os.path.isfile(SPEC):
    sys.exit('missing ' + SPEC + ': run bash code/tools/fetch-sources.sh first')
lines = open(SPEC, encoding='utf-8').read().split('\n')
found = [(i + 1, l) for i, l in enumerate(lines) if i + 1 >= FIRST and KW.search(l) and PL.search(l)]
stored = [int(l.split('\t')[0]) for l in open(TSV, encoding='utf-8').read().split('\n')[1:] if l.strip()]
same = [n for n, _ in found] == stored
print(f'inventory: {len(found)} lines; stored list ({len(stored)} lines) {"matches" if same else "DIFFERS"}', file=sys.stderr)
if '--check' not in sys.argv:
    for n, l in found:
        print(f'{n}\t{l.strip()}')
sys.exit(0 if same else 1)
