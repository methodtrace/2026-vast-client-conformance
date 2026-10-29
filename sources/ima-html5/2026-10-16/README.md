# Google IMA HTML5 SDK 3.794.0, archived 2026-10-16 (index only)

Every file the IMA SDK loaded while playing the test vectors in Chromium 141 (Linux) was recorded once from Google's
servers on 2026-10-16 by `code/harness/browser/run-browser.mjs` (`VASTCONF_EXT_RECORD=1`), and every later run was
answered from that archive (`VASTCONF_EXT_ARCHIVE` set to this folder). `index.tsv` lists, for each archived file,
its URL, sha256, HTTP status, content type and file name.

The publisher-config request (securepubads.g.doubleclick.net/pagead/ima_ppub_config) is keyed without its query,
which carries the test page URL. Google telemetry beacons (gen_204, ping, activeview and similar) and
ad-traffic-quality (Sodar) pings are answered locally with 204 and never sent; they are not in the archive. During
the first full Chromium run (2026-10-16, about 09:55 to 10:15 PDT) the local stub did not yet cover
ep1/ep2.adtrafficquality.google, so that run's Sodar configuration request, generate_204 and Sodar pings went to
Google; those three entries were removed from the archive afterwards. The Sodar scripts themselves (sodar2.js,
runner.html) are kept as SDK resources.

Why archive: `ima3.js` is a loader. It loads a versioned bridge frame and fetches a publisher configuration that
carries server-assigned experiment state, so live runs can differ from one another. Replaying the archived files fixes
the SDK version and the configuration.

The files themselves are proprietary Google software and are not distributed here. `ima3.js` has sha256
ef9c29bc079af27701174c27d25d1b8f4f4333c7e2579bb471c269c0a18e63db (also fetched directly with curl, same hash).
Without the archive the harness runs every open-source client; IMA runs only when the archive is supplied.
