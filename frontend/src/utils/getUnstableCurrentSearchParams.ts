/**
 * This was introduced to fix a sync bug between Nuqs and react-router-dom
 *
 * We are using the wrong adapter for nuqs because the correct one only supports v6/v7,
 * and we are at version v5. Nuqs writes params straight to the History API, which
 * react-router v5 never observes, so `useLocation().search` (and `useUrlQuery()`) can
 * be several nuqs updates behind the real URL.
 *
 * Use this whenever you need to build a navigation target on top of the current
 * params, otherwise stale values get republished and nuqs adopts them back on its
 * next flush (it snapshots `window.location.search`).
 *
 * We can revert this once we migrate react-router-dom to v6.
 */

/**
 * This was created to help testing the regression introduced between nuqs/react-router-dom
 */
type SearchParamsGetter = () => URLSearchParams;
let getter: SearchParamsGetter = (): URLSearchParams =>
	new URLSearchParams(window.location.search);

/**
 * This function will return a fresh instance of URLSearchParams every time it's called.
 *
 * DO NOT USE IT FOR useEffect/useCallback dependencies, use Nuqs instead.
 */
export function getUnstableCurrentSearchParams(): URLSearchParams {
	return getter();
}

// Testing helpers
export function __setSearchParamsGetterForTest(fn: SearchParamsGetter): void {
	getter = fn;
}

export function __resetSearchParamsGetter(): void {
	getter = (): URLSearchParams => new URLSearchParams(window.location.search);
}
