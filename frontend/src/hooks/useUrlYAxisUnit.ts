import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { QueryParams } from 'constants/query';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';

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
	const urlQuery = useUrlQuery();
	const location = useLocation();
	const { safeNavigate } = useSafeNavigate();

	const initialUnit = urlQuery.get(QueryParams.yAxisUnit) ?? defaultUnit;
	const [yAxisUnit, setYAxisUnit] = useState<string>(initialUnit);

	// Sync yAxisUnit when URL param changes (e.g. browser back or shared link)
	useEffect(() => {
		const fromUrl = urlQuery.get(QueryParams.yAxisUnit) ?? defaultUnit;
		if (fromUrl !== yAxisUnit) {
			setYAxisUnit(fromUrl);
		}
		// Only react to URL param changes
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [location.search]);

	const onUnitChange = useCallback(
		(value: string): void => {
			setYAxisUnit(value);

			const params = new URLSearchParams(urlQuery);
			if (value) {
				params.set(QueryParams.yAxisUnit, value);
			} else {
				params.delete(QueryParams.yAxisUnit);
			}

			safeNavigate({
				pathname: location.pathname,
				search: `?${params.toString()}`,
			});
		},
		[location.pathname, safeNavigate, urlQuery],
	);

	return { yAxisUnit, onUnitChange };
}

export default useUrlYAxisUnit;
