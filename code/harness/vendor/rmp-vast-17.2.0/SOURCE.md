# rmp-vast 17.2.0 (vendored)

- Source: https://github.com/radiantmediaplayer/rmp-vast, commit 5975ead72b64dc221b8454e47f9a00c0626273cc (2026-02-26, "17.2.0").
- File: `dist/rmp-vast.js` as committed at that commit (the library's own build; it sets `window.RmpVast`).
- sha256: 752ef26a6aa92c26ec82cdff8bb8e8430dc9bfd5fadaaaaeddad7e3e13158f82
- License: MIT (LICENSE, copied from the repository).
- Why vendored: rmp-vast is distributed from GitHub, not npm (npm `rmp-vast` stopped at 6.0.0 in 2022), and the harness package must run offline.
- The build bundles @dailymotion/vast-client 6.4.2 (package-lock.json at that commit) for fetching, parsing and Wrapper resolution; tracking, error reporting, media selection and playback are rmp-vast's own code.

## Source tree for Appendix B locations (src-js-5975ead/)

- Source: https://github.com/radiantmediaplayer/rmp-vast, commit 5975ead72b64dc221b8454e47f9a00c0626273cc (the same commit as the dist bundle above).
- Cloned: 2026-10-21 (git clone, then checkout of that commit; `git log -1` reports 2026-02-26).
- Contents: the repository's `src/js/` tree, copied unchanged with its layout to `src-js-5975ead/js/`, and the repository's `LICENSE` to `src-js-5975ead/LICENSE` (identical to `LICENSE` in this directory).
- File count: 18 (17 JavaScript files under `src-js-5975ead/js/`, plus `LICENSE`).
- Manifest: `src-js-5975ead.sha256` lists the sha256 of each of the 18 files, with paths relative to `src-js-5975ead/`. Check with `cd src-js-5975ead && sha256sum -c ../src-js-5975ead.sha256`.
- Why: Appendix B of the paper cites rmp-vast locations as `src/js/...` at this commit; the files let a reader check them. The code the harness runs is still `rmp-vast.js` (the dist bundle).
- Not included: the bundled @dailymotion/vast-client 6.4.2 sources (they are not in `src/js/`; they appear minified in the dist bundle).
