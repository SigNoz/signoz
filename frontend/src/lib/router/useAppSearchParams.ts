import { useSearchParams } from 'react-router-dom-v5-compat';

/**
 * v6's `useSearchParams`, which has no v5 equivalent. Its setter navigates
 * through the router.
 */
export function useAppSearchParams(): ReturnType<typeof useSearchParams> {
	return useSearchParams();
}
