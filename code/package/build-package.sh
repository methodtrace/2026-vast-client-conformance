#!/usr/bin/env bash
# Builds the one-command harness package (vast-conformance-harness.zip, open-source clients only) from this
# repository: fetches the IAB material, installs and builds the harness, lays out the reference results from
# results/ as the package's expected/ folder, and calls make-package.sh.
# Usage (from anywhere): bash code/package/build-package.sh <outDir>
# Then: unzip <outDir>/vast-conformance-harness.zip; cd vast-conformance-harness; bash run.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="${1:?outDir}"; mkdir -p "$OUT"; OUT="$(cd "$OUT" && pwd)"
H="$ROOT/code/harness"
bash "$ROOT/code/tools/fetch-sources.sh"
( cd "$H" && npm ci --no-audit --no-fund && bash build/build.sh && node suite/build-vectors.mjs && node suite/build-vectors.mjs --browser && node browser/build-browser.mjs )
REFS="$OUT/refs"; rm -rf "$REFS"; mkdir -p "$REFS/node" "$REFS/node-run2" "$REFS/browser" "$REFS/grid" "$REFS/macos"
R="$ROOT/results"
cp "$R/reference/node/matrix.tsv" "$REFS/node/matrix.tsv"
cp "$R/reference/node-run2/matrix.tsv" "$REFS/node-run2/matrix.tsv"
for e in chromium firefox webkit; do cp "$R/reference/$e/matrix.tsv" "$REFS/browser/$e-matrix.tsv"; done
cp "$R/iab-samples/node/summary.json" "$REFS/gate2-summary.json"
cp "$R/grids/error-grid/error-grid.tsv" "$R/grids/error-grid/error-grid-graded.jsonl" "$REFS/grid/"
cp "$R/grids/macro-grid/macro-grid.tsv" "$REFS/grid/"
# macOS same-engine reference: the macOS results as matrices, without the nine requirements graded on other vectors
for e in chromium chrome firefox webkit safari; do
  f="$R/macos/browser/$e/results.jsonl"; [ -f "$f" ] || continue
  node --input-type=module -e "
import fs from 'node:fs';
const SKIP = new Set(['A01','A02','A04','R04','R05','M06','M07','M08','M09']);
const rows = fs.readFileSync(process.argv[1], 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)).filter(r => !SKIP.has(r.id));
const cfgs = [...new Set(rows.map(r => r.config))], ids = [...new Set(rows.map(r => r.id))];
const cell = new Map(rows.map(r => [r.id + '\t' + r.config, r]));
const tsv = ['id\tarea\tstrength\t' + cfgs.join('\t')];
for (const id of ids) { const r0 = cell.get(id + '\t' + cfgs[0]); tsv.push([id, r0.area, r0.strength, ...cfgs.map(c => (cell.get(id + '\t' + c) || {}).verdict)].join('\t')); }
fs.writeFileSync(process.argv[2], tsv.join('\n') + '\n');" "$f" "$REFS/macos/$e-matrix.tsv"
done
cp "$ROOT/code/package/expected-README.md" "$REFS/README.md"
bash "$ROOT/code/package/make-package.sh" "$OUT" --refs "$REFS"
echo "package: $OUT/vast-conformance-harness.zip"
