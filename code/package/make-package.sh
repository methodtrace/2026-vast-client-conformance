#!/usr/bin/env bash
# Assembles the self-contained VAST conformance harness package from this repository.
# Usage: bash code/package/make-package.sh <outDir> --refs <refsDir> [--no-zip] [--with-ima]
#   run from anywhere; needs a built harness (build/dist, browser/dist, suite/vectors*) for expected/file-hashes.json
#   --refs DIR  the reference results, laid out as the package's expected/ folder (README.md there):
#                 node/matrix.tsv, node-run2/matrix.tsv
#                 browser/chromium-matrix.tsv, browser/firefox-matrix.tsv, browser/webkit-matrix.tsv
#                 macos/<engine>-matrix.tsv (optional; chromium, chrome, firefox, webkit, safari)
#                 gate2-summary.json, grid/error-grid.tsv, grid/error-grid-graded.jsonl, grid/macro-grid.tsv
#   --no-zip    assemble and hash the tree only (dry run); the zip is not written
#   --with-ima  also ship the Google IMA archive (sources/ima-html5/2026-10-16, which must exist in the repository) so
#               the package can run IMA with `run.sh --with-ima`. Without it the package holds the open-source clients
#               only, is named vast-conformance-harness.zip, and contains no Google file. The with-IMA package is for
#               private reproduction only and must never be redistributed.
# expected/SOURCES.tsv records the sha256 of every reference file.
set -euo pipefail
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="${1:?outDir}"
shift
NOZIP=0; WITH_IMA=0; REFS=""
while [ $# -gt 0 ]; do
  case "$1" in
    --no-zip) NOZIP=1; shift ;;
    --with-ima) WITH_IMA=1; shift ;;
    --refs) REFS="${2:?--refs needs a directory}"; shift 2 ;;
    *) echo "unknown option: $1"; exit 2 ;;
  esac
done
[ -n "$REFS" ] || { echo "--refs <refsDir> is required"; exit 2; }
REFS="$(cd "$REFS" && pwd)"
NAME="vast-conformance-harness"
P="$OUT/$NAME"
IMA_ARCHIVE="sources/ima-html5/2026-10-16"
ZIP_NAME="$NAME.zip"; [ $WITH_IMA = 1 ] && ZIP_NAME="$NAME-with-ima.zip"
need() { [ -e "$REPO/$1" ] || { echo "missing: $1"; exit 1; }; }
needref() { [ -f "$REFS/$1" ] || { echo "missing reference: $REFS/$1"; exit 1; }; }
for f in code/harness/build/dist code/harness/browser/dist/vastconf-browser.js code/harness/browser/dist/rmp-vast.js code/harness/suite/vectors code/harness/suite/vectors-browser \
  code/harness/browser/tls/cert.pem code/harness/browser/run-safari.mjs code/harness/browser/webdriver.mjs code/harness/browser/webdriver-proxy.mjs code/harness/browser/webdriver-test.mjs \
  sources/iab-vast-samples sources/iab-vast-spec/vast/vast4macros/data/macros-data.json; do need "$f"; done
REF_FILES="node/matrix.tsv node-run2/matrix.tsv browser/chromium-matrix.tsv browser/firefox-matrix.tsv browser/webkit-matrix.tsv gate2-summary.json grid/error-grid.tsv grid/error-grid-graded.jsonl grid/macro-grid.tsv"
for f in $REF_FILES; do needref "$f"; done
if [ $WITH_IMA = 1 ]; then need "$IMA_ARCHIVE/index.tsv"; fi

rm -rf "$P"; mkdir -p "$P/code" "$P/sources/iab-vast-spec/vast/vast4macros/data" "$P/expected"
# harness sources (the sweep's past releases and all build outputs are rebuilt on the target machine; the tools that
# regrade stored results are repository maintenance and not needed for a run)
( cd "$REPO/code" && tar -cf - --exclude node_modules --exclude scratch --exclude 'harness/build/dist' --exclude 'harness/browser/dist' \
  --exclude 'harness/suite/vectors' --exclude 'harness/suite/vectors-browser' --exclude 'harness/sweep/pkgs' \
  --exclude 'harness/suite/regrade.mjs' --exclude 'harness/suite/merge-rerun.mjs' harness ) | ( cd "$P/code" && tar -xf - )
