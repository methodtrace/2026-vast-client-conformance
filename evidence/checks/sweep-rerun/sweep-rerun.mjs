// Reruns (2026-10-21) selected requirements of the version sweep with the current harness.
// Same install and bundle steps as code/harness/sweep/run-sweep.mjs, plus a requirement filter (suite/run.mjs argv[3]).
// Usage (from code/harness): node ../../checks/sweep-rerun/sweep-rerun.mjs <outDir> <idRegex> client@version[,client@version...]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const H = process.cwd();
if (!fs.existsSync(path.join(H, 'suite/run.mjs'))) throw new Error('run from code/harness');
const [outArg, idRe, list] = process.argv.slice(2);
const outDir = path.resolve(outArg);
const SWEEP = {
  vastclient: { pkg: '@dailymotion/vast-client', configs: ['vastclient'] },
  videoadsdk: { pkg: 'video-ad-sdk', configs: ['videoadsdk'], bundle: 'vas' },
};
fs.mkdirSync(outDir, { recursive: true });
const status = [];
for (const item of list.split(',')) {
  const [client, v] = item.split('@');
  const j = SWEEP[client];
  const dir = path.join(H, 'sweep', 'pkgs', `${client}-${v}`);
  const res = { client, version: v, pkg: j.pkg, only: idRe };
  if (!fs.existsSync(path.join(dir, 'node_modules', j.pkg, 'package.json'))) {
    fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(path.join(dir, 'package-lock.json'))) execFileSync('npm', ['ci', '--no-audit', '--no-fund', '--ignore-scripts'], { cwd: dir, stdio: 'pipe' });
    else execFileSync('npm', ['i', '--no-audit', '--no-fund', '--ignore-scripts', '--save-exact', `${j.pkg}@${v}`], { cwd: dir, stdio: 'pipe' });
  }
  let mod = path.join(dir, 'node_modules', j.pkg);
  if (j.bundle === 'vas') {
    fs.writeFileSync(path.join(dir, 'entry.mjs'), "export * from 'video-ad-sdk';\n");
    execFileSync(path.join(H, 'node_modules/.bin/esbuild'), ['entry.mjs', '--bundle', '--platform=neutral', '--main-fields=module,main', '--format=esm', '--outfile=bundle.mjs', '--log-level=error'], { cwd: dir, stdio: 'pipe' });
    mod = path.join(dir, 'bundle.mjs');
  } else {
    const pj = JSON.parse(fs.readFileSync(path.join(mod, 'package.json'), 'utf8'));
    const exp = pj.exports && (pj.exports['.'] || pj.exports);
    const entry = (exp && (exp.node && (exp.node.import || exp.node.default || exp.node))) || (exp && (exp.import || exp.default)) || pj.module || pj.main || 'index.js';
    mod = path.join(mod, typeof entry === 'string' ? entry : (entry.default || entry.import));
  }
  res.module = path.relative(H, mod);
  const out = path.join(outDir, client, v);
  const r = spawnSync('node', [path.join(H, 'suite/run.mjs'), out, idRe], { cwd: H, env: { ...process.env, VASTCONF_CONFIGS: j.configs.join(','), VASTCONF_MODULE: mod, VASTCONF_MODULE_VERSION: v }, encoding: 'utf8', maxBuffer: 256 << 20 });
  res.exit = r.status;
  const f = path.join(out, 'results.partial.jsonl');
  res.cells = fs.existsSync(f) ? fs.readFileSync(f, 'utf8').trim().split('\n').length : 0;
  if (r.status) res.stderr = String(r.stderr).slice(-400);
  status.push(res);
  console.log(JSON.stringify(res));
  fs.writeFileSync(path.join(outDir, 'status.json'), JSON.stringify(status, null, 1));
}
