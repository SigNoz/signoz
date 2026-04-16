import { useMemo, useRef } from 'react';

export interface UseEffectiveDataOptions {
	data: unknown[];
	isLoading: boolean;
	limit?: number;
	skeletonRowCount?: number;
}

/**
 * Manages effective data for the table, handling loading states gracefully.
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
		if (data.length > 0) {
			return data as TData[];
		}
		if (prevDataRef.current.length > 0) {
			return prevDataRef.current;
		}
		if (isLoading) {
			const fakeCount = prevDataSizeRef.current || limit || skeletonRowCount;
			return Array.from({ length: fakeCount }, (_, i) => ({
				id: `skeleton-${i}`,
			})) as TData[];
		}
		return data as TData[];
	}, [isLoading, data, limit, skeletonRowCount]);
}
