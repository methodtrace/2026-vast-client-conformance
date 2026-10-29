#!/usr/bin/env bash
# Builds the patched vast-client used by the stalled-body reproduction: a copy of the installed
# @dailymotion/vast-client 6.5.0 (code/harness/node_modules, after npm ci) with vast-client-6.5.0-fix.patch applied
# (src/fetcher/url_handler.js, the same change by hand in dist/vast-client-node.js, and the new tests in
# spec/fetcher.spec.js). Output: evidence/checks/fuzz-repros/vc-hang/patched/vast-client-6.5.0-fix/
# Usage: bash evidence/checks/fuzz-repros/vc-hang/make-patched.sh
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../../../.." && pwd)"
SRC="$ROOT/code/harness/node_modules/@dailymotion/vast-client"
OUT="$HERE/patched/vast-client-6.5.0-fix"
[ -f "$SRC/package.json" ] || { echo "run npm ci in code/harness first"; exit 1; }
grep -q '"version": "6.5.0"' "$SRC/package.json" || { echo "expected @dailymotion/vast-client 6.5.0 in $SRC"; exit 1; }
rm -rf "$OUT"; mkdir -p "$(dirname "$OUT")"; cp -R "$SRC" "$OUT"
( cd "$OUT" && patch -p1 --forward --quiet < "$HERE/vast-client-6.5.0-fix.patch" )
echo "patched copy: $OUT"
echo "use it with: MODULE=$OUT/dist/vast-client-node.js node evidence/checks/fuzz-repros/vastclient-hang-timeline.mjs evidence/checks/fuzz-repros/vc-hang/wloop 2000"
