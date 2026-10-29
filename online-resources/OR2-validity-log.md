# Online Resource 2: Validity checks

Online Resource 2 to "Do Open-Source Video Ad Clients Follow VAST 4.3? An Empirical Study of Player Conformance" (Prashant Chaudhary, October 2026). Section 4.6 of the paper lists eight checks: five that rest on deterministic evidence a reader can verify (Table 4) and three automated consistency audits run by separate automated reviewers (Table 4b). This document describes each check in the same order: the procedure, the inputs, the scope, the outcome as the paper gives it, and the paths of the evidence in the replication package. It also describes the mutation-fuzzing campaign (Section 4.4 of the paper) as a method, with its seed and its replay option. Paths are relative to the root of the replication repository.

## 1. Checks on deterministic evidence (Table 4)

### 1.1 Source tracing

- Procedure: each deviating cell of an open-source client is traced to the source line in the tested release that produces it. For a duty the client never implements, the trace is the absence of any code that reads the relevant element, stated with the search that shows it. Cells with one cause form one finding.
- Inputs: the client source of each tested release: vast-client-js 6.5.0 `src/`, video-ad-sdk 4.0.1 `dist/` (the code that ran), iab-vast-loader 2.5.1 and iab-vast-parser 1.2.1 `lib/`, vastlint-client 0.15.0 `dist/`, Shaka Player 5.2.12 `lib/ads/`, rmp-vast 17.2.0 `src/js/` at commit 5975ead.
- Scope: every deviation of an open-source client. IMA is closed source and is analyzed as a black box (Online Resource 4).
- Outcome: every finding is located (Appendix B of the paper).
- Evidence: Appendix B of the paper; the tested releases, pinned in code/harness/package-lock.json and installed under code/harness/node_modules by `npm ci` (the replication package does not include node_modules).

### 1.2 Standalone reproduction

- Procedure: each robustness root cause is reproduced by a script outside the harness (for R01: fresh installs, a standalone server and one process per scenario). Every failure class was reproduced three times from its first example, attributed to a source line by a separate script that calls the library directly, and reduced to a minimal document.
- Inputs: one script per defect, with its minimal document.
- Scope: every robustness root cause (C1 to C9, Appendix D of the paper).
- Outcome: each reproduced 3 of 3 times. For the vast-client-js timeout exception (R01), the standalone reproduction gives 49 of 49 fault runs ending with exit code 1 and 0 of 21 control runs.
- Evidence: evidence/checks/fuzz-repros/ (one directory or script per root cause, for example vc-hang/, vc-timeout-r01/, vc-no-inline/, vas-icon-event-artifact/, vas-vpaid-unhandled/, iab-nonxml-body/, iab-empty-body/, iab-nonvast-root/, iab-valid-repeats/, iab-case-names/); evidence/checks/r01-crash/ (README.md, run.mjs, server.mjs, minimal-repro.mjs, results/); results/fuzz/analysis/classes-verified.tsv (one row per class with root cause, source location, trigger and the 3 of 3 reproduction result).

### 1.3 Driver audits

- Procedure: before a script's results are graded, its request log is read against the library's documented integration, to confirm that the script drives the library the way its documentation shows and that the log contains what the script meant to send.
- Inputs: each script's request log and each library's documentation and code.
- Scope: every script and every library.
- Outcome: 8 harness issues resolved.
- Evidence: the drivers in code/harness/adapters/ and code/harness/browser/; the request log of every cell in `results.jsonl` (field `requests`) under results/reference/first-run/, for example results/reference/first-run/node/results.jsonl and results/reference/first-run/chromium/results.jsonl.

### 1.4 Determinism

