import assert from 'node:assert/strict';

import { affected, unmapped } from './affected.mjs';

assert.deepEqual(
	affected(['frontend/src/pages/AlertList/index.tsx']).features,
	['alerts'],
	'a page change selects the features mapped to its route',
);

for (const file of [
	'frontend/.storybook/preview.tsx',
	'docs/api/openapi.yml',
]) {
	assert.deepEqual(
		affected([file]),
		{ all: false, reasons: [], features: [], specs: [] },
		`${file} selects nothing`,
	);
}

assert.deepEqual(
	affected(['tests/e2e/drivers/sso.ts']).specs,
	['sso/auth-domains.spec.ts'],
	'a driver change selects the specs that import it',
);

for (const file of [
	'frontend/pnpm-lock.yaml',
	'frontend/src/index.tsx',
	'pkg/signoz/signoz.go',
]) {
	assert.equal(affected([file]).all, true, `${file} runs everything`);
}

assert.deepEqual(
	unmapped(),
	{ folders: [], pages: [] },
	'add these spec folders and pages to tests/e2e/affected.json',
);
