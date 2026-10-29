# Third-party sources

Nothing here is redistributed except hash manifests.

| Path | What it is | How to get it |
|---|---|---|
| `iab-vast-samples/` | IAB Tech Lab VAST_Samples, commit 6a60797f3b17f6d371ebe8ee3f511e9944078073: 75 sample VAST tags (VAST 2.0 to 4.2). `MANIFEST.tsv` lists every path with its sha256; `code/harness/lib/samples.mjs` rebuilds the full tree from it. | `bash code/tools/fetch-sources.sh` |
| `iab-vast-spec/` | VAST 4.3 specification text (IAB Tech Lab VAST4.x at a40ed96, CC BY 3.0), the section numbers the catalog cites; the VAST 4.2 and 4.4 XSDs and the IAB macro list (vast at 99d5d51). | `bash code/tools/fetch-sources.sh` |
| `ima-html5/2026-10-16/` | Google IMA HTML5 SDK 3.794.0 as archived for replay: `index.tsv` (URL and sha256 of every file) and a README. The files are proprietary and are not distributed. | not available |

`code/tools/fetch-sources.sh` checks every fetched file against its pinned sha256 and stops on any mismatch.
