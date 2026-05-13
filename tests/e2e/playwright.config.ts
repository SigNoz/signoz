import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// .env holds user-provided defaults (staging creds).
// .env.local is written by tests/e2e/bootstrap/setup.py when the pytest
// lifecycle brings the backend up locally; override=true so local-backend
// coordinates win over any stale .env values. Subprocess-injected env
// (e.g. when pytest shells out to `pnpm test`) still takes priority —
// dotenv doesn't touch vars that are already set in process.env.
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '.env.local'), override: true });

export default defineConfig({
	testDir: './tests',

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

	// Browser projects. No project-level auth — specs opt in via the
	// authedPage fixture in tests/e2e/fixtures/auth.ts, which logs a user
	// in on first use and caches the resulting storageState per worker.
	projects: [
		{ name: 'chromium', use: devices['Desktop Chrome'] },
		{ name: 'firefox', use: devices['Desktop Firefox'] },
		{ name: 'webkit', use: devices['Desktop Safari'] },
	],
});
