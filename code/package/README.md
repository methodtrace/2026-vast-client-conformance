# VAST conformance harness package

One command installs a pinned toolchain, runs every test of the VAST conformance harness and seals one results zip.

```
bash run.sh
```

## Two packages: with and without Google IMA

Google's IMA SDK is proprietary. The with-IMA package keeps a private, archived copy of its files only for reproduction, so IMA is optional, and there are two kinds of package. Both are built from the repository with `code/package/make-package.sh`, which is not inside the package.

| | Package without IMA (the default) | Package with IMA (private) |
|---|---|---|
| How it is built | `bash code/package/make-package.sh <outDir> --refs <refsDir>` | the same with `--with-ima` (needs the archive `sources/ima-html5/2026-10-16` in the repository) |
| Zip name | `vast-conformance-harness.zip` | `vast-conformance-harness-with-ima.zip` |
| Contains Google files | no | yes (`sources/ima-html5/`); for private use only, never to be redistributed |
| `bash run.sh` | runs the open-source clients: 5 configurations under Node.js, 7 in each browser | the same: IMA stays off unless you ask for it |
| `bash run.sh --with-ima` | stops at once with a message that the package has no IMA archive | also runs IMA (the eighth browser configuration), answered from the archive |

Both unpack to a folder named `vast-conformance-harness`.

IMA runs only when two things are true: you asked for it (`--with-ima`, or `VASTCONF_WITH_IMA=1` in the environment) and the archive is in the package. If you ask for it and the archive is missing, `run.sh` refuses to start, so a run never quietly lacks the IMA cells you expected. If you do not ask for it, nothing about IMA is run, downloaded or compared.

When IMA is left out, the comparison step (`compare.json` and the printed summary) says so in one line, "IMA skipped (archive not supplied)" when the package has no archive, or "IMA skipped (not requested)" when it has one and you did not ask for it. The missing IMA cells are not listed as failures or as missing results, and the IMA archive hash check is left out too when there is no archive. Everything else is compared as usual. The results of the open-source clients do not depend on whether IMA runs.

The paper's reproduction on macOS (Google Chrome, Safari, WebKit, Firefox and Chromium, and the Node layer) is `bash run.sh --with-ima` from the with-IMA package. The version sweep (`--with-sweep`) and the mutation fuzzer (`--fuzz-hours N`) are **not** part of it: their results come from the build machine (sweep over 36 past releases; fuzzing campaign, 1,442 cases, stop rule met), and both are kept here only so they can be repeated.

## Before the first run: allow Safari to be automated (once per Mac)

Safari is the one browser the package does not download; it is driven by Apple's own `safaridriver`, which is off until you turn it on. Run this once in Terminal (it asks for your Mac password):

```
setopt NO_BANG_HIST
safaridriver --enable
```

During the Safari stage a Safari window with an orange address bar opens and closes about 550 times (one fresh session per test). Do not click in it: Safari puts a glass pane over automated windows, and clicking through it stops the session. Leave the Mac on its desktop and logged in; the script keeps the display awake. If you skip `--enable`, the run continues without Safari and `compare.json` says why.

## What you need

| | |
|---|---|
| Machine | macOS (Apple silicon or Intel) for the full run with Safari; Linux runs everything except Safari. bash, curl, tar, zip (preinstalled on macOS) |
| Free disk | about 1.5 GB used: Node 240 MB and libraries 140 MB inside the package folder, Playwright's browsers 1.0 GB in its cache, results about 25 MB. Keep 4 GB free (the script warns below that). `--with-sweep` adds about 90 MB |
| Network | first run only: nodejs.org (Node 22.22.0, about 50 MB), registry.npmjs.org (about 140 MB unpacked), Playwright's browser CDN (Chromium, Firefox, WebKit, about 1 GB). Nothing during the tests: with `--with-ima`, Google IMA is served from the archived copy in `sources/ima-html5/` and its telemetry beacons are answered locally, never sent |
| Time | 73 minutes on an Apple M5 Pro Mac mini (15 cores, three parallel lanes) with IMA; on fewer than 8 cores the lanes run one after another and take longer |
| Privileges | no sudo; `safaridriver --enable` once (your password); the Mac is kept awake with caffeinate |

To reclaim the space afterwards, delete the package folder and `~/Library/Caches/ms-playwright`.

## What it does

