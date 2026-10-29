#!/bin/sh
# Repeats the IMA icon-view cell (I01) N times per engine, one isolated run at a time, and tabulates
# view minus start (ms) and the verdict, for finding F85. Works under sh, bash and zsh.
# Usage, from code/harness (repo) or vast-conformance-harness/code/harness (package):
#   VASTCONF_EXT_ARCHIVE=<IMA archive dir> sh repeat-i01.sh <outDir> <N> <engine> [<engine> ...]
# Engines: chromium firefox webkit chrome. Output: <outDir>/<engine>/run-NN/ and <outDir>/i01-repeats.tsv
set -eu
OUT="$1"; N="$2"; shift 2
mkdir -p "$OUT"; OUT="$(cd "$OUT" && pwd)"
TSV="$OUT/i01-repeats.tsv"
[ -f "$TSV" ] || printf 'engine\trun\tview_minus_start_ms\tverdict\tdetail\n' > "$TSV"
for e in "$@"; do
  i=1
  while [ "$i" -le "$N" ]; do
    d="$OUT/$e/run-$(printf '%02d' "$i")"
    rm -rf "$d"; mkdir -p "$d"
    node --no-deprecation browser/run-browser.mjs --out "$d" --browsers "$e" --clients ima --only '^I01$' > "$d/log.txt" 2>&1 || echo "run failed: $e $i (see $d/log.txt)"
    node --input-type=module -e '
import fs from "node:fs";
const [dir, eng, run, tsv] = process.argv.slice(1);
const files = []; const walk = p => { for (const x of fs.readdirSync(p, { withFileTypes: true })) { const q = p + "/" + x.name; x.isDirectory() ? walk(q) : x.name === "results.jsonl" && files.push(q); } }; walk(dir);
let row = null; for (const f of files) for (const l of fs.readFileSync(f, "utf8").split("\n")) { if (!l) continue; const r = JSON.parse(l); if (r.id === "I01" && r.config === "ima") row = r; }
let ms = "", v = "missing", det = "";
if (row) { v = row.verdict; det = row.detail || ""; const t = k => { const h = (row.requests || []).find(s => s.split(" ")[2] === k); return h ? Number(h.split(" ")[0]) : null; }; const a = t("in/icon-view"), b = t("in/start"); if (a !== null && b !== null) ms = String(a - b); }
fs.appendFileSync(tsv, [eng, run, ms, v, det].join("\t") + "\n");
console.log(eng, run, ms, v);' "$d" "$e" "$i" "$TSV"
    i=$((i + 1))
  done
done
echo "table: $TSV"
