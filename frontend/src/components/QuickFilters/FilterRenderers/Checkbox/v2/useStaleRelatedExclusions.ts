import { useEffect, useMemo, useRef } from 'react';

const EMPTY: string[] = [];

interface UseStaleRelatedExclusionsParams {
	selectedValues: string[];
	isFetching: boolean;
	isRefreshing: boolean;
}

export function useStaleRelatedExclusions({
	selectedValues,
	isFetching,
	isRefreshing,
}: UseStaleRelatedExclusionsParams): string[] {
	const selectionAtLastFetchRef = useRef<string[]>(selectedValues);

	useEffect(() => {
		if (!isFetching) {
			selectionAtLastFetchRef.current = selectedValues;
		}
	}, [isFetching, selectedValues]);

	return useMemo(() => {
		if (!isRefreshing) {
			return EMPTY;
		}

		const current = new Set(selectedValues);
		const removed = selectionAtLastFetchRef.current.filter(
			(value) => !current.has(value),
		);

		return removed.length ? removed : EMPTY;
	}, [isRefreshing, selectedValues]);
}
