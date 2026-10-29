#!/usr/bin/env bash
# Fetches the third-party IAB Tech Lab material the harness reads and checks every file against a pinned sha256.
# It is not redistributed in this repository:
#   sources/iab-vast-samples/   IAB Tech Lab VAST_Samples at commit 6a60797f3b17f6d371ebe8ee3f511e9944078073
#                               (75 sample tags; MANIFEST.tsv lists every path with its sha256)
#   sources/iab-vast-spec/      VAST 4.3 specification (VAST4.x at a40ed96), XSDs and the IAB macro list (vast at 99d5d51)
# Usage (from the repository root or anywhere): bash code/tools/fetch-sources.sh
# Needs curl and sha256sum or shasum. Files already present with the right hash are not fetched again.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
RAW=https://raw.githubusercontent.com/InteractiveAdvertisingBureau
if command -v sha256sum >/dev/null 2>&1; then sha() { sha256sum "$1" | cut -d' ' -f1; }; else sha() { shasum -a 256 "$1" | cut -d' ' -f1; }; fi
enc() { printf '%s' "$1" | sed -e 's/ /%20/g'; }
bad=0; got=0; kept=0
fetch() { # fetch <url> <dest> <sha256>
  local url="$1" dst="$2" want="$3"
  if [ -f "$dst" ] && [ "$(sha "$dst")" = "$want" ]; then kept=$((kept+1)); return; fi
  mkdir -p "$(dirname "$dst")"
  curl -fsSL --retry 3 -o "$dst.part" "$url" || { echo "FAILED to fetch $url"; bad=1; rm -f "$dst.part"; return; }
  if [ "$(sha "$dst.part")" != "$want" ]; then echo "HASH MISMATCH: $url"; bad=1; rm -f "$dst.part"; return; fi
  mv "$dst.part" "$dst"; got=$((got+1))
}

# 1. VAST_Samples: every path in the manifest (file paths contain spaces)
S=6a60797f3b17f6d371ebe8ee3f511e9944078073
M="$ROOT/sources/iab-vast-samples/MANIFEST.tsv"
while IFS=$'\t' read -r h p; do
  [ "$h" = sha256 ] && continue
  fetch "$RAW/VAST_Samples/$S/$(enc "$p")" "$ROOT/sources/iab-vast-samples/$p" "$h"
done < "$M"
fetch "$RAW/VAST_Samples/$S/LICENSE" "$ROOT/sources/iab-vast-samples/LICENSE" e4a2b9242d1793b1765c876872a9d1d70084832cfd51c82639d91773150e743f
fetch "$RAW/VAST_Samples/$S/README.md" "$ROOT/sources/iab-vast-samples/README.md" 6ff730e4c7efb294b3ac3b75dba09d168ebb239fac054a55f4194331ad5cc588

# 2. Specification text, XSDs and macro list
D="$ROOT/sources/iab-vast-spec"
fetch "$RAW/VAST4.x/a40ed96/4.3.md" "$D/VAST4.x/4.3.md" 8e3549a0b8e10b7a3778c1978fd446d0e49cbfad7a507aede8df4aa54d8018e0
fetch "$RAW/VAST4.x/a40ed96/4.4.md" "$D/VAST4.x/4.4.md" fa6f0fd7af28e667c747b7fa6d5b7a8b3562da0e1c10f495f5bcf3d283e19275
fetch "$RAW/vast/99d5d51/vast4macros/data/macros-data.json" "$D/vast/vast4macros/data/macros-data.json" f0af90c26ce065cce376a11ea56feb6ddf89a24441c433adc0a64583e36f4f55
fetch "$RAW/vast/99d5d51/vast_4.2.xsd" "$D/vast/vast_4.2.xsd" 4768cdea609af2c80b4503a84eae6ee18cee299316e11816de9eac24598308c2
fetch "$RAW/vast/99d5d51/vast_4.4.xsd" "$D/vast/vast_4.4.xsd" bf6b13a66a1358ff8b93fdf653b2e72927e95c1d2b16dd1afa8e2d507cd3e750
fetch "$RAW/vast/99d5d51/LICENSE" "$D/vast/LICENSE" c124a0756df86fe133b40e21832f0fe3a8e95eaec69aec02c84a80647bfee367

echo "fetch-sources: $got fetched, $kept already present"
[ $bad = 0 ] || { echo "fetch-sources: FAILED (see above)"; exit 1; }
echo "fetch-sources: all files match their pinned sha256"
