import { PlaywrightTestConfig } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

const config: PlaywrightTestConfig = {
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	preserveOutput: 'always',
	name: 'Signoz',
	testDir: './tests',
	use: {
		trace: 'retain-on-failure',
		baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3301',
	},
	updateSnapshots: 'all',
	fullyParallel: false,
	quiet: true,
};

export default config;
