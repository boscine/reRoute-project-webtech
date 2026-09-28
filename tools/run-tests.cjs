'use strict';

/**
 * Test runner that selects which API the suite talks to.
 *
 * Why this exists instead of a plain npm script prefix: `REROUTE_STUB_API=1
 * playwright test` is a POSIX shell idiom that cmd.exe does not understand, so
 * it silently does nothing useful on Windows. Setting the variable here works
 * identically on every platform.
 *
 *   node tools/run-tests.cjs stub            # in-memory API, no mongod needed
 *   node tools/run-tests.cjs api             # real Express + MongoDB backend
 *   node tools/run-tests.cjs stub tests/ui.spec.js --headed
 *
 * Any extra arguments are passed straight through to `playwright test`.
 */

const { spawn } = require('node:child_process');
const { rmSync, existsSync } = require('node:fs');
const { join } = require('node:path');

/**
 * Vite 8 bundles vite.config.js to a temp file under node_modules/.vite-temp
 * before loading it. If a previous run left that directory behind, both dev
 * servers die with
 *   ENOENT ... .vite-temp/vite.config.js.timestamp-*.mjs
 * and Playwright reports it only as an opaque "webServer was not able to
 * start" timeout. Removing the stale directory lets Vite recreate it, which is
 * the only state in which it reliably starts.
 *
 * Verified by bisection: with the directory present the auth server fails; with
 * it absent both servers bind their ports.
 */
for (const app of ['frontend/auth', 'frontend/dashboard']) {
  const temp = join(__dirname, '..', app, 'node_modules', '.vite-temp');
  if (!existsSync(temp)) continue;
  try {
    rmSync(temp, { recursive: true, force: true });
    console.log('> removed stale ' + app + '/node_modules/.vite-temp');
  } catch (err) {
    // Windows can hold a transient lock on node_modules paths (EPERM). This is
    // best-effort housekeeping and must never abort the run; if the directory
    // really is stuck, Vite's own error message is the more useful diagnostic.
    console.log('> could not remove ' + app + '/node_modules/.vite-temp (' + err.code + '), continuing');
  }
}
const mode = process.argv[2] === 'api' ? 'api' : 'stub';
const passthrough = process.argv.slice(3);

const env = {
  ...process.env,
  REROUTE_STUB_API: mode === 'api' ? '0' : '1',
};

console.log(
  '\n> ReRoute test mode: ' +
    (mode === 'api'
      ? 'REAL API (Express + MongoDB) - backend-semantics tests will run'
      : 'STUB API (in-memory) - backend-semantics tests will be SKIPPED') +
    '\n'
);

// @playwright/test exports its CLI as the "./cli" subpath, not "./cli.js".
// Fall back to the playwright package so this keeps working if the runner is
// ever copied into a workspace that only depends on `playwright`.
function resolveCli() {
  for (const specifier of ['@playwright/test/cli', 'playwright/cli']) {
    try {
      return require.resolve(specifier);
    } catch {
      /* try the next one */
    }
  }
  throw new Error('Could not locate the Playwright CLI. Run `npm install` first.');
}

const child = spawn(process.execPath, [resolveCli(), 'test', ...passthrough], {
  stdio: 'inherit',
  env,
});

child.on('exit', (code, signal) => {
  process.exit(signal ? 1 : code ?? 1);
});