- Procedure: the same matrices and grids are run more than once, and on two platforms, and the cell verdicts are compared.
- Inputs: the packaged harness at one version, run on the Linux build machine (Node.js 22.22.0; Chromium 141, Firefox 142 and WebKit 26 through Playwright) and on the author's Apple silicon Mac mini (macOS 27.0.1; Chromium, Google Chrome 156, Firefox, WebKit and Safari 27.0.1).
- Scope: the Node.js matrix (540 cells) in four runs on two platforms; the full Chromium matrix (864 cells) in two runs; WebKit on two Linux machines (792 cells: one of the two runs graded A01, A02, A04, R04, R05 and M06 to M09 on different vectors, so those nine requirements are left out); the error grid (748 cells) and the macro grid (580 cells) on both platforms.
- Outcome: identical verdicts across repeated runs, except IMA's I01. The differences between platforms and browsers are those of the paper's Table 6 (Section 5.2).
- Evidence: results/reference/first-run/README.md (what each reference directory holds); results/reference/first-run/node/ and node-run2/; results/reference/first-run/chromium/ and chromium-run2/; results/reference/first-run/firefox/; results/reference/first-run/webkit-local/ and results/webkit-second-machine/; results/grids/error-grid/ (error grid) and results/grids/macro-grid/; results/macos/ (the Mac run: MANIFEST.sha256, compare.json, logs/, node/, node-run2/, browser/, grid/); each matrix run directory holds `matrix.tsv` and `results.jsonl`, and each grid directory its grid files.

### 1.5 Access check

- Procedure: each client's own top-level load call is given each of the 49 IAB VAST 4.x sample tags and the result is recorded. For rmp-vast, which loads and starts an ad in a page, the check records whether an ad starts and whether it plays to completion.
- Inputs: the 49 IAB VAST 4.x sample tags (fetched by script; third-party material).
- Scope: the five open-source clients that load tags.
- Outcome: vast-client-js, video-ad-sdk and vastlint-client resolve an InLine ad from all 49 samples. rmp-vast starts an ad for all 49 (46 play to completion; the other three are overlays, which have no completion event). iab-vast-loader resolves 37 with defaults and 43 with `noSingleAdPods`; the six it rejects in both configurations repeat UniversalAdId or ClosedCaptionFile, and the six it rejects only with defaults are the Wrapper samples (Section 5.1.3 of the paper). Each client resolves every sample except those its findings predict.
- Evidence: results/iab-samples/node/summary.json and results.jsonl (Node.js clients); results/iab-samples/more-clients/ (summary.json, node/, rmpvast-chromium/, runner/); results/macos/gate2/ (the same check on the second platform); the packaged stage 07-gate2-iab-samples (code/package/README.md).

## 2. Automated consistency audits (Table 4b)

Each audit was run by a separate automated reviewer, started from the environment that built and ran the harness. They are not human reviewers. Each reviewer was given only the inputs listed below and had no access to the study's reasoning. "Independent" therefore means that the reviewer did not see the author's reasoning (and, in audits 2.1 and 2.2, the results or findings); it does not mean a different tool or a different person. The audits are not evidence of inter-rater reliability. The verdicts rest on the evidence of Section 1.

### 2.1 Catalog review

- Procedure: the reviewer reviewed each requirement for its claim, strength, vector and oracle against the specification text.
- Inputs: the VAST specification text, the vectors, the oracles and the drivers. No results.
- Scope: every requirement then in the catalog.
- Outcome: 8 verdict-affecting issues and 16 wording issues, all resolved.
- Evidence: the audited artifacts as released: code/harness/suite/requirements.mjs (claims, strengths, oracles), code/harness/suite/vectors/ and build-vectors.mjs, and the drivers (code/harness/adapters/, code/harness/browser/). Online Resource 5 gives the specification sentence behind every requirement.

### 2.2 Re-derivation, two clients

- Procedure: the reviewer rebuilt three deviations of video-ad-sdk and vast-client-js from the installed source, with its own scripts.
- Inputs: three neutral questions and the installed library source (the releases pinned in code/harness/package-lock.json). It was not given the findings.
- Scope: 3 deviations: P01 (the pod comparator), T07 (the percentage progress offset) and R01 (the error thrown in a timer callback).
- Outcome: 3 of 3 confirmed. P01: the pod comparator returns 0 for every pair. T07: the percentage offset is computed once from a NaN duration. R01: the error thrown in a timer callback cannot be reached by the caller, and Node.js exits with code 1.
- Evidence: evidence/checks/independent-2026-10-09/q1q2.mjs (P01 comparator and T07 progress handler, on copies of the library functions), q2.mjs (T07) and q3.cjs (R01, with a stubbed `fetch`).

### 2.3 Re-derivation, three clients

