import { useCallback } from 'react';

export type UseRowNavigationParams<TData> = {
	rows: TData[];
	activeIndex: number;
	onNavigate: (row: TData, index: number) => void;
};

export type UseRowNavigationResult = {
	goToPrev: () => void;
	goToNext: () => void;
	isPrevDisabled: boolean;
	isNextDisabled: boolean;
};

/** Steps the active row through the loaded rows; stops at either end. */
export function useRowNavigation<TData>({
	rows,
	activeIndex,
	onNavigate,
}: UseRowNavigationParams<TData>): UseRowNavigationResult {
	const isPrevDisabled = activeIndex <= 0;
	const isNextDisabled = activeIndex < 0 || activeIndex >= rows.length - 1;

	const goToPrev = useCallback((): void => {
		if (!isPrevDisabled) {
			onNavigate(rows[activeIndex - 1], activeIndex - 1);
		}
	}, [isPrevDisabled, onNavigate, rows, activeIndex]);

	const goToNext = useCallback((): void => {
		if (!isNextDisabled) {
			onNavigate(rows[activeIndex + 1], activeIndex + 1);
		}
	}, [isNextDisabled, onNavigate, rows, activeIndex]);

	return { goToPrev, goToNext, isPrevDisabled, isNextDisabled };
}
