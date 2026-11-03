import assert from 'node:assert/strict';

import { affected } from './affected.mjs';

assert.deepEqual(
	affected(['frontend/src/pages/AlertList/index.tsx']).features,
	['alerts'],
	'a page change selects the features mapped to its route',
);

assert.deepEqual(
	affected([
		'frontend/src/container/ListAlertRules/__tests__/ListAlert.test.tsx',
	]),
	{ all: false, reasons: [], features: [], specs: [] },
	'a frontend unit test selects nothing',
);

assert.deepEqual(
	affected(['tests/e2e/helpers/sso.ts']).specs,
	['sso/auth-domains.spec.ts'],
	'a helper change selects the specs that import it',
);

for (const file of [
	'frontend/pnpm-lock.yaml',
	'frontend/src/index.tsx',
	'pkg/signoz/signoz.go',
]) {
	assert.equal(affected([file]).all, true, `${file} runs everything`);
}
