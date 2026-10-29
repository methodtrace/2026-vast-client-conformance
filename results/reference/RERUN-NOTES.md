# Rerun notes (2026-10-21)

## Toolchain

Linux x64, 2 cores, 7 GB; Node.js 22.22.0, npm 10.9.4 (`npm ci` in code/harness); Playwright 1.56.1 with Chromium 141.0.7390.37 (build 1194), Firefox 142.0.1 (build 1495), WebKit 26.0 (build 2215); esbuild 0.25.10; jsdom 26.1.0. Bundles rebuilt (build/build.sh, browser/build-browser.mjs); sha256 identical to the first runs (a43ad105..., 69c8a0a5...). Clients: vast-client 6.5.0, video-ad-sdk 4.0.1, iab-vast-loader 2.5.1 (parser 1.2.1, model 1.0.2), vastlint-client 0.15.0, shaka-player 5.2.12 and 5.3.0, rmp-vast 17.2.0, IMA 3.794.0 (archive sources/ima-html5/2026-10-16).

## Code audit

All A1, D5, D6 items are present in code/harness: M12 present valid values; expectCode every code acceptable; W13 fan-out with one consistent code (G3 conforms; consistent wrong code n/a pointing to E03); exactly once for T01, T04, T16, T21, W14, W15, W18, with T15 at >=1; I01/I03 use iconRendered; G1 only when followsWrappers === false; W23 requires noad.xml; vastlint T17/T18 delegated; P07 has no "declined" n/a when the pod was fetched and 303 reported; X04 graded; IMA I01/I03 graded (I02 stays not drivable); W05 should; E01, E02, W10 cite §3.2.1. regrade.mjs is faithful: with the previous oracles it reproduces every stored verdict (node, node-run2, chromium, chromium-run2, firefox, webkit-local, shaka-5.3.0: 0 changes). Runners store iconRendered, notDrivableKinds and resolvedAds. Comment-only fixes: research-log IDs and version history removed from suite/build-vectors.mjs, browser/ima-adapter.mjs, browser/run-browser.mjs, browser/run-safari.mjs, sweep/run-sweep.mjs, grid/error-grid.mjs, grid/summarize-error-grid.mjs, grid/macro-grid.mjs, gate2.mjs (no behavior change; generated vectors identical).

## Cells changed against results/reference/first-run

Node.js (node and node-run2 identical), 11 cells: W13 videoadsdk deviates -> n/a; X04 all 5 n/a -> conforms; W23 vastlint n/a -> deviates; T17, T18 vastlint conforms -> delegated; P07 iabloader, iabloader+nsap n/a -> deviates. No rerun cell changed.

Chromium (chromium and chromium-run2 identical), 16 cells: W13 videoadsdk deviates -> n/a; X04 all 8 n/a -> conforms; P07 iabloader, iabloader+nsap n/a -> deviates; I01 ima n/a -> deviates (icon view 122 ms before start); I03 ima n/a -> conforms (view 1297 ms after start); reruns: A01 shaka n/a -> deviates; R04, R05 shaka n/a -> conforms.

Firefox: the same 16 (I03 ima 1153 ms after start). WebKit (Linux): the same 16 plus M06, M07 videoadsdk n/a -> deviates (18).

Every change is an expected change of the oracle review, a D5 effect, or a rerun cell. Every row regrades to its stored verdict with the current code; strength columns match requirements.mjs.

## Table 5 (current strengths)

| Configuration | Layer | conforms | must | should | obs. | delegated | n/a |
|---|---|---|---|---|---|---|---|
| vast-client-js | Node.js | 79 | 3 | 2 | 1 | 12 | 11 |
| video-ad-sdk | Node.js | 68 | 13 | 8 | 0 | 0 | 19 |
| iab-vast-loader, defaults | Node.js | 23 | 6 | 1 | 0 | 68 | 10 |
| iab-vast-loader, noSingleAdPods | Node.js | 24 | 5 | 1 | 0 | 68 | 10 |
| vastlint-client | Node.js | 50 | 11 | 9 | 0 | 22 | 16 |
| vast-client-js | Chromium | 79 | 3 | 2 | 1 | 21 | 2 |
| video-ad-sdk | Chromium | 71 | 16 | 9 | 0 | 0 | 12 |
| iab-vast-loader, defaults | Chromium | 24 | 5 | 1 | 0 | 77 | 1 |
| iab-vast-loader, noSingleAdPods | Chromium | 25 | 4 | 1 | 0 | 77 | 1 |
| Shaka 5.2.12 | Chromium | 35 | 21 | 8 | 0 | 0 | 44 |
| Shaka 5.3.0 | Chromium | 44 | 15 | 7 | 0 | 0 | 42 |
| rmp-vast, defaults | Chromium | 80 | 12 | 9 | 1 | 0 | 6 |
| rmp-vast, omidSupport | Chromium | 84 | 11 | 8 | 1 | 0 | 4 |
| IMA | Chromium | 93 | 4 | 4 | 0 | 0 | 7 |

