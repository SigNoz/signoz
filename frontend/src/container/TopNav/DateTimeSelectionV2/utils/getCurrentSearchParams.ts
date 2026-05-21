type SearchParamsGetter = () => URLSearchParams;

let getter: SearchParamsGetter = (): URLSearchParams =>
	new URLSearchParams(window.location.search);

export function getCurrentSearchParams(): URLSearchParams {
	return getter();
}

// Testing helpers
export function __setSearchParamsGetterForTest(fn: SearchParamsGetter): void {
	getter = fn;
}

export function __resetSearchParamsGetter(): void {
	getter = (): URLSearchParams => new URLSearchParams(window.location.search);
}
