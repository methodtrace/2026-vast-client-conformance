@dailymotion/vast-client 6.5.0: the campaign 3 "vastclient|hang|no result within 30 s" class (C4). It is not a loop the library fails to stop and not harness load. It is the url_handler.js body-stall defect (the second defect in evidence/checks/r01-crash/README.md) repeated once per Wrapper hop. The timer is cleared when the headers arrive (src/fetcher/url_handler.js:66-72, dist/vast-client-node.js:2701-2703), and the body read (handleResponse, url_handler.js:11 and :78) has no timeout. So every stalled hop costs the full stall, whatever `timeout` is. The w_loop vector points at itself: 9 stalled hops x 6 s, then the depth-10 limit (src/parser/vast_parser.js:382) ends it with 302, at about 54 s. The harness wall is 30 s, so the run was counted as a hang.

Documents (each a start.xml served by the recording server):
- wloop/: a 132-byte self-referencing Wrapper with `?stall=6000` (minimal form of fuzz case f00361)
- wloop3/: the same with `?stall=3000` (time halves: about 27 s, so the total is 9 x the stall)
- wone/: one Wrapper to an InLine with `?stall=6000` (no loop: the ad comes back after about 6 s, timeout 2 s)
- wchain/: a 3-Wrapper chain with `?stall=3000` per hop, no loop (the ad comes back after about 9 s)
- wloop-under/: a self-loop with `?delay=1800` (under the timeout), run only against the patched build. It ends by the depth limit (302) at about 16 s, which shows the patch still lets a loop run up to the wrapper limit.
- wforever/: one Wrapper whose target sends headers and never finishes the body (`?stall=900000`): shows what ends a single stall when there is no library timeout

vast-client-6.5.0-fix.patch: the fix (the timer covers the whole request, body included, and no longer throws) in src/fetcher/url_handler.js, the same change by hand in dist/vast-client-node.js (the build the runs load), and its tests in spec/fetcher.spec.js. `bash evidence/checks/fuzz-repros/vc-hang/make-patched.sh` applies it to a copy of the installed vast-client 6.5.0 and writes patched/vast-client-6.5.0-fix/. code/ is untouched.

Run (from the repository root):
```
node evidence/checks/fuzz-repros/vastclient-hang-timeline.mjs evidence/checks/fuzz-repros/vc-hang/wloop 2000
MODULE=$PWD/evidence/checks/fuzz-repros/vc-hang/patched/vast-client-6.5.0-fix/dist/vast-client-node.js node evidence/checks/fuzz-repros/vastclient-hang-timeline.mjs evidence/checks/fuzz-repros/vc-hang/wloop 2000
```
The fuzz example itself: `node evidence/checks/fuzz-repros/vastclient-hang-timeline.mjs results/fuzz/fuzz-r3/examples/f00361 2000`. Through the adapter with the patched build: `VASTCONF_MODULE=<same path> ONLY=vastclient node evidence/checks/fuzz-repros/replay-r3.mjs 3`.

Results: results/ (timelines and summaries); results/fuzz/analysis/replay-r3*.jsonl.
