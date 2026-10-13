import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import fs from 'fs';
import os from 'os';
import path from 'path';

// Precedence, lowest to highest:
//   .env        — user-provided defaults (staging creds)
//   .env.local  — written by tests/e2e/bootstrap/setup.py when the pytest
//                 lifecycle brings the backend up locally, so it must win over
//                 any stale .env value
//   the real environment — anything the caller exported on purpose, e.g.
//                 `SIGNOZ_E2E_BASE_URL=http://127.0.0.1:3301 pnpm test` to run
//                 against a locally served frontend, or the vars pytest injects
//                 when it shells out to `pnpm test`.
//
// This is deliberately *not* `dotenv.config({ override: true })`: that flag
// makes the file beat process.env, so an exported SIGNOZ_E2E_BASE_URL was
// silently discarded and every run went to whatever .env.local pointed at.
// Parsing by hand is the only way to get ".env.local beats .env" without also
// getting ".env.local beats the caller".
const exported = new Set(Object.keys(process.env));
for (const file of ['.env', '.env.local']) {
	const filePath = path.resolve(__dirname, file);
	if (!fs.existsSync(filePath)) {
		continue;
	}
	const parsed = dotenv.parse(fs.readFileSync(filePath));
	for (const [key, value] of Object.entries(parsed)) {
		if (!exported.has(key)) {
			process.env[key] = value;
		}
	}
}

export default defineConfig({
	testDir: './tests',

	// Temporarily excluded: the V1 -> V2 dashboard migration changes the
	// behaviour the dashboards specs assert against, so they fail as written.
	// Remove this once they are updated for the V2 dashboard.
	testIgnore: ['**/tests/dashboards/**'],

	// All Playwright output lands under artifacts/. One subdir per reporter
	// plus results/ for per-test artifacts (traces/screenshots/videos).
	// CI can archive the whole dir with `tar czf artifacts.tgz tests/e2e/artifacts`.
	outputDir: 'artifacts/results',

	// Run tests in parallel
	fullyParallel: true,

	// Fail the build on CI if you accidentally left test.only
	forbidOnly: !!process.env.CI,

	// Retry on CI only
	retries: process.env.CI ? 2 : 0,

	// Workers. Playwright's local default is `cpus / 2`, which on a 32-core box is
	// 16 — and 16 is strictly worse than 6 here, because every worker's browser
	// shares one SigNoz container: measured on `tests/alerts/{create,edit}` at
	// `--repeat-each=3` (224 tests), 16 workers took 128 s with 3 failures while 6
	// took 119 s with none. Past ~6 the extra workers only add queueing, which shows
	// up as 4-6 s app mounts and save requests that outlive the test timeout — i.e.
	// as flakes that look like product bugs. Capped rather than fixed at 6 so a
	// 4-core laptop still gets `cpus / 2`.
	workers: process.env.CI
		? 2
		: Math.max(1, Math.min(6, Math.floor(os.cpus().length / 2))),

	// The SPA hydrates slowly on CI, so the 5s expect default fires mid-load.
	expect: { timeout: 15_000 },
	timeout: process.env.CI ? 60_000 : 30_000,

	// Reporter
	reporter: [
		['html', { outputFolder: 'artifacts/html', open: 'never' }],
		['json', { outputFile: 'artifacts/json/results.json' }],
		['list'],
	],

	// Shared settings
	use: {
		baseURL:
			process.env.SIGNOZ_E2E_BASE_URL || 'https://app.us.staging.signoz.cloud',
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
		video: 'retain-on-failure',
		colorScheme: 'dark',
		locale: 'en-US',
		viewport: { width: 1280, height: 720 },
	},

	// `setup` runs `bootstrap/global.setup.ts` once before any browser
	// project — refreshes the golden dataset so chart-data assertions
	// land inside default panel time windows. Per
	// https://playwright.dev/docs/test-global-setup-teardown#option-1-project-dependencies.
	projects: [
		{
			name: 'setup',
			testDir: './bootstrap',
			testMatch: /global\.setup\.ts/,
			teardown: 'teardown',
		},
		{
			name: 'teardown',
			testDir: './bootstrap',
			testMatch: /global\.teardown\.ts/,
		},
		{
			name: 'chromium',
			use: devices['Desktop Chrome'],
			dependencies: ['setup'],
		},
		{
			name: 'firefox',
			use: devices['Desktop Firefox'],
			dependencies: ['setup'],
		},
		{
			name: 'webkit',
			use: devices['Desktop Safari'],
			dependencies: ['setup'],
		},
	],
});
