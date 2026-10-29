#!/usr/bin/env bash
# Same esbuild inputs as code/harness/build/build.sh, plus --sourcemap, so stacks map to node_modules/<pkg>/src|lib files.
set -euo pipefail
H="$(cd "$(dirname "$0")/../../../../code/harness" && pwd)"; O="$(cd "$(dirname "$0")" && pwd)"
cd "$H/build"
npx esbuild iab-entry.mjs --bundle --platform=node --format=esm --sourcemap --outfile="$O/iab-sm.bundle.mjs" \
  --banner:js="import{createRequire as __cr}from'module';const require=__cr(import.meta.url);" --log-level=warning
npx esbuild vas-entry.mjs --bundle --platform=neutral --main-fields=module,main --format=esm --sourcemap --outfile="$O/vas-sm.bundle.mjs" --log-level=warning
