#!/usr/bin/env bash
# VAST conformance harness: installs everything, runs every test, collects telemetry, seals one results zip.
#
#   bash run.sh                         full run: Node suite twice (5 configurations), Node error and macro grids, IAB
#                                       samples, Chromium, Firefox, WebKit, your Google Chrome if installed, and Safari
#                                       (8 browser configurations); on 8 or more cores the Node layer, the Playwright
#                                       engines and Safari run at the same time
#   bash run.sh --browsers chromium     only some browsers (chromium, firefox, webkit, chrome, safari)
#   bash run.sh --skip-node --skip-gate2 --skip-grids   browsers only
#   bash run.sh --only 'W0[1-3]'        a subset of requirement ids (for a quick check; skips the grids)
#   bash run.sh --serial                run every stage and engine one after another (default: at the same time)
#   bash run.sh --with-ima              also run Google IMA (the ninth configuration). Optional: needs the private IMA
#                                       archive in sources/ima-html5/ (present only in a package built with --with-ima);
#                                       VASTCONF_WITH_IMA=1 does the same. Without it the run uses the open-source clients
#                                       only (7 browser configurations) and the comparison says IMA was skipped
#   bash run.sh --with-sweep            also the version sweep over 36 past library releases (network, about 90 MB;
#                                       not part of the reproduction run)
#   bash run.sh --fuzz-hours 1          also the mutation fuzzer for up to N hours (not part of the reproduction run)
#
# Needs: macOS or Linux, curl, tar, zip, about 1.5 GB free disk (4 GB recommended), network for nodejs.org, registry.npmjs.org and the
# Playwright browser CDN. Installs nothing outside this folder except Playwright's browser cache
# (~/Library/Caches/ms-playwright on macOS). No sudo. Safari needs a one-time `safaridriver --enable` (README).
set -u

PKG="$(cd "$(dirname "$0")" && pwd)"
NODE_VERSION="22.22.0"
STAMP="$(date +%Y%m%dT%H%M%S)"
RUN_ROOT="${VASTCONF_RUN_ROOT:-$HOME/vast-conformance-runs}"
BROWSERS="chromium,firefox,webkit,chrome,safari"
WITH_IMA=0; [ "${VASTCONF_WITH_IMA:-0}" = 1 ] && WITH_IMA=1
SKIP_NODE=0; SKIP_GATE2=0; SKIP_BROWSERS=0; SKIP_GRIDS=0; ONLY=""; SERIAL=0; WITH_SWEEP=0; FUZZ_HOURS=""
ORIG_ARGS=("$@")
while [ $# -gt 0 ]; do
  case "$1" in
    --browsers) BROWSERS="$2"; shift 2 ;;
    --skip-node) SKIP_NODE=1; shift ;;
    --skip-gate2) SKIP_GATE2=1; shift ;;
    --skip-browsers) SKIP_BROWSERS=1; shift ;;
    --skip-grids) SKIP_GRIDS=1; shift ;;
    --only) ONLY="$2"; shift 2 ;;
    --serial) SERIAL=1; shift ;;
    --with-ima) WITH_IMA=1; shift ;;
    --with-sweep) WITH_SWEEP=1; shift ;;
    --fuzz-hours) FUZZ_HOURS="$2"; shift 2 ;;
    *) echo "unknown option: $1"; exit 2 ;;
  esac
done

# IMA is optional. It runs only when asked for (--with-ima or VASTCONF_WITH_IMA=1) and only from the pinned archive.
IMA_DIR="$PKG/sources/ima-html5/2026-10-16"
IMA_ARCHIVE=absent; [ -f "$IMA_DIR/index.tsv" ] && IMA_ARCHIVE=present
if [ $WITH_IMA = 1 ] && [ $IMA_ARCHIVE = absent ]; then
  echo "IMA was requested (--with-ima) but this package has no IMA archive (sources/ima-html5/2026-10-16)."
  echo "Run without --with-ima to use the open-source clients only."
  exit 2
fi

# Keep a Mac awake, display included (Safari runs in a visible window), for the whole run (re-executes once).
if [ -z "${VASTCONF_CAFFEINATED:-}" ] && command -v caffeinate >/dev/null 2>&1; then
  export VASTCONF_CAFFEINATED=1
  exec caffeinate -di bash "$0" ${ORIG_ARGS[@]+"${ORIG_ARGS[@]}"}
