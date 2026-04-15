import { useMemo, useRef } from 'react';

export interface UseEffectiveDataOptions {
	/** Current data array */
	data: unknown[];
	/** Whether the table is loading */
	isLoading: boolean;
	/** Page size limit for skeleton fallback */
	limit?: number;
	/** Number of skeleton rows to show when no data */
	skeletonRowCount?: number;
}

/**
 * Manages effective data for the table, handling loading states gracefully.
 *
 * Returns:
 * - Current data when available
 * - Previous data during loading (avoids flash)
 * - Skeleton data for initial load
 */
export function useEffectiveData<TData>({
	data,
	isLoading,
	limit,
	skeletonRowCount = 10,
}: UseEffectiveDataOptions): TData[] {
	const prevDataRef = useRef<TData[]>(data as TData[]);
	const prevDataSizeRef = useRef(data.length || limit || skeletonRowCount);

	// Update refs when we have real data (not loading)
	if (!isLoading && data.length > 0) {
		prevDataRef.current = data as TData[];
		prevDataSizeRef.current = data.length;
	}

	return useMemo((): TData[] => {
		// Have current data - use it
		if (data.length > 0) {
			return data as TData[];
		}
		// No current data but have previous data - use previous (avoids flash)
		if (prevDataRef.current.length > 0) {
			return prevDataRef.current;
		}
		// No data at all - create fake data for skeleton rows if loading
		if (isLoading) {
			const fakeCount = prevDataSizeRef.current || limit || skeletonRowCount;
			return Array.from({ length: fakeCount }, (_, i) => ({
				id: `skeleton-${i}`,
			})) as TData[];
		}
		// Not loading and no data - return empty
		return data as TData[];
	}, [isLoading, data, limit, skeletonRowCount]);
}
