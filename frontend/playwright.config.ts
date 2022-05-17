import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	preserveOutput: 'always',
	name: 'Signoz',
	testDir: './tests',
	use: {
		trace: 'retain-on-failure',
		baseURL: process.env.FRONTEND_API_ENDPOINT,
	},
	updateSnapshots: 'all',
	fullyParallel: false,
	quiet: true,
};

export default config;