fi
# Playwright downloads chromium, firefox and webkit; 'chrome' is the Google Chrome already on this machine (Playwright
# channel); 'safari' is the system Safari, driven by /usr/bin/safaridriver (browser/run-safari.mjs), not Playwright.
PW_BROWSERS=""; PW_LIST=""; SAFARI=0
for b in $(echo "$BROWSERS" | tr ',' ' '); do
  case "$b" in
    safari) SAFARI=1 ;;
    chrome) PW_LIST="${PW_LIST:+$PW_LIST,}$b" ;;
    *) PW_BROWSERS="$PW_BROWSERS $b"; PW_LIST="${PW_LIST:+$PW_LIST,}$b" ;;
  esac
done
if [ $SAFARI = 1 ] && [ "$(uname -s)" != Darwin ]; then echo "Safari needs macOS; leaving it out."; SAFARI=0; fi
[ -n "$ONLY" ] && SKIP_GRIDS=1
# cores: with 8 or more (and no --serial) the Node layer, the Playwright engines and Safari run as three parallel lanes
CORES=${VASTCONF_CORES:-$(getconf _NPROCESSORS_ONLN 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 1)}   # VASTCONF_CORES: override (tests)
LANES=0; [ $SERIAL = 0 ] && [ "${CORES:-1}" -ge 8 ] && LANES=1

RES="$RUN_ROOT/run-$STAMP"
mkdir -p "$RES/logs"
exec > >(tee -a "$RES/logs/run.log") 2>&1
echo "VAST conformance harness run $STAMP"
echo "package: $PKG"
echo "results: $RES"
if [ $WITH_IMA = 1 ]; then echo "IMA: included"; elif [ $IMA_ARCHIVE = absent ]; then echo "IMA skipped (archive not supplied)"; else echo "IMA skipped (not requested; add --with-ima)"; fi
printf 'stage\tstart_epoch\tend_epoch\texit\n' > "$RES/stages.tsv"
printf '%s\n' "browsers=$BROWSERS playwright=$PW_LIST safari=$SAFARI skip_node=$SKIP_NODE skip_gate2=$SKIP_GATE2 skip_grids=$SKIP_GRIDS skip_browsers=$SKIP_BROWSERS only=$ONLY serial=$SERIAL cores=$CORES parallel_lanes=$LANES with_ima=$WITH_IMA ima_archive=$IMA_ARCHIVE with_sweep=$WITH_SWEEP fuzz_hours=$FUZZ_HOURS" > "$RES/options.txt"
# preflight: free disk where the package and the browser cache live (about 1.5 GB is used on a first run)
echo "cores: $CORES; parallel lanes (Node layer, Playwright engines, Safari at once): $([ $LANES = 1 ] && echo yes || echo no)"
FREE_KB=$(df -Pk "$HOME" | awk 'NR==2 {print $4}')
echo "free disk under \$HOME: $((FREE_KB / 1024 / 1024)) GB"
printf 'free_kb_home=%s\n' "$FREE_KB" >> "$RES/options.txt"
if [ "${FREE_KB:-0}" -lt 4000000 ]; then echo "WARNING: less than 4 GB free; the browser download may fail."; fi

stage() {
  local name="$1"; shift
  local start end code
  echo ""; echo "=== $name ($(date +%H:%M:%S))"
  start=$(date +%s)
  ( "$@" ) > "$RES/logs/$name.log" 2>&1
  code=$?
  end=$(date +%s)
  printf '%s\t%s\t%s\t%s\n' "$name" "$start" "$end" "$code" >> "$RES/stages.tsv"
  tail -n 6 "$RES/logs/$name.log" | sed "s/^/    $name | /"
  echo "    $name: exit $code, $((end - start)) s"
  return $code
}

sha256_of() { if command -v shasum >/dev/null 2>&1; then shasum -a 256 "$1" | awk '{print $1}'; else sha256sum "$1" | awk '{print $1}'; fi; }

install_node() {
  if [ "${VASTCONF_USE_SYSTEM_NODE:-0}" = 1 ]; then echo "using system node: $(command -v node) $(node --version)"; return 0; fi
  local os arch name dir
  case "$(uname -s)" in Darwin) os=darwin ;; Linux) os=linux ;; *) echo "unsupported OS $(uname -s)"; return 1 ;; esac
  case "$(uname -m)" in arm64|aarch64) arch=arm64 ;; x86_64) arch=x64 ;; *) echo "unsupported arch $(uname -m)"; return 1 ;; esac
  name="node-v$NODE_VERSION-$os-$arch"
  dir="$PKG/.tools/$name"
  if [ -x "$dir/bin/node" ]; then echo "node already installed: $dir"; return 0; fi
  mkdir -p "$PKG/.tools"
  curl -fsSL -o "$PKG/.tools/$name.tar.gz" "https://nodejs.org/dist/v$NODE_VERSION/$name.tar.gz" || return 1
  curl -fsSL -o "$PKG/.tools/SHASUMS256.txt" "https://nodejs.org/dist/v$NODE_VERSION/SHASUMS256.txt" || return 1
  local want got
  want=$(grep " $name.tar.gz\$" "$PKG/.tools/SHASUMS256.txt" | awk '{print $1}')
  got=$(sha256_of "$PKG/.tools/$name.tar.gz")
  echo "node tarball sha256 expected $want"
  echo "node tarball sha256 got      $got"
  [ -n "$want" ] && [ "$want" = "$got" ] || { echo "CHECKSUM MISMATCH: refusing to use the download"; return 1; }
  tar -xzf "$PKG/.tools/$name.tar.gz" -C "$PKG/.tools" || return 1
  echo "installed $dir"
}

