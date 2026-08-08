import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

import parkedSpecs from './parked-specs.json';

// Precedence: real env > .env.local > .env. dotenv never overwrites a var that is
// already set, so loading in that order gives local-backend coordinates (.env.local,
// written by bootstrap/setup.py) priority over the staging defaults in .env, while an
// explicitly exported var still wins over both — which is what lets a run be pointed
// at another environment without editing a generated file.
dotenv.config({ path: path.resolve(__dirname, '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '.env') });

export default defineConfig({
	testDir: './tests',

	// Parked specs, listed one by one with a reason in parked-specs.json — not a
	// blanket glob, so nothing new can land inside an excluded directory unnoticed.
	// `pnpm guard:specs` keeps this list and the suite honest.
	testIgnore: parkedSpecs.specs,

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

	// Workers
	workers: process.env.CI ? 2 : undefined,

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
