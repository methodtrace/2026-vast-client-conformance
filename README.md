# Do Open-Source Video Ad Clients Follow VAST 4.3? An Empirical Study of Player Conformance

Replication package for the paper by **Prashant Chaudhary** (ORCID [0009-0001-1980-109X](https://orcid.org/0009-0001-1980-109X)).

## Identifiers

- Cite this version (1.0.0): https://doi.org/10.5281/zenodo.23581408
- All versions: https://doi.org/10.5281/zenodo.23581407
- Preprint: forthcoming on arXiv
- Published version: not yet accepted
- Repository: https://github.com/methodtrace/2026-vast-client-conformance, tag `v1.0.0`
- Browsable tables (Online Resources 1 to 5): https://methodtrace.github.io/2026-vast-client-conformance

## The study

Video ads in streaming and connected-TV apps are delivered through VAST documents, and every party in the ad chain
counts an ad by the HTTP requests the player's client library sends. This study measures how far open-source VAST
clients meet the player duties of VAST 4.3. A catalog of 108 requirements, each tied to the sentence of the
specification it rests on, is graded from the requests a recording server logs while each client loads or plays
69 crafted test vectors and the IAB Tech Lab sample tags.

Clients tested: @dailymotion/vast-client (vast-client-js) 6.5.0, video-ad-sdk 4.0.1, iab-vast-loader 2.5.1 (with
library defaults and with `noSingleAdPods`), vastlint-client 0.15.0, Shaka Player 5.2.12 (and 5.3.0), rmp-vast 17.2.0
(with and without OMID support), and Google's IMA HTML5 SDK 3.794.0 as a closed comparison. Layers: Node.js 22, and
Chromium, Firefox and WebKit through Playwright on Linux and macOS, plus Google Chrome and Safari on macOS. Error and
macro grids, a mutation-fuzzing campaign and a sweep over 36 past releases extend the catalog.

## Layout

| Path | What it holds |
|---|---|
| `code/harness/` | The harness: recording server, one adapter per client, the requirement catalog and oracles (`suite/requirements.mjs`), the vector generator, browser runners, grids, fuzzer and version sweep. `code/README.md` describes it. |
| `code/harness/suite/vectors/`, `vectors-browser/` | The generated test vectors (69 each), shipped so they can be read without running anything; the generator rebuilds them byte for byte. |
| `code/package/` | The one-command package: `run.sh` installs a pinned toolchain, runs every layer and seals the results; `make-package.sh` and `build-package.sh` build it from this repository. |
| `code/tools/` | Environment capture, hashing, sealing, comparison, and `fetch-sources.sh` for the third-party IAB material. |
| `results/reference/` | Reference results on Linux: Node.js (two runs), Chromium (two runs), Firefox and WebKit, 108 requirements each. `first-run/` holds the runs these were regraded from, with the error and macro grid and fuzzing references of that date. |
| `results/macos/` | The macOS run of the release package (Apple silicon Mac mini, M5 Pro: Chromium, Google Chrome, Firefox, WebKit, Safari, the Node.js layer and the grids), sealed as the package produced it. |
| `results/shaka-5.3.0/` | Shaka Player 5.3.0 in Chromium (Online Resource 3), with an independent first run. |
| `results/version-sweep/` | The Node.js sweep over 36 releases of four clients (regraded; `as-run/` holds the run, `rerun-2026-10-21/` the cells rerun after two harness corrections). |
| `results/grids/` | Error grid (Wrapper chains of depth 1 to 7, every failure at every level) and macro grid (every IAB macro, both request-URI forms). |
| `results/fuzz/` | Mutation fuzzing: campaign 3 (`fuzz-r3/`, the one the paper reports: 1,442 cases, seed 20261017), campaigns 1 and 2, and the analysis files (classes with root causes, saturation, differential groups, replays). |
| `results/iab-samples/`, `results/ima-probes/`, `results/webkit-second-machine/`, `results/survey/` | The IAB sample check per client, the three IMA probe vectors with their runs, a WebKit run on a second Linux machine, and the npm survey data behind the client selection. |
| `results/catalog/` | The coverage map (every VAST 4.3 player duty mapped to requirements or to a reason it is not tested) and the extraction inventory (the 122 obligation lines the catalog was built from; `extraction-inventory.py` rebuilds it from the specification). |
| `evidence/checks/` | Standalone reproductions outside the harness: one folder or script per fuzzing root cause, the vast-client-js timeout crash (`r01-crash/`), two independent checks of the deviations, and the XSD validation of the vectors. |
| `online-resources/` | Online Resources 1 to 5 as Markdown. |
| `docs/` | The same Online Resources as HTML pages with CSV downloads, served by GitHub Pages. |
| `sources/` | Hash manifests only: the IAB sample tags (fetched by `code/tools/fetch-sources.sh`) and the archived IMA files (not distributed). |

Paths inside the results are relative to the repository root.

## How to run

Requirements: Node.js 22 (tested with 22.22.0), npm, bash, curl. Network for the first install only.

Fetch the IAB material (sample tags, specification text, XSDs and macro list; every file is checked against a pinned
sha256):

```
bash code/tools/fetch-sources.sh
```

Run the Node.js layer and compare it with the reference:

```
cd code/harness
npm ci
bash build/build.sh
node suite/build-vectors.mjs
node --no-deprecation suite/run.mjs /tmp/vast-node
cmp /tmp/vast-node/matrix.tsv ../../results/reference/node/matrix.tsv && echo "identical to the reference"
```

A full Node.js run takes about 6 to 25 minutes, because each cell runs in its own process.

Run every layer (Node.js, the grids, the IAB samples, and every installed browser) with the one-command package:

```
bash code/package/build-package.sh /tmp/vast-package
cd /tmp/vast-package && unzip -q vast-conformance-harness.zip && cd vast-conformance-harness
bash run.sh
```

`run.sh` downloads Node.js 22.22.0, the pinned libraries and Playwright's browsers, runs every stage and writes one
results zip with a `compare.json` that lists every difference from the references and the known reasons. On macOS it
also drives Safari (after `safaridriver --enable` once). On the author's Mac (Apple M5 Pro, 15 cores) the full run took 73 minutes.
`code/package/README.md` lists the stages, options and output.

Google IMA runs only from a private archive of the SDK files, which is proprietary and not distributed. Without it the
package runs every open-source client; `sources/ima-html5/2026-10-16/index.tsv` gives the URL and sha256 of each
archived file.

The fuzzing campaign can be replayed case by case from the stored corpus:

```
cd code/harness
node fuzz/fuzz.mjs /tmp/vast-fuzz --replay ../../results/fuzz/fuzz-r3/cases.jsonl.gz --first 20
```

## Licenses

- Code: Apache License 2.0 (`LICENSE`).
- Data (results, test vectors, synthetic test media, Online Resources): CC BY 4.0 (`LICENSE-DATA`).
- Third-party material keeps its own terms and is not redistributed: the IAB Tech Lab specification, XSDs, macro list
  and sample tags (fetched by script) and the Google IMA SDK (hashes only). rmp-vast 17.2.0 is vendored under its MIT
  license (`code/harness/vendor/rmp-vast-17.2.0/LICENSE`).

## How to cite

Cite the paper, and this package through its DOI (`CITATION.cff`):

> Prashant Chaudhary. Do Open-Source Video Ad Clients Follow VAST 4.3? An Empirical Study of Player Conformance.
> Harness, test vectors and results. Zenodo, 2026. https://doi.org/10.5281/zenodo.23581408

```bibtex
@software{chaudhary2026vastconformance,
  author    = {Chaudhary, Prashant},
  title     = {Do Open-Source Video Ad Clients Follow {VAST} 4.3? An Empirical Study of Player Conformance: harness, test vectors and results},
  year      = {2026},
  publisher = {Zenodo},
  doi       = {10.5281/zenodo.23581408},
  url       = {https://doi.org/10.5281/zenodo.23581408}
}
```
