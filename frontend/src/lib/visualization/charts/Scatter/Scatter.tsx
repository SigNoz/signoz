import { useCallback, useRef } from 'react';
import ChartWrapper from 'lib/visualization/charts/ChartWrapper/ChartWrapper';
import ScatterTooltip from 'lib/uPlotV2/components/Tooltip/ScatterTooltip';
import {
	ScatterTooltipProps,
	TooltipRenderArgs,
} from 'lib/uPlotV2/components/types';
import { getSeriesStroke } from 'lib/uPlotV2/plugins/ScatterPlugin/scatterPlugin';
import type { ChartClickData } from 'lib/uPlotV2/plugins/TooltipPlugin/types';
import { ScatterChartProps } from 'lib/visualization/charts/types';
import uPlot from 'uplot';

import { getCursorHit } from './utils';

// Faceted uPlot can't mount without series; empty aligned data shows no-data instead.
const EMPTY_ALIGNED_DATA: uPlot.AlignedData = [[]];

export default function Scatter(props: ScatterChartProps): JSX.Element {
	const {
		children,
		customTooltip,
		channels,
		resolvePointLabels,
		pinnedTooltipElement,
		onPointClick,
		plotRef,
		...rest
	} = props;

	const plotInstanceRef = useRef<uPlot | null>(null);

	const handlePlotRef = useCallback(
		(plot: uPlot | null): void => {
			plotInstanceRef.current = plot;
			plotRef?.(plot);
		},
		[plotRef],
	);

	// Faceted plots have no shared x; take the hit from the cursor.
	const handleClick = useCallback(
		(click: ChartClickData): void => {
			const plot = plotInstanceRef.current;
			const hit = plot ? getCursorHit(plot) : null;
			if (!plot || !hit || !onPointClick) {
				return;
			}
			onPointClick({
				...hit,
				color: getSeriesStroke(plot, hit.seriesIndex),
				coordinates: { x: click.absoluteMouseX, y: click.absoluteMouseY },
			});
		},
		[onPointClick],
	);

	const renderTooltip = useCallback(
		(args: TooltipRenderArgs): React.ReactNode => {
			if (customTooltip) {
				return customTooltip(args);
			}
			const tooltipProps: ScatterTooltipProps = {
				...args,
				id: rest.config.getId(),
				channels,
				resolvePointLabels,
				decimalPrecision: rest.decimalPrecision,
				canPinTooltip: rest.canPinTooltip,
				renderTooltipFooter: rest.renderTooltipFooter,
			};
			return <ScatterTooltip {...tooltipProps} />;
		},
		[
			customTooltip,
			channels,
			resolvePointLabels,
			rest.config,
			rest.decimalPrecision,
			rest.canPinTooltip,
			rest.renderTooltipFooter,
		],
	);

	const hasSeries = rest.data.length > 1;

	return (
		<ChartWrapper
			{...rest}
			data={hasSeries ? rest.data : EMPTY_ALIGNED_DATA}
			plotRef={handlePlotRef}
			onClick={onPointClick ? handleClick : rest.onClick}
			customTooltip={renderTooltip}
			pinnedTooltipElement={pinnedTooltipElement}
		>
			{children}
		</ChartWrapper>
	);
}
