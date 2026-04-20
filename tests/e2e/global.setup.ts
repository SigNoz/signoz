import fs from 'fs';
import path from 'path';

/**
 * Loads backend coordinates written by the pytest test_setup / test_e2e entry
 * points (at tests/e2e/.signoz-backend.json) and exports them as env vars for
 * the Playwright projects.
 *
 * If SIGNOZ_E2E_BASE_URL is already set (staging fallback, or the pytest-run
 * case where env is injected directly), this is a no-op.
 */
export default async function globalSetup(): Promise<void> {
  if (process.env.SIGNOZ_E2E_BASE_URL) return;

  const endpointsPath = path.resolve(__dirname, '.signoz-backend.json');
  if (!fs.existsSync(endpointsPath)) {
    throw new Error(
      'No .signoz-backend.json. Bring the backend up first:\n' +
        '  cd signoz/tests && uv run pytest --basetemp=./tmp/ --reuse --with-web e2e/src/bootstrap/setup.py::test_setup',
    );
  }

  const endpoints = JSON.parse(fs.readFileSync(endpointsPath, 'utf8')) as {
    base_url: string;
    admin_email: string;
    admin_password: string;
    seeder_url?: string;
  };

  process.env.SIGNOZ_E2E_BASE_URL = endpoints.base_url;
  process.env.SIGNOZ_E2E_USERNAME = endpoints.admin_email;
  process.env.SIGNOZ_E2E_PASSWORD = endpoints.admin_password;
  if (endpoints.seeder_url) {
    process.env.SIGNOZ_E2E_SEEDER_URL = endpoints.seeder_url;
  }
}