| Stage | What runs | Network |
|---|---|---|
| 01-node | Downloads Node 22.22.0 into `.tools/` and checks it against nodejs.org SHASUMS256 | nodejs.org |
| 02-npm-ci | Installs the exact library versions from `package-lock.json` | registry.npmjs.org |
| 02b-libs | Records the installed library versions and checks that vastlint-client's WebAssembly core loads | none |
| 03-build | Bundles two libraries with esbuild, regenerates the test vectors (Node and browser), builds the browser page with Shaka Player and rmp-vast 17.2.0 | none |
| 04-browsers-install | `npx playwright install chromium firefox webkit` | Playwright CDN |
| 05-env, 05b-safari-env | OS, CPU, Node, npm tree, browser versions, Safari and safaridriver versions, file hashes | none |
| 06-node-suite, 06c-node-suite-2 | 108 requirements x 5 client configurations under Node.js (vast-client-js, video-ad-sdk, iab-vast-loader twice, vastlint-client), twice: run 2 must equal run 1 (determinism) | none |
| 06b-grids | Error grid (Wrapper chains of depth 1 to 7, each failure at each level, 748 cells) and macro grid (every IAB macro, both request-URI forms) through the Node clients | none |
| 07-gate2-iab-samples | Every IAB VAST 4.x sample through each library's top-level load API | none |
| 08-browsers | 108 requirements x 7 configurations (the four Node configurations other than vastlint-client, Shaka Player, rmp-vast, rmp-vast with OMID on), and an eighth, Google IMA, with `--with-ima`, with real `<video>` playback in Chromium, Firefox, WebKit and your Google Chrome, at the same time (`--parallel`) | none |
| 08a-safari-selftest | Tests the Safari driver code against a stand-in driver (no browser), including that its copies of the configurations and the telemetry rule equal the Playwright runner's | none |
| 08b-safari | The same catalog in Safari through safaridriver, one fresh session per test; IMA only with `--with-ima`, and then only if the proxy canary passes | none |
| 09-compare | Compares every matrix and grid with the references in `expected/` and checks file hashes (below) | none |
| 10-disk, 11-seal | Disk use per component; `MANIFEST.sha256` over the results | none |

Stages 06 to 07 (Node layer), 08 (Playwright engines) and 08a/08b (Safari) run as three lanes at the same time when the machine has 8 or more cores; with fewer, the Node layer runs first. `--serial` runs everything one after another.

All test traffic goes to recording servers on 127.0.0.1 (HTTP, and, with `--with-ima`, HTTPS at `localhost` for IMA with the test-only certificate in `code/harness/browser/tls/`). In Safari, IMA's requests for its own scripts go to a small proxy inside the harness that answers them from the archive. Before any IMA cell, the Safari runner opens a session with the `acceptInsecureCerts` and `proxy` capabilities and loads a canary page on unresolvable `*.vastconf.invalid` hosts; IMA runs in Safari only if the canary loads its script, a secure cross-origin frame, a fetch from the page and from the frame, and the archived `ima3.js`. Otherwise IMA is left out of Safari only, the reason is recorded in `browser/safari/summary.json` and `compare.json`, and IMA still runs in the four Playwright browsers. The proxy only answers from the archive or with 204; it never fetches live.

## Safari notes

- Apple allows one Safari WebDriver session at a time, so Safari runs one client run at a time, beside the parallel Playwright engines.
- Each client run gets a new session, which starts from a clean slate like a new Playwright context.
- The runner never blocks in an asynchronous script: it starts each run with a synchronous script and polls every 250 ms up to the 150 s cell limit. A hung cell becomes `harness: cell timeout`, its session is closed and the run continues.
- Clicks inside IMA's cross-origin frame are made with WebDriver frame switching and an element click, falling back to a pointer action.
- Safari does not treat script evaluation as a user gesture, so before each run the runner sends one trusted pointer click. The adapters still retry muted and record `startedMuted`; `compare.json` counts muted starts per engine.
- Popup windows are visited after the run, their URL recorded as the click-through, and closed.
- Not observable under WebDriver: request failures, page errors outside the page's own error hooks, and console calls made before load.

## How results are compared (09-compare, `compare.json`)

| Result | Compared with |
|---|---|
| Node run 1, run 2 | `expected/node/matrix.tsv` (Linux); run 2 also with run 1 |
| chromium, chrome | `expected/browser/chromium-matrix.tsv` (Chromium 141, Linux) |
| firefox | `expected/browser/firefox-matrix.tsv` (Firefox 142, Linux) |
| webkit, safari | `expected/browser/webkit-matrix.tsv` (WebKit 26, Linux) |
| IMA | when IMA ran: its cells are compared like any other configuration. When it did not: one line, "IMA skipped (archive not supplied)" or "IMA skipped (not requested)"; no failure |
| every engine | also the Chromium reference, the Node reference (graded cells) and the macOS reference in the same engine (`expected/macos/`, 99 requirements) |
| grids | `expected/grid/` (error grid as run and as graded; macro grid by outcome class, since sent values such as timestamps differ on every run) |

