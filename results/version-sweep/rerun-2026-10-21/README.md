# Sweep rerun, 2026-10-21

Reruns the two cell groups the paper excludes from Table 6 (Section 4.11, last paragraph; blind review minor 12; critique audit) with the current harness. Nothing in results/version-sweep/first-grading or results/version-sweep/as-run was changed.

## Which cells (from paper Section 4.5)

1. **video-ad-sdk X13 (empty Impression), releases 2.1.0, 2.2.1, 2.3.0, 2.4.3, 2.5.1, 2.6.3, 2.7.2** (the seven swept releases before 3.0.0). The sweep recorded `deviates` with "adapter crash: TypeError: Cannot read properties of null (reading 'uri')": the adapter's `normAd` read `.uri` on the `null` that `getImpression` returns for an empty `<Impression/>` before 3.0.0. The adapter now guards null (code/harness/adapters/videoadsdk.mjs line 38). 3.0.0 and 4.0.1 were rerun as controls.
2. **vast-client-js W06 (self-referencing Wrapper), releases 3.3.0 and 4.0.1.** The sweep graded `n/a` ("does not follow Wrappers") because W06 lacked the `selfReferencing` flag; the flag is now set (code/harness/suite/requirements.mjs line 120). W05 was rerun with it (same vector), and 5.0.0 and 6.5.0 as controls.

Not rerun, because they are not artifacts of the harness: video-ad-sdk 2.1.0 T18 (no `skip()` method in that release; a real API difference) and video-ad-sdk T19 (a dependent cell that follows the T05 fix). Both are explained in resolutions.md item A-F6.

## How

`node ../../checks/sweep-rerun/sweep-rerun.mjs <out> <idRegex> client@version,...` from code/harness, at `nice -n 10`. The script repeats code/harness/sweep/run-sweep.mjs's install (from each release's stored package-lock.json) and esbuild bundling, then runs `suite/run.mjs` with a requirement filter. Harness: commit 11d1779 (2026-10-20) with dependencies installed by `npm ci`; adapters/videoadsdk.mjs sha256 bf5827ae5a0bc30d..., suite/requirements.mjs 9801e08757e73063..., suite/evaluate.mjs be5e94817d4a1aaa....

Files: `raw/x13/videoadsdk/<version>/results.partial.jsonl` and `raw/w05w06/vastclient/<version>/results.partial.jsonl` (full per-cell records, with request logs); `raw/*/status.json`; `summary.tsv` (old against new verdict).

## Result

| Client | Releases | Req. | Sweep (2026-10-16) | Rerun (2026-10-21) |
|---|---|---|---|---|
| video-ad-sdk | 2.1.0 to 2.7.2 (7) | X13 | deviates (adapter crash) | **conforms** ("requested": the other Impression is requested) |
| video-ad-sdk | 3.0.0, 4.0.1 (controls) | X13 | conforms | conforms |
| vast-client-js | 3.3.0, 4.0.1 | W06 | n/a (missing flag) | **conforms** (302 after one fetch) |
| vast-client-js | 3.3.0, 4.0.1 | W05 | conforms | conforms |
| vast-client-js | 5.0.0, 6.5.0 (controls) | W05, W06 | conforms | conforms |

## Does Table 6 change?

**No.** Table 6 lists verdict changes in library behavior between releases. With the corrected cells:

- video-ad-sdk X13 conforms in all nine releases, so there is no change to list (the sweep's "deviates to conforms at 3.0.0" was the artifact).
- vast-client-js W06 conforms in all nine releases (3.3.0 and 4.0.1 report 302 after one fetch through their `parentURLs` check; 5.0.0 onward reach the depth limit and report 302 to each of 10 fetches), so there is no change to list either.

Table 6 keeps its 10 rows. The sentence in Section 4.11 can now read: "Four rows of the sweep's change list are not in Table 6. Two were harness artifacts and were rerun with the corrected harness on 2026-10-21: video-ad-sdk's X13 before 3.0.0 conforms, and vast-client-js 3.3.0 and 4.0.1 conform on W06 (302 after one fetch); neither is a change between releases. video-ad-sdk 2.1.0's T18 could not be driven, because that release has no skip() method, and video-ad-sdk's T19 follows its T05 fix as a dependent cell." The words "those cells have not been rerun" go.

The timeline (results/version-sweep/first-grading/timeline.tsv) is not rewritten; summary.tsv here is the correction record.
