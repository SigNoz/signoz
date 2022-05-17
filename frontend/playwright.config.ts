import { devices, PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	preserveOutput: 'always',
	name: 'Signoz',
	testDir: './tests',
	use: {
		trace: 'on-first-retry',
	},
	updateSnapshots: 'all',
	fullyParallel: false,
	quiet: true,
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
		{
			name: 'firefox',
			use: { ...devices['Desktop Firefox'] },
		},
		{
			name: 'webkit',
			use: { ...devices['Desktop Safari'] },
		},
	],
};
export default config;
