import { useSearchParams } from 'react-router-dom-v5-compat';

/**
 * v6's `useSearchParams`, which has no v5 equivalent. Reads and writes go
 * through the router rather than the History API, so unlike `useUrlQuery` this
 * stays in sync with `useAppLocation`.
 */
export function useAppSearchParams(): ReturnType<typeof useSearchParams> {
	return useSearchParams();
}
