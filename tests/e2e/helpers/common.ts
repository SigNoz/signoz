import type { Page } from '@playwright/test';

// Shared helpers used across feature-specific helper modules (dashboards,
// trace-details, …). Keep this to genuinely cross-feature utilities.

// ─── Seeder ────────────────────────────────────────────────────────────────

// Base URL of the HTTP seeder container the pytest harness brings up (exposes
// POST/DELETE on /telemetry/{traces,logs,metrics}). Written to
// `tests/e2e/.env.local` as `SIGNOZ_E2E_SEEDER_URL` and read here from the env.
export function seederUrl(): string {
	const url = process.env.SIGNOZ_E2E_SEEDER_URL;
	if (!url) {
		throw new Error(
			'SIGNOZ_E2E_SEEDER_URL not set — pytest test_setup must be running.',
		);
	}
	return url;
}

// ─── Auth ────────────────────────────────────────────────────────────────

// Read the app JWT from the context's stored auth state. No navigation needed:
// the auth fixture loads the admin storageState (localStorage AUTH_TOKEN) into
// the context at creation, so storageState() returns it regardless of the page's
// current URL. Server-side APIs need this as a Bearer token (auth is
// JWT-in-localStorage, not cookies, so request.* doesn't carry it automatically).
export async function authToken(page: Page): Promise<string> {
	const state = await page.context().storageState();
	for (const origin of state.origins) {
		const entry = origin.localStorage.find((e) => e.name === 'AUTH_TOKEN');
		if (entry) {
			return entry.value;
		}
	}
	throw new Error('AUTH_TOKEN not found in storage state — is the page authed?');
}
