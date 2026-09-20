#!/usr/bin/env node
// Local integration runner. Uses explicit test settings or the ORIGINAL main
// container's DSN. Only the main repository is used for build and execution.
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
let dsn = process.env.SIGNOZ_TEST_OCEANBASE_DSN;
if (!dsn) {
  const name = process.env.SIGNOZ_E2E_CONTAINER || 'signoz-ob-e2e';
  const [container] = JSON.parse(execFileSync('docker', ['inspect', name], { encoding: 'utf8' }));
  const env = Object.fromEntries(container.Config.Env.map(item => {
    const eq = item.indexOf('=');
    return [item.slice(0, eq), item.slice(eq + 1)];
  }));
  dsn = env.SIGNOZ_TELEMETRYSTORE_OCEANBASE_DSN;
  if (env.SIGNOZ_TELEMETRYSTORE_PROVIDER !== 'oceanbase' || !dsn || !dsn.includes('@tcp(')) {
    throw new Error('Set SIGNOZ_TEST_OCEANBASE_DSN explicitly or use an OceanBase main container');
  }
  // Tests run on the host, while the container connects over its Docker network.
  const address = process.env.SIGNOZ_TEST_OCEANBASE_ADDRESS || '127.0.0.1:2881';
  dsn = dsn.replace(/@tcp\([^)]*\)/, () => `@tcp(${address})`);
}
const result = spawnSync(process.env.GO_BINARY || 'go', ['test', '-p', '4', './pkg/signoz', '-run', '^TestOceanBaseMainQueryStack$', '-v', '-count=1'], {
  cwd: root,
  env: { ...process.env, SIGNOZ_TEST_OCEANBASE_DSN: dsn, GOCACHE: process.env.GOCACHE || '/tmp/signoz-ob-go-build' },
  stdio: 'inherit',
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
