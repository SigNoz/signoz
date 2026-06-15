// Helpers for tests that drive components built with `nuqs`.
//
// We replace `NuqsAdapter` (which throttles URL writes to `window.history`)
// with `NuqsTestingAdapter`. The testing adapter applies URL updates
// synchronously (`rateLimitFactor: 0`) and stores state in memory
// (`hasMemory: true`) so subsequent reads see the latest value without any
// `flushNuqsUrl` sleep. Each test gets a fresh queue because
// `resetUrlUpdateQueueOnMount` defaults to `true`.
//
// Reads on `window.location.search` are no longer authoritative since the
// adapter does not push to the browser history. Use
// `getCurrentNuqsQueryString()` (or assert on `lastNuqsUrlUpdate`) instead.

import type { OnUrlUpdateFunction } from 'nuqs/adapters/testing';

let lastUrlUpdate: { searchParams: URLSearchParams; queryString: string } = {
	searchParams: new URLSearchParams(),
	queryString: '',
};

export function resetNuqsState(initialQuery = ''): void {
	lastUrlUpdate = {
		searchParams: new URLSearchParams(initialQuery),
		queryString: initialQuery,
	};
}

export const onNuqsUrlUpdate: OnUrlUpdateFunction = (event) => {
	lastUrlUpdate = {
		searchParams: event.searchParams,
		queryString: event.queryString,
	};
};

export function getCurrentNuqsQueryString(): string {
	return lastUrlUpdate.queryString;
}

export function getCurrentNuqsSearchParams(): URLSearchParams {
	return lastUrlUpdate.searchParams;
}