- Procedure: the reviewer rebuilt the deviations of the three clients one item at a time and gave each a verdict (confirmed, harness issue, borderline), together with whether the reading of the specification was right. For vastlint-client and rmp-vast it worked from the client code and standalone scripts. For IMA it worked from the requests the server logged and the events of IMA's public API, and it also cited character offsets in the archived SDK bridge file; those excerpts are not distributed, and no verdict or finding of the paper rests on them.
- Inputs: the result matrices of the three clients (the IMA skip and click items were excluded), the client code of vastlint-client and rmp-vast, the archived IMA files, and standalone scripts. It was not given the author's reasoning.
- Scope: 46 deviating cells of vastlint-client, rmp-vast and IMA, and 2 claims (the `&amp;` handling in VASTAdTagURI for vastlint-client, and the "delegated" status of its load errors).
- Outcome: 40 cells confirmed, 4 harness issues resolved, 2 borderline (reported as such in the paper); both claims confirmed. The paper's findings for IMA rest only on the requests the server logged and the events of IMA's public API (Online Resource 4).
- Evidence: evidence/checks/independent-2026-10-16/REPORT.md (the table of items with verdicts and evidence); its scripts and outputs in vastlint/ and rmpvast/ (for example rmpvast/W03_wrapper_count.mjs, rmpvast/W09_W23_duplicate_error.mjs, rmpvast/vastclient642_load.mjs, vastlint/delegated_midchain.mjs, vastlint/adtaguri_amp.mjs).

## 3. Mutation fuzzing (Section 4.4 of the paper)

This section states the method as it stands. The results are in Section 5.3 and Appendix D of the paper.

### 3.1 Design

- Clients: vast-client-js 6.5.0, video-ad-sdk 4.0.1, iab-vast-loader 2.5.1 with iab-vast-parser 1.2.1, and vastlint-client 0.15.0, each in its own Node.js process (Node.js 22.22.0). The fuzzer is code/harness/fuzz/fuzz.mjs.
- Seeds: 139 documents: the 67 crafted vectors under code/harness/suite/vectors (directories with a `start.xml`, names not starting with `_`) and the 72 IAB sample files under sources/iab-vast-samples, in the order the code reads them.
- Draws: each draw takes one seed chain, applies 1 to 3 random mutations to one of its documents (structure, attributes, text, raw bytes, or the network behavior of a Wrapper target), serves the result from the recording server, and runs every client on it (load and play, as in the suite). A draw whose mutations cannot apply (for example a network mutation on a document with no Wrapper target) is skipped.
- Generator: one seeded pseudorandom stream, mulberry32 (32-bit state, `Math.imul`), seed 20261017. Generation does not depend on any client result.
- Rounds: rounds of 300 draws; the campaign stops after a round that adds no new failure class, once at least 4 rounds have run.
- Failure classes: crash (the process died or printed no result), hang (no result within the 30 second wall limit), uncaught (an error thrown outside any promise), unhandled (an unhandled rejection), adapter (the client's documented API threw), slow (the load took longer than the slow-load threshold of the detector), and internal (a JavaScript TypeError or similar returned as the client's error). A class is the client, the failure kind and the normalized message. Classes are merged into root causes C1 to C9 (Appendix D). A differential pass groups cases by which clients resolved an ad, separates disagreements that a mutation induced from those its seed already showed, and probes the induced groups with single-change documents (findings D1 to D4).
- Numbers as the paper gives them: 5 rounds of 289, 291, 290, 283 and 289 cases (1,442 in all, 1,437 unique; 1,500 draws, 58 skipped); 12 failure classes; 9 root causes (8 library defects and 1 environment artifact). New classes per round 8, 2, 1, 1 and 0; new root causes per round 8, 1, 0, 0 and 0.
- Evidence: code/harness/fuzz/fuzz.mjs; results/fuzz/fuzz-r3/ (cases.jsonl.gz, classes.json, rounds.json, examples/); results/fuzz/analysis/classes-verified.tsv, saturation-r3.tsv, class-frequencies-r3.tsv, differential-groups-r3.tsv, diff-probes.jsonl; evidence/checks/fuzz-repros/.

### 3.2 Seed check

The seed 20261017 regenerates all 1,442 stored cases in order: the corpus seed name and the mutation list of every case, every case id (`f00001` to `f01442`), every round number, and the per-round case counts. The check runs only the generator; it starts no client and no server, and takes about 6 seconds:

```
cd <repository root>
nice -n 10 node evidence/checks/fuzz-repros/fuzz-seed-check.mjs results/fuzz/fuzz-r3/cases.jsonl.gz --seeds 20261017
```

