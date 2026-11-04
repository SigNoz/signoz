import { useSearchParams } from 'react-router';

/**
 * Its setter navigates through the router.
 */
export function useAppSearchParams(): ReturnType<typeof useSearchParams> {
	return useSearchParams();
}
