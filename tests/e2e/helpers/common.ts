import type { Page, Request } from '@playwright/test';

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

// ─── Console / network noise ──────────────────────────────────────────────

// Requests the bootstrap stack always fails, on every page, for reasons that
// have nothing to do with the feature under test. Keep this list tiny and give
// every entry a reason — it is a deny-list of *environment* noise, never of real
// application errors.
const HARNESS_FAILING_REQUESTS = [
	// Zeus is a WireMock stub with no /api/v2/zeus/hosts mapping, so the app
	// shell's workspace-URL lookup 404s on every page load. It reaches the console
	// three ways: the resource-load error, the AxiosError, and the literal `any`
	// that `api/ErrorResponseHandler.ts`'s fallback branch logs.
	'/api/v2/zeus/hosts',
	// The app shell polls GitHub for the latest release. Unauthenticated calls
	// from CI/dev machines get rate-limited (403), which has nothing to do with
	// the page under test.
	'api.github.com',
];

// The console side of {@link HARNESS_FAILING_REQUESTS}. Browsers log a
// resource-load error without the URL, so these have to be matched on text —
// which is why the URL list above is the precise half of the check.
const HARNESS_CONSOLE_NOISE = [
	'Failed to load resource: the server responded with a status of 404 (Not Found)',
	'Failed to load resource: the server responded with a status of 403',
	'Request failed with status code 404',
	'client never received a response, or request never left',
	'ErrorResponseHandler: unclassified error',
];

export interface ConsoleWatch {
	/** Console `error` entries and uncaught page errors, harness noise removed. */
	errors: string[];
	/** `"<status> <method> <url>"` for every 4xx/5xx, harness noise removed. */
	failedResponses: string[];
}

/**
 * Watch a page for console errors and failed requests. Call **before** the first
 * navigation; the returned object fills in as the page runs, so assert on it at
 * the end of the scenario.
 *
 * Console text alone is a weak signal (the harness's Zeus 404 produces three
 * generic-looking entries), so the failed-response list is the precise half:
 * text matching is deliberately loose while the URL check stays strict.
 */
export function watchConsole(
	page: Page,
	/**
	 * Extra substrings to ignore. Use this — with a comment naming the defect —
	 * for a *known application* bug that is out of the spec's scope, so the rest
	 * of the console assertion keeps its value instead of being deleted.
	 */
	options: { ignore?: string[] } = {},
): ConsoleWatch {
	const watch: ConsoleWatch = { errors: [], failedResponses: [] };
	const noise = [...HARNESS_CONSOLE_NOISE, ...(options.ignore ?? [])];
	const isNoise = (text: string): boolean =>
		noise.some((entry) => text.includes(entry));

	page.on('console', (msg) => {
		if (msg.type() === 'error' && !isNoise(msg.text())) {
			watch.errors.push(msg.text());
		}
	});
	page.on('pageerror', (err) => {
		if (!isNoise(String(err))) {
			watch.errors.push(String(err));
		}
	});
	page.on('response', (res) => {
		if (res.status() < 400) {
			return;
		}
		const url = res.url();
		if (HARNESS_FAILING_REQUESTS.some((entry) => url.includes(entry))) {
			return;
		}
		watch.failedResponses.push(
			`${res.status()} ${res.request().method()} ${url}`,
		);
	});
	return watch;
}

// ─── Network capture ──────────────────────────────────────────────────────

/**
 * Every request the page issues from now on. Call **before** the first
 * navigation — the returned array fills in as the page runs, so filter it at the
 * end of the scenario ("endpoint called exactly once", "no legacy route used").
 */
export function collectRequests(page: Page): Request[] {
	const requests: Request[] = [];
	page.on('request', (request) => requests.push(request));
	return requests;
}

/** A request's URL, parsed — the readable way to reach `searchParams`. */
export function requestUrl(request: Request): URL {
	return new URL(request.url());
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