`expected/README.md` describes every reference file and the toolchain that produced it.

Every comparison is reported per engine and per configuration. Known differences are listed with their reason and still counted; none is hidden. They are:

- video-ad-sdk S01 against the WebKit reference in macOS WebKit and Safari (Linux WebKit reports FLV as playable; macOS does not).
- rmp-vast T05, T06, T07 and T19 (both configurations) in macOS WebKit, against the WebKit and Chromium references (no progress tracker fires in that engine).
- S02 for rmp-vast and IMA where an engine has an AAC decoder and the Chromium reference does not (Google Chrome, Firefox, WebKit, Safari).
- IMA I01 against every reference, in every engine (IMA requests the icon view before the ad starts; how far before varies from run to run, and the 50 ms tolerance falls inside that spread, so the verdict can change between runs).
- W11 where XML parsers differ (Firefox against Chromium; Chromium, Chrome, WebKit and Safari against Node).

Anything else that differs is marked UNEXPLAINED.

## Options

```
bash run.sh --with-ima                     also run Google IMA (package with the archive only; VASTCONF_WITH_IMA=1 does the same)
bash run.sh --browsers chromium,safari     choose engines (chrome = your Google Chrome, safari = system Safari)
bash run.sh --serial                       one engine at a time (slower; use if the parallel run looks flaky)
bash run.sh --only 'W0[1-3]'               subset of requirement ids (skips the grids)
bash run.sh --skip-node --skip-gate2 --skip-grids   browsers only
bash run.sh --skip-browsers                Node layer only (suite, grids, IAB samples)
bash run.sh --with-sweep                   also the version sweep over past releases (downloads them, about 90 MB, about 1 hour; not part of the reproduction run)
bash run.sh --fuzz-hours 1                 also the mutation fuzzer for up to 1 hour (not part of the reproduction run)
VASTCONF_RUN_ROOT=/some/dir bash run.sh    results location (default ~/vast-conformance-runs)
VASTCONF_USE_SYSTEM_NODE=1 bash run.sh     use the Node on PATH instead of the pinned download
```

## Mutation fuzzer

`run.sh --fuzz-hours N` runs `harness/fuzz/fuzz.mjs` with its default PRNG seed (1). The paper's campaign (1,442 cases) used `--seed 20261017`. The stored cases are not part of this zip. With the stored case file, `fuzz.mjs` can re-run them:

```
cd code/harness
node fuzz/fuzz.mjs OUTDIR --replay <cases.jsonl.gz> [--only f00155,f00093 | --first 20] [--clients a,b]
```

Replay rebuilds each mutated document from the campaign seed (default 20261017), checks it against the stored corpus seed name and mutation list, and stops with exit code 2 if any case differs. Without `--replay` the behavior is unchanged.

## Output

`<results root>/run-<stamp>/` and `<results root>/vast-conformance-results-<stamp>.zip` (results root: `VASTCONF_RUN_ROOT`, default `~/vast-conformance-runs`):

- `options.txt` records the options, `with_ima` and whether the archive was present
- `env.json`, `safari-env.txt`: machine, toolchain, versions, file hashes
- `stages.tsv`, `disk.tsv`, `logs/`: per-stage timing, exit codes, disk use and full logs
- `node/`, `node-run2/`, `gate2/`, `grid/`, `browser/<engine>/` (chromium, firefox, webkit, chrome, safari): `results.jsonl` (every cell with its request log, client result, pixels, media events, console and errors) and `matrix.tsv`
- `browser/progress.log`, `browser/summary.json` (Playwright engines), `browser/safari/summary.json` (Safari, including whether IMA ran there)
- `compare.json`: differences from the references (with an `ima` entry saying whether IMA ran or was skipped, and why)
- `MANIFEST.sha256`: hashes of every result file

A stage that fails does not stop later stages; its exit code and log are in the zip.

License: Apache-2.0 for the harness. IAB VAST samples and the IAB macro list in `sources/iab-vast-*` are IAB Tech Lab material under their own licenses. In a package built with `--with-ima`, `sources/ima-html5/` holds Google's proprietary IMA SDK files, archived for reproduction; that package is private and must not be redistributed. The package built without `--with-ima` contains no Google file.