stage 01-node install_node || { echo "Cannot continue without Node."; }
if [ "${VASTCONF_USE_SYSTEM_NODE:-0}" != 1 ]; then
  for d in "$PKG"/.tools/node-v"$NODE_VERSION"-*/bin; do [ -d "$d" ] && export PATH="$d:$PATH"; done
fi
echo "node: $(command -v node) $(node --version 2>/dev/null)"

H="$PKG/code/harness"
# IMA, when requested, runs only from the pinned archive; record mode (live fetches from Google) is never on in a package run.
if [ $WITH_IMA = 1 ]; then export VASTCONF_EXT_ARCHIVE="$IMA_DIR"; else unset VASTCONF_EXT_ARCHIVE; fi
unset VASTCONF_EXT_RECORD
IMA_ARG=""; [ $WITH_IMA = 1 ] && IMA_ARG="--with-ima"
stage 02-npm-ci bash -c "cd '$H' && npm ci --no-audit --no-fund"
# the libraries the suite imports by name, with the versions npm actually installed 
stage 02b-libs bash -c "cd '$H' && node --input-type=module -e \"
import fs from 'node:fs';
for (const p of ['@dailymotion/vast-client', 'video-ad-sdk', 'iab-vast-loader', 'shaka-player', 'vastlint-client', 'vastlint', 'playwright'])
  console.log(p.padEnd(26), JSON.parse(fs.readFileSync('node_modules/' + p + '/package.json', 'utf8')).version);
const v = await import('vastlint-client'); if (typeof v.createVastSession !== 'function') throw new Error('vastlint-client: createVastSession missing');
console.log('vastlint-client imports (WebAssembly core loaded)');\""
stage 03-build bash -c "cd '$H' && bash build/build.sh && node suite/build-vectors.mjs && node suite/build-vectors.mjs --browser && node browser/build-browser.mjs"
if [ $SKIP_BROWSERS = 0 ] && [ "${VASTCONF_SKIP_BROWSER_INSTALL:-0}" != 1 ] && [ -n "$PW_BROWSERS" ]; then
  stage 04-browsers-install bash -c "cd '$H' && npx playwright install $PW_BROWSERS"
fi
stage 05-env node "$PKG/tools/collect-env.mjs" "$PKG" "$RES/env.json"
if [ $SAFARI = 1 ]; then
  stage 05b-safari-env bash -c "printf 'safari_version='; /usr/libexec/PlistBuddy -c 'Print CFBundleShortVersionString' /Applications/Safari.app/Contents/Info.plist 2>&1; printf 'safari_build='; /usr/libexec/PlistBuddy -c 'Print CFBundleVersion' /Applications/Safari.app/Contents/Info.plist 2>&1; printf 'safaridriver='; /usr/bin/safaridriver --version 2>&1; sw_vers"
  cp "$RES/logs/05b-safari-env.log" "$RES/safari-env.txt" 2>/dev/null
