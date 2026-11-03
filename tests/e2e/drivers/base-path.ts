import type { APIRequestContext, Browser, Page } from '@playwright/test';

// Base path mode: with SIGNOZ_E2E_BASE_PATH set (`pnpm env:start:base-path`
// writes `/signoz`), specs run unchanged against SigNoz served under that URL
// prefix. `page.goto`, `page.waitForURL` string targets and `request.*` take
// app paths and get the prefix; `page.url()` and `waitForURL` predicates see
// the URL without it. `expect(page).toHaveURL` still sees the real URL.

export const BASE_PATH = (process.env.SIGNOZ_E2E_BASE_PATH ?? '').replace(
	/\/$/,
	'',
);

/** The app scopes its localStorage keys to the base path (`utils/storage.ts`). */
export function storageKey(key: string): string {
	return BASE_PATH ? `${BASE_PATH}/${key}` : key;
}

function toServedPath(path: string): string {
	return path.startsWith('/') && !path.startsWith('//')
		? `${BASE_PATH}${path}`
		: path;
}

function toAppUrl(href: string): string {
	const url = new URL(href);
	if (url.pathname === BASE_PATH || url.pathname.startsWith(`${BASE_PATH}/`)) {
		url.pathname = url.pathname.slice(BASE_PATH.length) || '/';
	}
	return url.toString();
}

function patchMethod<T extends object, K extends keyof T>(
	proto: T,
	name: K,
	wrap: (original: T[K]) => T[K],
): void {
	proto[name] = wrap(proto[name]);
}

let installed = false;

/**
 * Patches the Page and APIRequestContext prototypes once per worker. Playwright
 * exports neither class, so the prototypes come from a throwaway page.
 */
export async function installBasePathMode(browser: Browser): Promise<void> {
	if (!BASE_PATH || installed) {
		return;
	}
	installed = true;

	const context = await browser.newContext();
	const page = await context.newPage();
	const pageProto: Page = Object.getPrototypeOf(page);
	const requestProto: APIRequestContext = Object.getPrototypeOf(page.request);
	await context.close();

	patchMethod(
		pageProto,
		'goto',
		(goto) =>
			function (this: Page, target, options) {
				return goto.call(this, toServedPath(target), options);
			},
	);

	patchMethod(
		pageProto,
		'url',
		(url) =>
			function (this: Page) {
				return toAppUrl(url.call(this));
			},
	);

	patchMethod(
		pageProto,
		'waitForURL',
		(waitForURL) =>
			function (this: Page, matcher, options) {
				let appMatcher = matcher;
				if (typeof matcher === 'function') {
					appMatcher = (current: URL): boolean =>
						matcher(new URL(toAppUrl(current.href)));
				} else if (typeof matcher === 'string') {
					appMatcher = toServedPath(matcher);
				}
				return waitForURL.call(this, appMatcher, options);
			},
	);

	patchMethod(
		requestProto,
		'fetch',
		(fetch) =>
			function (this: APIRequestContext, target, options) {
				return fetch.call(
					this,
					typeof target === 'string' ? toServedPath(target) : target,
					options,
				);
			},
	);
}
