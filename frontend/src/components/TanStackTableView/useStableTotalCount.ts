import { useRef } from 'react';

export type UseStableTotalCountParams = {
	total: number | undefined;
	isLoading: boolean;
	/**
	 * Identifies the list being counted. When it changes, the cached count is
	 * dropped so the previous list's page count cannot outlive it.
	 */
	resetKey: string | undefined;
};

/**
 * Holds on to the last non-zero total so the pagination does not flash while the
 * same list refetches, and forgets it as soon as `resetKey` moves to another list.
 */
export function useStableTotalCount({
	total,
	isLoading,
	resetKey,
}: UseStableTotalCountParams): number {
	const prevTotalRef = useRef(total || 0);
	const prevResetKeyRef = useRef(resetKey);

	if (prevResetKeyRef.current !== resetKey) {
		prevResetKeyRef.current = resetKey;
		prevTotalRef.current = 0;
	}

	if (total && total > 0) {
		prevTotalRef.current = total;
	}

	return isLoading ? prevTotalRef.current : total || 0;
}