fi
# a run with --only writes matrix.partial.tsv; normalize the name for the comparison step
normalize_partial() { [ -f "$1/matrix.partial.tsv" ] && cp "$1/matrix.partial.tsv" "$1/matrix.tsv"; [ -f "$1/results.partial.jsonl" ] && cp "$1/results.partial.jsonl" "$1/results.jsonl"; return 0; }
ONLY_ARG=""; [ -n "$ONLY" ] && ONLY_ARG="'$ONLY'"
# Lane 1, Node layer: the suite twice (run 2 checks determinism on this machine), the grids, the IAB samples
node_lane() {
  if [ $SKIP_NODE = 0 ]; then
    stage 06-node-suite bash -c "cd '$H' && node --no-deprecation suite/run.mjs '$RES/node' $ONLY_ARG"; normalize_partial "$RES/node"
    stage 06c-node-suite-2 bash -c "cd '$H' && node --no-deprecation suite/run.mjs '$RES/node-run2' $ONLY_ARG"; normalize_partial "$RES/node-run2"
  fi
  if [ $SKIP_GRIDS = 0 ]; then
    # Wrapper chains of depth 1 to 7 with each failure at each level, and every IAB macro, in every Node client
    stage 06b-grids bash -c "cd '$H' && node --no-deprecation grid/error-grid.mjs '$RES/grid' && node grid/summarize-error-grid.mjs '$RES/grid/error-grid.jsonl' '$RES/grid' && node --no-deprecation grid/macro-grid.mjs '$RES/grid'"
  fi
  if [ $SKIP_GATE2 = 0 ]; then
    stage 07-gate2-iab-samples bash -c "cd '$H' && node --no-deprecation gate2.mjs '$PKG' '$RES/gate2'"
  fi
}
# Lane 2, Playwright engines (Chromium, Firefox, WebKit, Google Chrome), at the same time unless --serial
pw_lane() {
  [ $SKIP_BROWSERS = 0 ] && [ -n "$PW_LIST" ] || return 0
  stage 08-browsers bash -c "cd '$H' && node --no-deprecation browser/run-browser.mjs --out '$RES/browser' --browsers '$PW_LIST' $( [ $SERIAL = 0 ] && printf -- '--parallel' ) $IMA_ARG $( [ -n "$ONLY" ] && printf -- "--only '%s'" "$ONLY" )"
}
# Lane 3, Safari: the WebDriver code against a fake driver first (no browser, about 1 min), then Safari itself, one
# session at a time (Apple allows one), with the IMA proxy canary before any IMA cell
safari_lane() {
  [ $SKIP_BROWSERS = 0 ] && [ $SAFARI = 1 ] || return 0
  stage 08a-safari-selftest bash -c "cd '$H' && node --no-deprecation browser/webdriver-test.mjs"
  stage 08b-safari bash -c "cd '$H' && node --no-deprecation browser/run-safari.mjs --out '$RES/browser' $IMA_ARG $( [ -n "$ONLY" ] && printf -- "--only '%s'" "$ONLY" )"
}
if [ $LANES = 1 ]; then
  node_lane & NODE_PID=$!
  safari_lane & SA_PID=$!
  pw_lane
  wait "$NODE_PID"; wait "$SA_PID"
elif [ $SERIAL = 1 ]; then
  node_lane; pw_lane; safari_lane
else
  # fewer than 8 cores: the Node layer first (its timeouts are timing-sensitive), then the browsers at the same time
  node_lane
  safari_lane & SA_PID=$!
  pw_lane
  wait "$SA_PID"
fi
if [ $WITH_SWEEP = 1 ]; then
  stage 08c-sweep bash -c "cd '$H' && node --no-deprecation sweep/run-sweep.mjs '$RES/sweep'"
fi
if [ -n "$FUZZ_HOURS" ]; then
  stage 08d-fuzz bash -c "cd '$H' && node --no-deprecation fuzz/fuzz.mjs '$RES/fuzz' --hours '$FUZZ_HOURS'"
fi
stage 09-compare node "$PKG/tools/compare.mjs" "$PKG" "$RES"
cat "$RES/logs/09-compare.log"
disk_usage() {
  local pwc
  if [ "$(uname -s)" = Darwin ]; then pwc="$HOME/Library/Caches/ms-playwright"; else pwc="${PLAYWRIGHT_BROWSERS_PATH:-$HOME/.cache/ms-playwright}"; fi
  printf 'component\tkilobytes\tpath\n'
  for pair in "package:$PKG" "node_runtime:$PKG/.tools" "node_modules:$H/node_modules" "sweep_packages:$H/sweep/pkgs" "playwright_browsers:$pwc" "results:$RES"; do
    local name="${pair%%:*}" path="${pair#*:}"
    if [ -e "$path" ]; then printf '%s\t%s\t%s\n' "$name" "$(du -sk "$path" 2>/dev/null | awk '{print $1}')" "$path"; else printf '%s\t0\t%s (absent)\n' "$name" "$path"; fi
  done
}
stage 10-disk bash -c "$(declare -f disk_usage); PKG='$PKG' H='$H' RES='$RES' disk_usage > '$RES/disk.tsv'; cat '$RES/disk.tsv'"
echo ""; echo "Stage times (seconds):"; awk -F'\t' 'NR>1 {printf "  %-22s %6d  exit %s\n", $1, $3-$2, $4}' "$RES/stages.tsv"
stage 11-seal node "$PKG/tools/seal.mjs" "$RES"
ZIP="$RUN_ROOT/vast-conformance-results-$STAMP.zip"
( cd "$RUN_ROOT" && zip -qr "$ZIP" "run-$STAMP" )
echo ""
echo "DONE. Results zip:"
echo "  $ZIP"
echo "  ($(du -h "$ZIP" | awk '{print $1}'), sha256 $(sha256_of "$ZIP"))"
