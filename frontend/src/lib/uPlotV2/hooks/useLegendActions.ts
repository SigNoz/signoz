import { useCallback, useEffect, useRef } from 'react';
import { usePlotContext } from 'lib/uPlotV2/context/PlotContext';

export interface UseLegendActionsResult {
	onToggleSeries: (seriesIndex: number) => void;
	/** Show this series alone, or show all when it is already alone. */
	onShowOnlySeries: (seriesIndex: number) => void;
	/** Show this series alongside the ones already shown. */
	onShowSeries: (seriesIndex: number) => void;
	/** null clears the highlight. */
	onHoverSeries: (seriesIndex: number | null) => void;
}

/**
 * Legend interactions, bound to the plot through PlotContext. Hover is coalesced
 * to one chart redraw per frame.
 */
export function useLegendActions(): UseLegendActionsResult {
	const {
		onToggleSeriesOnOff,
		onShowOnlySeries,
		onShowSeries,
		onHighlightSeries,
	} = usePlotContext();

	const rafIdRef = useRef<number | null>(null);

	const cancelPendingHighlight = useCallback((): void => {
		if (rafIdRef.current != null) {
			cancelAnimationFrame(rafIdRef.current);
			rafIdRef.current = null;
		}
	}, []);

	const onHoverSeries = useCallback(
		(seriesIndex: number | null): void => {
			cancelPendingHighlight();
			rafIdRef.current = requestAnimationFrame(() => {
				rafIdRef.current = null;
				onHighlightSeries(seriesIndex);
			});
		},
		[cancelPendingHighlight, onHighlightSeries],
	);

	useEffect(() => cancelPendingHighlight, [cancelPendingHighlight]);

	return {
		onToggleSeries: onToggleSeriesOnOff,
		onShowOnlySeries,
		onShowSeries,
		onHoverSeries,
	};
}
