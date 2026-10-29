// Version sweep: the Node requirement suite run against past releases of each Node client, the
// last patch of every minor release whose public API the adapter uses. Each release is installed into its own folder
// under sweep/pkgs/ (scripts off) and, for the two libraries that need it, bundled with esbuild exactly as
// build/build.sh bundles the current one; the suite then runs with VASTCONF_MODULE pointing at it.
// Usage: node sweep/run-sweep.mjs <outDir> [client[@version],...]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const here = path.dirname(new URL(import.meta.url).pathname);
const H = path.join(here, '..');
const outDir = path.resolve(process.argv[2] || path.join(H, '../../data/sweep'));
const SWEEP = {
  vastclient: { pkg: '@dailymotion/vast-client', configs: ['vastclient'], versions: ['3.3.0', '4.0.1', '5.0.0', '6.0.2', '6.1.0', '6.2.0', '6.3.1', '6.4.5', '6.5.0'] },
  videoadsdk: { pkg: 'video-ad-sdk', configs: ['videoadsdk'], bundle: 'vas', versions: ['2.1.0', '2.2.1', '2.3.0', '2.4.3', '2.5.1', '2.6.3', '2.7.2', '3.0.0', '4.0.1'] },
  iabloader: { pkg: 'iab-vast-loader', configs: ['iabloader', 'iabloader+nsap'], bundle: 'iab', versions: ['2.0.0', '2.1.0', '2.2.5', '2.3.0', '2.4.0', '2.5.1'] },
  vastlint: { pkg: 'vastlint-client', configs: ['vastlint'], versions: ['0.4.24', '0.5.0', '0.6.3', '0.7.2', '0.8.4', '0.9.1', '0.10.2', '0.11.8', '0.12.0', '0.13.13', '0.14.5', '0.15.0'], pinCore: 'vastlint' },
};
const only = process.argv[3] ? process.argv[3].split(',') : null;
const jobs = [];
for (const [client, s] of Object.entries(SWEEP)) for (const v of s.versions) {
  if (only && !only.some(o => o === client || o === `${client}@${v}`)) continue;
  jobs.push({ client, v, ...s });
}
fs.mkdirSync(outDir, { recursive: true });
const status = [];
for (const j of jobs) {
  const dir = path.join(here, 'pkgs', `${j.client}-${j.v}`);
  const res = { client: j.client, version: j.v, pkg: j.pkg };
  try {
    if (!fs.existsSync(path.join(dir, 'node_modules', j.pkg, 'package.json'))) {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: `sweep-${j.client}-${j.v}`, private: true, type: 'module' }));
      // iab-vast-loader needs node-fetch (build/iab-entry.mjs); vastlint-client's core is pinned to the same release
      const extra = j.bundle === 'iab' ? ['node-fetch@2.7.0'] : j.pinCore ? [`${j.pinCore}@${j.v}`] : [];
      execFileSync('npm', ['i', '--no-audit', '--no-fund', '--ignore-scripts', '--save-exact', `${j.pkg}@${j.v}`, ...extra], { cwd: dir, stdio: 'pipe' });
    }
    let mod = path.join(dir, 'node_modules', j.pkg);
    if (j.bundle === 'vas') {
      fs.writeFileSync(path.join(dir, 'entry.mjs'), "export * from 'video-ad-sdk';\n");
      execFileSync(path.join(H, 'node_modules/.bin/esbuild'), ['entry.mjs', '--bundle', '--platform=neutral', '--main-fields=module,main', '--format=esm', '--outfile=bundle.mjs', '--log-level=error'], { cwd: dir, stdio: 'pipe' });
      mod = path.join(dir, 'bundle.mjs');
    } else if (j.bundle === 'iab') {
      fs.copyFileSync(path.join(H, 'build/iab-entry.mjs'), path.join(dir, 'entry.mjs'));
      execFileSync(path.join(H, 'node_modules/.bin/esbuild'), ['entry.mjs', '--bundle', '--platform=node', '--format=esm', '--outfile=bundle.mjs', '--log-level=error',
        "--banner:js=import{createRequire as __cr}from'module';const require=__cr(import.meta.url);"], { cwd: dir, stdio: 'pipe' });
      mod = path.join(dir, 'bundle.mjs');
    } else {
      const pj = JSON.parse(fs.readFileSync(path.join(mod, 'package.json'), 'utf8'));
      // import by path: resolve the package's Node entry the way Node would for a bare specifier
      const exp = pj.exports && (pj.exports['.'] || pj.exports);
      const entry = (exp && (exp.node && (exp.node.import || exp.node.default || exp.node)) ) || (exp && (exp.import || exp.default)) || pj.module || pj.main || 'index.js';
      mod = path.join(mod, typeof entry === 'string' ? entry : (entry.default || entry.import));
    }
    res.module = path.relative(H, mod);
    const out = path.join(outDir, j.client, j.v);
    const r = spawnSync('node', [path.join(H, 'suite/run.mjs'), out], { cwd: H, env: { ...process.env, VASTCONF_CONFIGS: j.configs.join(','), VASTCONF_MODULE: mod, VASTCONF_MODULE_VERSION: j.v }, encoding: 'utf8', maxBuffer: 256 << 20 });
    res.exit = r.status;
    res.cells = fs.existsSync(path.join(out, 'results.jsonl')) ? fs.readFileSync(path.join(out, 'results.jsonl'), 'utf8').trim().split('\n').length : 0;
  } catch (e) { res.error = String(e.stderr || e.message).slice(0, 400); }
  status.push(res);
  console.log(JSON.stringify(res));
  fs.writeFileSync(path.join(outDir, 'sweep-status.json'), JSON.stringify(status, null, 1));
}
