import { useCallback, useEffect, useRef } from 'react';
import { usePlotContext } from 'lib/uPlotV2/context/PlotContext';

import {
	LegendAction,
	LegendActionPayload,
	OnLegendAction,
} from '../components/types';

/**
 * Legend interactions, bound to the plot through PlotContext. Hover is coalesced
 * to one chart redraw per frame.
 */
export function useLegendActions(): OnLegendAction {
	const {
		onToggleSeriesOnOff,
		onShowOnlySeries,
		onShowAllSeries,
		onHighlightSeries,
	} = usePlotContext();

	const rafIdRef = useRef<number | null>(null);

	const cancelPendingHighlight = useCallback((): void => {
		if (rafIdRef.current != null) {
			cancelAnimationFrame(rafIdRef.current);
			rafIdRef.current = null;
		}
	}, []);

	useEffect(() => cancelPendingHighlight, [cancelPendingHighlight]);

	return useCallback(
		(payload: LegendActionPayload): void => {
			switch (payload.type) {
				case LegendAction.TOGGLE:
					onToggleSeriesOnOff(payload.seriesIndex);
					break;
				case LegendAction.SHOW_ONLY:
					onShowOnlySeries(payload.seriesIndex);
					break;
				case LegendAction.SHOW_ALL:
					onShowAllSeries();
					break;
				case LegendAction.HOVER: {
					const { seriesIndex } = payload;
					cancelPendingHighlight();
					rafIdRef.current = requestAnimationFrame(() => {
						rafIdRef.current = null;
						onHighlightSeries(seriesIndex);
					});
					break;
				}
				default:
					break;
			}
		},
		[
			cancelPendingHighlight,
			onHighlightSeries,
			onShowAllSeries,
			onShowOnlySeries,
			onToggleSeriesOnOff,
		],
	);
}
