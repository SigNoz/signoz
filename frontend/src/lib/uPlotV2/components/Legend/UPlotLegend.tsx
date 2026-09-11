import { useMemo } from 'react';
import useLegendsSync from 'lib/uPlotV2/hooks/useLegendsSync';

import { useLegendActions } from '../../hooks/useLegendActions';
import { LegendPosition, UPlotLegendProps } from '../types';

import Legend from './Legend';

/**
 * uPlot legend controller. Derives the legend items + focus/visibility state
 * from the chart config (useLegendsSync) and the series interactions from the
 * plot context (useLegendActions), then renders the presentational Legend.
 * Must be rendered inside a PlotContextProvider.
 */
export default function UPlotLegend({
	position = LegendPosition.BOTTOM,
	config,
	averageLegendWidth,
}: UPlotLegendProps): JSX.Element {
	const { legendItemsMap, focusedSeriesIndex } = useLegendsSync({ config });
	const { onToggleSeries, onShowOnlySeries, onShowAllSeries, onHoverSeries } =
		useLegendActions();

	const items = useMemo(() => Object.values(legendItemsMap), [legendItemsMap]);

	return (
		<Legend
			items={items}
			position={position}
			averageLegendWidth={averageLegendWidth}
			focusedSeriesIndex={focusedSeriesIndex}
			onToggleSeries={onToggleSeries}
			onShowOnlySeries={onShowOnlySeries}
			onShowAllSeries={onShowAllSeries}
			onHoverSeries={onHoverSeries}
		/>
	);
}
