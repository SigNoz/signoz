/**
 * This was introduced to fix a sync bug between Nuqs and react-router-dom
 *
 * We are using the wrong adapter for nuqs because the correct one only supports v6/v7,
 * and we are at version v5. This causes the nuqs/react-router-dom to be out of sync.
 *
 * We can revert this commit once we migrate react-router-dom to v6, or once we migrate
 * to DateTimeSelectionV3
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
