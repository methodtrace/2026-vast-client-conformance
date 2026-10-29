// Records the machine, toolchain, package versions, browser versions and file hashes for a run.
// Usage: node tools/collect-env.mjs <pkgRoot> <outFile>
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { hashTree } from './hashes.mjs';
const [pkg, outFile] = process.argv.slice(2);
const H = path.join(pkg, 'code/harness');
const sh = (cmd, args, opts = {}) => { try { return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000, ...opts }).trim(); } catch (e) { return `ERROR: ${String(e.message).split('\n')[0]}`; } };
const env = {
  collectedAt: new Date().toISOString(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  os: { platform: process.platform, arch: process.arch, release: os.release(), type: os.type(), cpus: os.cpus().length, cpuModel: (os.cpus()[0] || {}).model, memGB: Math.round(os.totalmem() / 2 ** 30) },
  macos: process.platform === 'darwin' ? sh('sw_vers', []) : null,
  node: process.version, npm: sh('npm', ['--version'], { cwd: H }), execPath: process.execPath,
  packages: (() => { try { return JSON.parse(sh('npm', ['ls', '--json', '--depth=0'], { cwd: H })).dependencies; } catch { return 'npm ls failed'; } })(),
};
const require = createRequire(path.join(H, 'package.json'));
try { env.playwright = require('playwright/package.json').version; } catch { env.playwright = null; }
env.browsers = {};
try {
  const mod = await import(require.resolve('playwright'));
  const pw = mod.chromium ? mod : mod.default; // playwright is CommonJS: its exports arrive on default
  for (const b of ['chromium', 'firefox', 'webkit']) {
    try { const br = await pw[b].launch({ headless: true }); env.browsers[b] = br.version(); await br.close(); } catch (e) { env.browsers[b] = 'LAUNCH FAILED: ' + String(e.message).split('\n')[0]; }
  }
  try { const br = await pw.chromium.launch({ headless: true, channel: 'chrome' }); env.browsers.chrome = br.version(); await br.close(); } catch (e) { env.browsers.chrome = 'not available: ' + String(e.message).split('\n')[0]; }
} catch (e) { env.browsers = 'playwright not importable: ' + e.message; }
env.chromeExecutable = (() => { for (const f of ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/opt/google/chrome/chrome']) if (fs.existsSync(f)) return { path: f, realpath: fs.realpathSync(f) }; return null; })();
env.hashes = {
  sources: hashTree(pkg, ['code/harness/server.mjs', 'code/harness/gate2.mjs', 'code/harness/adapters', 'code/harness/suite/requirements.mjs', 'code/harness/suite/evaluate.mjs', 'code/harness/suite/run.mjs', 'code/harness/suite/build-vectors.mjs', 'code/harness/browser', 'code/harness/build/build.sh', 'code/harness/build/iab-entry.mjs', 'code/harness/build/vas-entry.mjs', 'code/harness/lib', 'code/harness/package.json', 'code/harness/package-lock.json', 'tools', 'run.sh'], /(^|\/)(node_modules|scratch|dist)(\/|$)/),
  builtBundles: hashTree(pkg, ['code/harness/build/dist', 'code/harness/browser/dist']),
  vectors: hashTree(pkg, ['code/harness/suite/vectors', 'code/harness/suite/vectors-browser']),
  media: hashTree(pkg, ['code/harness/browser/media']),
};
fs.writeFileSync(outFile, JSON.stringify(env, null, 1));
console.log(`node ${env.node} on ${env.os.platform}/${env.os.arch}; playwright ${env.playwright}; browsers ${JSON.stringify(env.browsers)}`);
