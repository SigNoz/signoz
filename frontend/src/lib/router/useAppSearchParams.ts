import { useSearchParams } from 'react-router-dom';

/**
 * Reads and writes go through the router rather than the History API, so
 * unlike `useUrlQuery` this stays in sync with `useAppLocation`.
 */
export function useAppSearchParams(): ReturnType<typeof useSearchParams> {
	return useSearchParams();
}
