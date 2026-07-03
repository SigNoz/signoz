import { useEffect } from 'react';
import useGetYAxisUnit from 'hooks/useGetYAxisUnit';

interface UseMetricYAxisUnitArgs {
	/** Only a new panel auto-seeds; editing never overwrites the saved unit. */
	isNewPanel: boolean;
	unit: string | undefined;
	onSelectUnit: (unit: string) => void;
}

interface UseMetricYAxisUnitResult {
	metricUnit: string | undefined;
	isLoading: boolean;
}

/**
 * Resolves the selected metric's unit and, on a new panel only, seeds the formatting unit
 * from it (V1 parity); returns the unit for the selector's mismatch warning.
 */
export function useMetricYAxisUnit({
	isNewPanel,
	unit,
	onSelectUnit,
}: UseMetricYAxisUnitArgs): UseMetricYAxisUnitResult {
	const { yAxisUnit: metricUnit, isLoading } = useGetYAxisUnit();

	useEffect(() => {
		if (isNewPanel && metricUnit && metricUnit !== unit) {
			onSelectUnit(metricUnit);
		}
		// Re-seed only when the resolved metric unit changes, not on every unit edit.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isNewPanel, metricUnit]);

	return { metricUnit, isLoading };
}
