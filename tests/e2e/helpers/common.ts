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

// ─── Console / network watch ──────────────────────────────────────────────────

export interface ConsoleWatch {
	/** `console.error` text and uncaught page errors, in arrival order. */
	errors: string[];
	/** `<status> <url>` for every 4xx/5xx response the page received. */
	failedResponses: string[];
}

// `/api/v2/zeus/*` belongs to the cloud control plane, not to the binary the e2e
// stack runs, so the app's license platform makes it call an endpoint that is
// always a 404 here. `ErrorResponseHandler` logs every one of those, which shows
// up as console noise on any page a console watch is armed on. Stub it so the
// watch reflects the page under test rather than the deployment shape.
export async function stubCloudOnlyApis(page: Page): Promise<void> {
	await page.route('**/api/v2/zeus/**', (route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ data: {} }),
		}),
	);
}

// `ErrorResponseHandler` logs these for *any* axios failure, including requests
// the app cancels itself when a component unmounts, so they say nothing about the
// page under test. Real HTTP failures still land in `failedResponses` with their
// URL, so dropping them costs no coverage.
const IGNORED_CONSOLE_ERRORS = [
	'any',
	'client never received a response, or request never left',
	'Failed to load resource',
];

function sameOrigin(pageUrl: string, responseUrl: string): boolean {
	try {
		return new URL(pageUrl).origin === new URL(responseUrl).origin;
	} catch {
		return false;
	}
}

// Arm before the first navigation: listeners only see events emitted after they
// are attached. Both arrays fill asynchronously, so let the page settle before
// asserting on them.
export function watchConsole(page: Page): ConsoleWatch {
	const watch: ConsoleWatch = { errors: [], failedResponses: [] };
	page.on('console', (message) => {
		const text = message.text();
		const ignored = IGNORED_CONSOLE_ERRORS.some((entry) =>
			text.startsWith(entry),
		);
		if (message.type() === 'error' && !ignored) {
			watch.errors.push(text);
		}
	});
	page.on('pageerror', (error) => {
		watch.errors.push(error.message);
	});
	page.on('response', (response) => {
		// Same-origin only. The app also calls third-party endpoints it does not
		// control (the GitHub releases check is rate-limited and 403s regularly),
		// and their status says nothing about the page under test.
		if (response.status() >= 400 && sameOrigin(page.url(), response.url())) {
			watch.failedResponses.push(`${response.status()} ${response.url()}`);
		}
	});
	return watch;
}
