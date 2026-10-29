# First reference runs (2026-10-16)

108 requirements; harness at commit 85e3f34 of the private development repository, plus the refused-connection fix (daf6515).
- node/, node-run2/: Node layer, five configurations (vastclient, videoadsdk, iabloader, iabloader+nsap, vastlint); run 1 = run 2 in all 540 cells.
- chromium/: Chromium 141, eight configurations (adds shaka, rmpvast, rmpvast+omid, ima); equals the earlier reference run (five configurations) in all 510 shared cells; differs from the runs before the last harness fix only in W04 (rmpvast, ima), A01, A02, M09 (ima), the intended fixes.
- firefox/: Firefox 142 Linux; equals the earlier Mac run in all 510 shared cells.
- ../ref-remote/webkit/: WebKit 26 in a remote Linux VM; differs from the earlier Mac run in video-ad-sdk S01, M06, M07 because Linux WebKit (GStreamer) reports FLV as playable and the library picks the FLV file; the macOS result is authoritative for WebKit.
- macro-grid/: macro grid, both request-URI forms.
- grid-v4/: error grid rerun (187 cases x 4 Node clients, 0 harness errors; refused rows test a real refused connection). The first run (about 50 cells failed at process start) is not kept as a reference.
- fuzz-r3/: fuzz campaign 3 with the fixed generator (mulberry32), stop rule met at round 5, 12 classes, 1,442 cases.
- chromium-run2/: equals chromium/ in all 864 cells. webkit-local/: the build machine (Linux container); equals ../ref-remote/webkit in all 864 cells (two machines).
The author's macOS run of the release package is in ../../macos/.
