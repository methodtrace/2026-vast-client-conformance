#!/usr/bin/env bash
# Bundles the two clients that cannot be imported by Node directly. Inputs are pinned in package-lock.json.
set -euo pipefail
cd "$(dirname "$0")"
npx esbuild iab-entry.mjs --bundle --platform=node --format=esm --outfile=dist/iab-vast-loader.bundle.mjs \
  --banner:js="import{createRequire as __cr}from'module';const require=__cr(import.meta.url);" --log-level=warning
npx esbuild vas-entry.mjs --bundle --platform=neutral --main-fields=module,main --format=esm --outfile=dist/video-ad-sdk.bundle.mjs --log-level=warning
if command -v shasum >/dev/null 2>&1; then shasum -a 256 dist/*.mjs; else sha256sum dist/*.mjs; fi
