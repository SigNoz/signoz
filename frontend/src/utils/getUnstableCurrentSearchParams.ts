/**
 * Reads the params nuqs has actually published, which `useLocation().search`
 * (and `useUrlQuery()`) can lag behind.
 *
 * A nuqs write defaults to `shallow: true`, which means it calls
 * `history.replaceState` and stops there. `nuqs/adapters/react-router/v7` only
 * calls the router's `navigate()` when a write opts into `shallow: false`, and
 * nothing here does. A `replaceState` made behind the router's back fires no
 * `popstate`, so the router's location does not move. That is nuqs working as
 * designed, not a version problem: the v5 -> v6 -> v7 migrations did not change
 * it and the adapter swap does not either.
 *
 * Use this whenever you need to build a navigation target on top of the current
 * params, otherwise stale values get republished and nuqs adopts them back on its
 * next flush (it snapshots `window.location.search`).
 */

/**
 * Test seam for the nuqs/router sync this module papers over.
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
