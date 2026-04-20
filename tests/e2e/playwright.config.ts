import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

const authFile = path.join(__dirname, '.auth/user.json');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Function to get grep pattern based on user role
function getRoleGrepPattern(): string | undefined {
  const userRole = process.env.SIGNOZ_USER_ROLE;

  if (!userRole) {
    console.log('SIGNOZ_USER_ROLE not set, running all tests');
    return undefined;
  }

  switch (userRole.toLowerCase()) {
    case 'admin':
      return '@admin|@editor|@viewer'; // Admin can run all tests
    case 'editor':
      return '@editor|@viewer'; // Editor can run editor and viewer tests
    case 'viewer':
      return '@viewer'; // Viewer can only run viewer tests
    default:
      console.warn(`Unknown role: ${userRole}, running all tests`);
      return undefined;
  }
}

export default defineConfig({
  testDir: './tests',

  // Pulls backend coordinates from .signoz-backend.json (written by the pytest
  // bootstrap) and sets SIGNOZ_E2E_BASE_URL/USERNAME/PASSWORD before the suite
  // runs. A no-op when SIGNOZ_E2E_BASE_URL is already set (staging mode, or
  // when pytest shelled out to `yarn test` with env pre-injected).
  globalSetup: require.resolve('./global.setup.ts'),

  // Filter tests based on user role
  grep: getRoleGrepPattern() ? new RegExp(getRoleGrepPattern()!) : undefined,

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
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
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

  // Configure projects for multiple browsers
  projects: [
    // Login once and save session — all browser projects depend on this.
    // grep is overridden so it always runs regardless of SIGNOZ_USER_ROLE.
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      grep: /.*/,
    },

    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: authFile },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'], storageState: authFile },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'], storageState: authFile },
      dependencies: ['setup'],
    },
  ],
});