Must total over the 12 open-source rows without Shaka 5.3.0: 110 (38 Node.js, 72 Chromium); range 3 to 21.

## Figure 3 (k/n = deviating / taken on; Chromium, vastlint under Node.js)

| Duty group | vast-client-js | video-ad-sdk | iab-vast-loader | vastlint | Shaka 5.2.12 | rmp-vast | IMA |
|---|---|---|---|---|---|---|---|
| Wrapper resolution | 0/7 | 2/8 | 2/5 | 5/8 | 2/2 | 4/8 | 4/8 |
| Error reporting | 1/13 | 6/17 | 0/6 | 1/3 | 6/8 | 2/18 | 0/18 |
| Impressions and tracking | 0/25 | 5/27 | - | 5/23 | 8/20 | 4/27 | 1/25 |
| Macros | 3/12 | 5/9 | 1/1 | 4/9 | 6/7 | 6/12 | 0/12 |
| Ad pods | 1/2 | 3/3 | 1/2 | 0/2 | 3/5 | 2/6 | 0/6 |
| XML and parsing | 0/17 | 1/17 | 2/9 | 5/16 | 0/13 | 0/17 | 0/16 |
| Media selection | - | 0/2 | - | - | 1/2 | 0/1 | 0/1 |
| Verification and icons | 0/1 | 3/5 | - | 0/1 | 3/3 | 3/5 | 3/7 |
| Robustness observations | 1/8 | 0/8 | 0/7 | 0/8 | 0/4 | 1/8 | 0/8 |

Shaka 5.3.0: 2/2, 6/8, 6/20, 2/9, 2/5, 0/13, 1/2, 3/3, 0/4.

## New deviations needing a finding

- Shaka Player A01 (must), 5.2.12 and 5.3.0: no verificationNotExecuted; the VAST parser reads no AdVerifications. lib/ads/vast_interstitial_parser.js 29-45 (InLine -> Creatives only) and lib/ads/ad_utils.js createTrackingFromInline (5.2.12 lines 44-69, 5.3.0 line 120: Error and Impression only). Not swept.
- vastlint-client W23 (should): the mixed Wrapper plus stand-alone InLine response is classified InLine by inspectDocument (dist/session.js 461, buildHop) and resolution stops as "resolved" (649-651); noad.xml is never requested. Sweep (regraded): all 12 releases 0.4.24 to 0.15.0.
- iab-vast-loader P07 (must, both configurations, into F46): lib/loader.js 58-65 checks only vast.ads.length; the sequenced ads are in adPod, so the loader throws 303 behind a Wrapper. P07 not in the swept catalog.
- IMA I01 (must), Linux Chromium, Firefox, WebKit: icon view requested 122, 88, 367 ms before start (Table 6 row; Mac conforms per the oracle report). Closed source.
- Shaka 5.3.0 M07 (should) deviates with -1: ADSERVINGID not in the macro table (interstitial_ad_session.js 284-295); same requirement as the 5.2.12 finding.
- video-ad-sdk M06, M07 in Linux WebKit now deviate as in the other engines (existing findings; the WebKit n/a was the FLV coupling).

## Firefox and WebKit against Chromium

Rerun cells (A01, A02, A04, R04, R05, M06 to M09): Firefox and WebKit equal Chromium in every cell. IMA I01 deviates and I03 conforms in all three. Overall, Firefox differs from Chromium in 7 cells (S02 rmpvast, rmpvast+omid, ima; W11 videoadsdk, iabloader, iabloader+nsap, ima), WebKit in 4 (S01 videoadsdk; S02 rmpvast, rmpvast+omid, ima), the same engine differences as the first runs minus the WebKit M06/M07 n/a.

## Determinism

node = node-run2 (540) and chromium = chromium-run2 (864) in every verdict; rerun details differ only in three M08 ADPLAYHEAD values.

## jsdom and W11

Pinned jsdom 26.1.0, w_malformed/bad.xml: DOMParser.parseFromString does not throw (application/xml and text/xml). It returns a document whose root is `<parsererror xmlns="http://www.mozilla.org/newlayout/xml/parsererror.xml">2:60: unexpected close tag.</parsererror>` (Firefox form). video-ad-sdk (global DOMParser, jsdom under Node.js) passes it to sane-domparser-error 0.2.0, whose Firefox branch matches the root and throws "Parse error"; requestAd.ts parseVastXml sets code 100, so W11 conforms under Node.js. iab-vast-parser does not use jsdom under Node.js: lib/index.js supplies xmldom 0.1.31, which recovers a VAST document with Ad "x" and no parsererror, so iab-vast-loader resolves an ad and W11 deviates (vastlint likewise resolves "x"). Passing jsdom's DOMParser to iab-vast-parser instead fails differently: parse.js reads documentElement (the parsererror root), finds no parsererror descendant, and the unmarshaler throws 101.