cp -R "$REPO/code/tools" "$P/tools"
# package-side tools replace the repository's (compare: every engine, Safari, grids, IMA archive hashes)
cp "$REPO/code/package/tools/"*.mjs "$P/tools/"
cp -R "$REPO/sources/iab-vast-samples" "$P/sources/"
# the macro grid reads the IAB macro list; the fuzzer seeds from the IAB samples (above)
cp "$REPO/sources/iab-vast-spec/vast/vast4macros/data/macros-data.json" "$P/sources/iab-vast-spec/vast/vast4macros/data/"
[ -f "$REPO/sources/iab-vast-spec/vast/LICENSE" ] && cp "$REPO/sources/iab-vast-spec/vast/LICENSE" "$P/sources/iab-vast-spec/vast/LICENSE"
# the pinned Google IMA SDK files (proprietary; private package only, never a public release), shipped only with
# --with-ima: the index and the recorded files, with a short README of the package's own
if [ $WITH_IMA = 1 ]; then
  D="$P/$IMA_ARCHIVE"; mkdir -p "$D"
  ( cd "$REPO/$IMA_ARCHIVE" && for f in *; do [ "$f" = README.md ] || cp -R "$f" "$D/"; done )
  cat > "$D/README.md" <<'EOF'
# Google IMA HTML5 SDK 3.794.0 (archived 2026-10-16)

The files the IMA SDK loads while playing the harness's browser vectors, recorded in Chromium 141 on Linux and replayed
by the browser runners when VASTCONF_EXT_ARCHIVE points here. index.tsv lists url, sha256, HTTP status, content type
and file. The publisher-configuration request (securepubads.g.doubleclick.net/pagead/ima_ppub_config) is keyed without
its query, which carries the test page URL. Google telemetry beacons and ad-traffic-quality pings are answered locally
with 204 and never sent; they are not archived.

ima3.js is a loader: it loads a versioned bridge frame and fetches a publisher configuration that carries
server-assigned experiment state. Replaying these files fixes the SDK version and the configuration.

Proprietary Google software, kept for private reproduction under the IMA SDK terms. Do not redistribute.
EOF
fi
cp "$REPO/code/package/run.sh" "$REPO/code/package/README.md" "$P/"
cp "$REPO/code/LICENSE" "$P/LICENSE"
# reference results
( cd "$REFS" && for f in $REF_FILES; do mkdir -p "$P/expected/$(dirname "$f")"; cp "$f" "$P/expected/$f"; done )
for e in chromium chrome firefox webkit safari; do
  if [ -f "$REFS/macos/$e-matrix.tsv" ]; then mkdir -p "$P/expected/macos"; cp "$REFS/macos/$e-matrix.tsv" "$P/expected/macos/"; fi
done
[ -f "$REFS/README.md" ] && cp "$REFS/README.md" "$P/expected/README.md"
# reference hashes of the built bundles, vectors, media and the IMA archive, from the repository's own build
VASTCONF_PKG_IMA=$WITH_IMA node --input-type=module -e "
import { hashTree } from '$REPO/code/tools/hashes.mjs';
import fs from 'node:fs';
const H = 'code/harness';
const ref = {
  builtBundles: hashTree('$REPO', [H + '/build/dist', H + '/browser/dist']),
  vectors: hashTree('$REPO', [H + '/suite/vectors', H + '/suite/vectors-browser']),
  media: hashTree('$REPO', [H + '/browser/media']),
  ...(process.env.VASTCONF_PKG_IMA === '1' ? { imaArchive: hashTree('$P', ['sources/ima-html5']) } : {}),
};
fs.writeFileSync('$P/expected/file-hashes.json', JSON.stringify(ref, null, 1));
"
# the sha256 of every reference file
{ printf 'expected\tsha256\n'
  ( cd "$P/expected" && find . -type f ! -name SOURCES.tsv ! -name file-hashes.json ! -name README.md | sed 's|^\./||' | LC_ALL=C sort | while read -r f; do
    printf '%s\t%s\n' "$f" "$(sha256sum "$f" | cut -d' ' -f1)"; done )
} > "$P/expected/SOURCES.tsv"
# record what the package contains
( cd "$P" && find . -type f ! -name PACKAGE.sha256 | LC_ALL=C sort | while read -r f; do sha256sum "$f"; done > PACKAGE.sha256 )
echo "IMA archive: $([ $WITH_IMA = 1 ] && echo 'included (run.sh --with-ima runs IMA)' || echo 'not included (open-source clients only)')"
echo "tree: $P ($(du -sh "$P" | cut -f1), $(find "$P" -type f | wc -l | tr -d ' ') files)"
if [ $NOZIP = 1 ]; then echo "dry run: no zip written"; exit 0; fi
( cd "$OUT" && rm -f "$ZIP_NAME" && zip -qrX "$ZIP_NAME" "$NAME" )
echo "package: $OUT/$ZIP_NAME ($(du -h "$OUT/$ZIP_NAME" | cut -f1), $(stat -c %s "$OUT/$ZIP_NAME") bytes) sha256 $(sha256sum "$OUT/$ZIP_NAME" | cut -d' ' -f1)"
