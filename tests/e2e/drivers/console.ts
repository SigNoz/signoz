import type { Page, Request } from '@playwright/test';

/**
 * Console and network noise, and how to tell it from a real failure.
 *
 * Text matching alone is a weak signal: the harness's Zeus 404 reaches the
 * console three ways, all generic. The failed-response list is the precise half,
 * which is why the URL deny-list stays strict while the text one stays loose.
 */

// Requests the bootstrap stack always fails, on every page, for reasons that
// have nothing to do with the feature under test.
const HARNESS_FAILING_REQUESTS = [
	// Zeus is the cloud control plane, not part of the binary this stack runs, so
	// the app shell's workspace-URL lookup 404s on every page load.
	'/api/v2/zeus/',
	// The app shell polls GitHub for the latest release; unauthenticated calls
	// from CI get rate-limited.
	'api.github.com',
];

const HARNESS_CONSOLE_NOISE = [
	'Failed to load resource: the server responded with a status of 404 (Not Found)',
	'Failed to load resource: the server responded with a status of 403',
	'Request failed with status code 404',
	// `ErrorResponseHandler` logs these for any axios failure, including the
	// requests the app cancels itself when a component unmounts.
	'client never received a response, or request never left',
	'ErrorResponseHandler: unclassified error',
	// Google Fonts, which the chromium project fails at DNS (playwright.config.ts).
	'Failed to load resource: net::ERR_NAME_NOT_RESOLVED',
];

export interface ConsoleWatch {
	/**
	 * Console `error` entries and uncaught page errors, harness noise removed.
	 * A failed resource load ends with its URL.
	 */
	errors: string[];
	/** `"<status> <method> <url>"` for every same-origin 4xx/5xx. */
	failedResponses: string[];
}

function sameOrigin(pageUrl: string, responseUrl: string): boolean {
	try {
		return new URL(pageUrl).origin === new URL(responseUrl).origin;
	} catch {
		return false;
	}
}

/**
 * Watch a page for console errors and failed requests. The `noise` fixture arms
 * this before the first navigation; both arrays fill as the page runs, so assert
 * on them at the end of the scenario.
 *
 * `ignore` takes extra substrings for a *known application* bug out of the
 * spec's scope, so the rest of the assertion keeps its value instead of being
 * deleted. Name the defect when you use it.
 */
export function watchConsole(
	page: Page,
	options: { ignore?: string[] } = {},
): ConsoleWatch {
	const watch: ConsoleWatch = { errors: [], failedResponses: [] };
	const noise = [...HARNESS_CONSOLE_NOISE, ...(options.ignore ?? [])];
	const isNoise = (text: string): boolean =>
		noise.some((entry) => text.includes(entry));

	page.on('console', (message) => {
		if (message.type() !== 'error') {
			return;
		}
		// Chrome leaves the URL out of a failed load's text; its location has it.
		const text = message.text().startsWith('Failed to load resource')
			? `${message.text()} ${message.location().url}`
			: message.text();
		if (!isNoise(text)) {
			watch.errors.push(text);
		}
	});
	page.on('pageerror', (error) => {
		if (!isNoise(String(error))) {
			watch.errors.push(String(error));
		}
	});
	page.on('response', (response) => {
		const url = response.url();
		if (response.status() < 400 || !sameOrigin(page.url(), url)) {
			return;
		}
		if (HARNESS_FAILING_REQUESTS.some((entry) => url.includes(entry))) {
			return;
		}
		watch.failedResponses.push(
			`${response.status()} ${response.request().method()} ${url}`,
		);
	});
	return watch;
}

/**
 * Serve the cloud control plane's endpoints so a console assertion reflects the
 * page under test rather than the deployment shape. Use it in the few specs that
 * assert a clean console end to end.
 */
export async function stubCloudOnlyApis(page: Page): Promise<void> {
	await page.route('**/api/v2/zeus/**', (route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ data: {} }),
		}),
	);
}

/**
 * Every request the page issues from now on. Arm before the first navigation;
 * filter the array at the end of the scenario ("called exactly once", "no legacy
 * route used").
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
