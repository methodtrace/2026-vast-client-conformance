// Runs one client against one URL in an isolated process and prints a JSON result on stdout.
// Usage: node adapters/run.mjs <clientId> <url> [optionsJSON] [scriptJSON]
// With a scriptJSON the client also plays the ad (play()); without it, it only loads (load()).
import { installEnv, drain, pixels, fetches } from './env.mjs';

const [, , clientId, url, optsJson, scriptJson] = process.argv;
const opts = optsJson ? JSON.parse(optsJson) : {};
installEnv();
// Browser semantics for errors thrown outside any promise (for example inside a timer): a page logs them and keeps
// running; Node would terminate. Record them, keep running, and report them in the result.
const uncaught = [];
process.on('uncaughtException', e => uncaught.push(String(e && e.message || e)));
process.on('unhandledRejection', e => uncaught.push('unhandled rejection: ' + String(e && e.message || e)));
// Silence library console noise so stdout carries only the result.
for (const k of ['log', 'info', 'warn', 'error', 'debug']) console[k] = () => {};
const out = s => process.stdout.write(s + '\n');

const adapters = { vastclient: './vastclient.mjs', videoadsdk: './videoadsdk.mjs', iabloader: './iabloader.mjs', vastlint: './vastlint.mjs' };
const t0 = Date.now();
let result;
try {
  const a = await import(adapters[clientId]);
  result = scriptJson
    ? { client: a.client, url, opts, script: JSON.parse(scriptJson), mode: 'play', ...(await a.play(url, opts, JSON.parse(scriptJson))) }
    : { client: a.client, url, opts, mode: 'load', ...(await a.load(url, opts)) };
  if (process.env.VASTCONF_MODULE_VERSION) result.client = { ...result.client, version: process.env.VASTCONF_MODULE_VERSION };
} catch (e) {
  result = { client: { id: clientId }, url, opts, ok: false, error: 'adapter crash: ' + String(e && e.stack || e).slice(0, 500) };
}
await drain(opts.drainMs ?? 300);
result.ms = Date.now() - t0;
result.uncaught = uncaught;
result.pixels = pixels.map(p => p.url);
result.fetches = fetches.slice();
out(JSON.stringify(result));
process.exit(0);