Its output for the campaign is stored in results/fuzz/analysis/fuzz-seed-check-r3.out. The generator uses `seed >>> 0`, so seeds that differ by a multiple of 2^32 give the same stream. The default seed of a normal run (`--seed 1`) is a different stream and does not regenerate these cases.

### 3.3 Replay option

`code/harness/fuzz/fuzz.mjs --replay` reruns stored cases. `cases.jsonl` keeps only the corpus seed name and the mutation descriptions, and a description does not determine the mutated document ("delete <Tracking>" does not say which element). Replay therefore reruns the generator from the campaign seed (default 20261017 in replay mode), checks every rebuilt case against the stored descriptor, and stops with exit code 2 and a message if any case differs. Cases that are not selected are still drawn, so that the stream stays in step. Output in `<out>/cases.jsonl` has the same per-case record as a normal run (id and round are the stored ones), plus `classes.json` and `examples/<id>/` for the first case of each class seen. The stop rule, `--hours` and `--per-round` do not apply to replay.

```
# all stored cases, in order (about 1 hour on 2 cores)
cd code/harness   # from the repository root
nice -n 10 node fuzz/fuzz.mjs /path/to/out --replay ../../results/fuzz/fuzz-r3/cases.jsonl.gz

# chosen cases (comma list of stored ids), or the first N cases
nice -n 10 node fuzz/fuzz.mjs /path/to/out --replay ../../results/fuzz/fuzz-r3/cases.jsonl.gz --only f00155,f00093
nice -n 10 node fuzz/fuzz.mjs /path/to/out --replay ../../results/fuzz/fuzz-r3/cases.jsonl.gz --first 20
```

Options: `--seed`, `--clients a,b`, `--only`, `--first`.

Replay test: 59 cases (the first example case of each of the 9 root causes, taken from results/fuzz/analysis/classes-verified.tsv, and 50 other stored cases drawn by a seeded shuffle with seed 16). All 59 regenerated with the stored descriptor; all 59 have the same failure classes as the stored case (16 carry a class, 43 carry none, in both runs) and identical outcome fields for all four clients; all 9 root-cause examples reproduced their class, including the vast-client-js stalled-body hang (f00361). The test covers 59 of 1,442 cases. The hang and slow classes depend on the 30 second wall and on machine load, so a hang or slow case on a loaded machine can differ between runs.

Evidence: results/fuzz/analysis/replay-mode-r3.jsonl (replay output), results/fuzz/analysis/replay-mode-r3-compare.json (comparison); evidence/checks/fuzz-repros/fuzz-replay-pick.mjs and fuzz-replay-compare.mjs; code/package/README.md (fuzzer subsection).

### 3.4 Saturation

Classes per round were 8, 2, 1, 1 and 0, and root causes per round 8, 1, 0, 0 and 0 (results/fuzz/analysis/saturation-r3.tsv). The empty final round is weak evidence that classes are exhausted: 3 classes occur in 1 case each, none in exactly 2, and the bias-corrected Chao1 estimate is 15.0 classes (95 percent interval 12.4 to 37.3) against 12 observed. Classes are message strings, so root causes are the unit reported. The last new root cause appeared at unique case 360, and rounds 3 to 5 (858 cases not seen before) added none. The bound holds only for this generator's seeds and operators, and it assumes independent cases. The class key depends on the detector's thresholds: the vast-client-js stalled-body class is a hang because its 54 second duration exceeds the 30 second wall. The detector sees only crashes, rejections, hangs, slow loads and internal errors. The "VAST version" mutation rewrites the first `version="..."` attribute, which is the XML declaration in the crafted vectors, so it changes the VAST version only in the 72 IAB samples.

The vast-client-js stalled-body class (C4) is a defect of the library and not an effect of load: its `url_handler.js` clears the timer when the headers arrive and reads the body with no timeout, so each of 9 Wrapper hops waits out the 6 second stall (302 at 54.19 seconds; with a 3 second stall, 27.10 seconds, which is 9 times the stall). Measurements: evidence/checks/fuzz-repros/vc-hang/.

### 3.5 Environment artifact

Class C9 is an unhandled rejection in video-ad-sdk's icon code that occurs only because Node.js 22's own `CustomEvent` reaches jsdom's event target. It is reproduced with the harness globals and absent with jsdom's own event classes. It is classified as an environment artifact and excluded from the library defects; the affected icon cells are browser-only, so no verdict changes. Evidence: evidence/checks/fuzz-repros/vas-icon-event-artifact/.
