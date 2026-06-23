import { useMemo } from 'react';
import useLegendsSync from 'lib/uPlotV2/hooks/useLegendsSync';

import { useLegendActions } from '../../hooks/useLegendActions';
import { LegendPosition, UPlotLegendProps } from '../types';

import Legend from './Legend';

/**
 * uPlot legend controller. Derives the legend items + focus/visibility state
 * from the chart config (useLegendsSync) and the toggle/focus interactions from
 * the plot context (useLegendActions), then renders the presentational Legend.
 * Must be rendered inside a PlotContextProvider.
 */
export default function UPlotLegend({
	position = LegendPosition.BOTTOM,
	config,
	averageLegendWidth,
}: UPlotLegendProps): JSX.Element {
	const { legendItemsMap, focusedSeriesIndex, setFocusedSeriesIndex } =
		useLegendsSync({ config });
	const { onLegendClick, onLegendMouseMove, onLegendMouseLeave } =
		useLegendActions({
			setFocusedSeriesIndex,
			focusedSeriesIndex,
		});

	const items = useMemo(() => Object.values(legendItemsMap), [legendItemsMap]);

	return (
		<Legend
			items={items}
			position={position}
			averageLegendWidth={averageLegendWidth}
			focusedSeriesIndex={focusedSeriesIndex}
			onClick={onLegendClick}
			onMouseMove={onLegendMouseMove}
			onMouseLeave={onLegendMouseLeave}
		/>
	);
}
