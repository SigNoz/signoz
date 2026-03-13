import { useCallback } from 'react';
import { QueryParams } from 'constants/query';
import { parseAsString, useQueryState } from 'nuqs';

interface UseUrlYAxisUnitResult {
	yAxisUnit: string;
	onUnitChange: (value: string) => void;
}

/**
 * Hook to manage y-axis unit synchronized with the URL query param.
 * It:
 * - Initializes from `QueryParams.yAxisUnit` or a provided default
 * - Keeps local state in sync when the URL changes (e.g. back/forward, shared links)
 * - Writes updates back to the URL while preserving existing query params
 */
function useUrlYAxisUnit(defaultUnit = ''): UseUrlYAxisUnitResult {
	const [yAxisUnit, setYAxisUnitInUrl] = useQueryState(
		QueryParams.yAxisUnit,
		parseAsString.withDefault(defaultUnit),
	);

	const onUnitChange = useCallback(
		(value: string): void => {
			setYAxisUnitInUrl(value || null);
		},
		[setYAxisUnitInUrl],
	);

	return { yAxisUnit, onUnitChange };
}

export default useUrlYAxisUnit;
