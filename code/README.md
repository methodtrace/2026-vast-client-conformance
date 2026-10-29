# VAST conformance harness

Runs VAST clients against crafted VAST 4.3 test vectors and the IAB Tech Lab sample tags, records every request each
client makes (Wrapper fetches, impression, tracking and error pixels, verification and icon requests) on a local
recording server, and grades the behavior against the player requirements of the VAST 4.3 specification.

## What is tested

| Client | Version | Layers | How it is driven |
|---|---|---|---|
| @dailymotion/vast-client (vast-client-js) | 6.5.0 | Node.js, browsers | `VASTClient.get()` to load; `VASTTracker` called as its documentation describes to play |
| video-ad-sdk | 4.0.1 | Node.js, browsers | `runWaterfall()`, the integration its README presents, on a `<video>` element |
| iab-vast-loader + iab-vast-parser | 2.5.1 / 1.2.1 | Node.js, browsers | `VASTLoader.load()`, with library defaults and with `noSingleAdPods: true` |
| vastlint-client | 0.15.0 | Node.js | its session and playback-queue controller |
| Shaka Player | 5.2.12 | browsers | its VAST interstitials on a real `<video>` element |
| rmp-vast | 17.2.0 (vendored) | browsers | its own player and controls, with OMID support off and on |
| Google IMA HTML5 SDK | 3.794.0 | browsers | its public API, answered from a private archive of the SDK files (not distributed) |

The requirement catalog (`harness/suite/requirements.mjs`) has 108 requirements: Wrapper resolution, error
reporting, impressions and tracking, macros, XML and parsing, ad pods, media selection, verification and icons, and
robustness observations. Each cites a VAST 4.3 section (or the IAB macro list) and records its strength. Each cell of
the matrix is one of: conforms, deviates, delegated (the library leaves that duty to the integrator), observation,
or n/a.

## Layout

```
harness/
  server.mjs                 recording server; rewrites every URL in a served document to itself
  adapters/                  one adapter per client (load and play), browser-like globals (env.mjs), scripted video
  build/build.sh             esbuild bundles for the two clients Node.js cannot import directly
  browser/                   browser page and runners (Playwright: run-browser.mjs; Safari: run-safari.mjs), IMA adapter
  suite/build-vectors.mjs    generates suite/vectors/ and, with --browser, suite/vectors-browser/ (69 vectors each)
  suite/requirements.mjs     the requirement catalog and oracles
  suite/run.mjs              runs the catalog against every Node.js client configuration
  suite/regrade.mjs          regrades stored results with the current oracles
  grid/                      error grid and macro grid
  fuzz/fuzz.mjs              mutation fuzzer (campaign seed 20261017; replay of stored cases)
  sweep/                     version sweep over past releases (pinned lockfiles in sweep/pkgs/)
  gate2.mjs                  loads every IAB VAST 4.x sample through each client
  lib/samples.mjs            rebuilds the IAB sample tree from its hash manifest
  vendor/rmp-vast-17.2.0/    the rmp-vast release, which npm does not carry
package/                     one-command package (run.sh) and how it is built
tools/                       environment capture, hashes, sealing, comparison, fetch-sources.sh
```

## Reproduce

Requires Node.js 22 (tested with 22.22.0). First fetch the IAB material from the repository root:
`bash code/tools/fetch-sources.sh`.

```bash
cd harness
npm ci
bash build/build.sh
node suite/build-vectors.mjs
node --no-deprecation suite/run.mjs /tmp/vast-node
```

`/tmp/vast-node/matrix.tsv` is the conformance matrix, and `results.jsonl` holds one record per cell with every
request the client made. It equals `results/reference/node/matrix.tsv` byte for byte.

Browsers: `node suite/build-vectors.mjs --browser`, `node browser/build-browser.mjs`, `npx playwright install`, then
`node browser/run-browser.mjs --out /tmp/vast-browser --browsers chromium` (also firefox, webkit). The package in
`package/` runs everything with one command.

## Limits

- Under Node.js, clients run with jsdom globals, not in a browser. Two observations depend on that: a timer-thrown
  exception in vast-client-js terminates a Node.js process but is only a page error in a browser, and
  iab-vast-parser uses the `xmldom` package in Node.js but the native DOMParser in browsers.
- In the Node.js layer, playback uses a scripted `<video>` element whose clock the harness advances; no media is
  decoded. The browser layer plays real media: synthetic clips in `harness/browser/media/` (README there).
- For vast-client-js and vastlint-client, media selection and play-time duties belong to the integrator; the harness
  plays that role as the documentation describes.

## License

Apache License 2.0. The IAB Tech Lab sample tags and specification text are not part of this repository; they are
fetched by `tools/fetch-sources.sh`.
