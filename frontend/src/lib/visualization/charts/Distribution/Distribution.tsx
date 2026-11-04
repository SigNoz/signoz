import { useCallback, useMemo } from 'react';
import Legend from 'lib/uPlotV2/components/Legend/Legend';
import { LegendPosition } from 'lib/uPlotV2/components/types';
import type { LegendItem } from 'lib/uPlotV2/config/types';
import { StackMode } from 'lib/uPlotV2/config/types';
import ChartWrapper from 'lib/visualization/charts/ChartWrapper/ChartWrapper';
import { resolveBoundaryPrecision } from 'lib/visualization/charts/Heatmap/utils';
import { DistributionChartProps } from 'lib/visualization/charts/types';
import { useLegendVisibility } from 'lib/visualization/hooks/useLegendVisibility';
import type { LegendLayout } from 'lib/visualization/layout/ChartLayout/ChartLayout';

import {
	cropDistributionXAxis,
	resolveDistributionBars,
	resolveDistributionXAxis,
	sumVisibleCounts,
} from './layout';
import { DistributionXScale, DistributionYScale } from './types';
import {
	buildDistributionConfig,
	prepareDistributionChartData,
	resolveSeriesColor,
} from './utils';

export default function Distribution({
	id,
	buckets,
	series,
	width,
	height,
	isDarkMode,
	xScale = DistributionXScale.Auto,
	yScale = DistributionYScale.Linear,
	stack = StackMode.Normal,
	xAxisUnit,
	decimalPrecision,
	customColors,
	showLegend = true,
	legendPosition = LegendPosition.BOTTOM,
	showTooltip = false,
	canPinTooltip = false,
	renderTooltipFooter,
	tooltipPortalRoot,
	layoutChildren,
	'data-testid': testId,
}: DistributionChartProps): JSX.Element {
	const labels = useMemo(() => series.map((entry) => entry.label), [series]);
	const counts = useMemo(() => series.map((entry) => entry.counts), [series]);

	const { visibleKeys, focusedSeriesIndex, onLegendAction } =
		useLegendVisibility({ keys: labels, indexOffset: 1, id });

	const visible = useMemo(
		() => labels.map((label) => visibleKeys.includes(label)),
		[labels, visibleKeys],
	);

	const colors = useMemo(
		() =>
			labels.map((label) => resolveSeriesColor(label, isDarkMode, customColors)),
		[labels, isDarkMode, customColors],
	);

	const xAxis = useMemo(() => {
		const full = resolveDistributionXAxis(buckets, xScale);
		return cropDistributionXAxis(
			full,
			sumVisibleCounts(counts, visible, full.rows.length),
		);
	}, [buckets, xScale, counts, visible]);

	const isLogY =
		yScale === DistributionYScale.Log && stack !== StackMode.Percent;

	const layout = useMemo(
		() => resolveDistributionBars({ xAxis, counts, visible, stack, isLogY }),
		[xAxis, counts, visible, stack, isLogY],
	);

	const boundaryPrecision = useMemo(
		() =>
			resolveBoundaryPrecision({
				yAxis: xAxis,
				yAxisUnit: xAxisUnit,
				decimalPrecision,
			}),
		[xAxis, xAxisUnit, decimalPrecision],
	);

	const config = useMemo(
		() =>
			buildDistributionConfig({
				id,
				xAxis,
				layout,
				labels,
				colors,
				visible,
				stack,
				isLogY,
				isDarkMode,
				xAxisUnit,
				decimalPrecision: boundaryPrecision,
			}),
		[
			id,
			xAxis,
			layout,
			labels,
			colors,
			visible,
			stack,
			isLogY,
			isDarkMode,
			xAxisUnit,
			boundaryPrecision,
		],
	);

	const data = useMemo(
		() => prepareDistributionChartData(xAxis, counts),
		[xAxis, counts],
	);

	const legendItems = useMemo<LegendItem[]>(
		() =>
			labels.map((label, index) => ({
				seriesIndex: index + 1,
				label,
				color: colors[index],
				show: visible[index],
			})),
		[labels, colors, visible],
	);

	const groupLegend = useCallback(
		({ averageLegendWidth, showSearch }: LegendLayout): React.ReactNode => (
			<Legend
				items={legendItems}
				position={legendPosition}
				averageLegendWidth={averageLegendWidth}
				showSearch={showSearch}
				itemLabel="groups"
				focusedSeriesIndex={focusedSeriesIndex}
				onAction={onLegendAction}
			/>
		),
		[legendItems, legendPosition, focusedSeriesIndex, onLegendAction],
	);

	return (
		<ChartWrapper
			config={config}
			data={data}
			width={width}
			height={height}
			legendConfig={{ position: legendPosition }}
			showLegend={showLegend}
			customLegend={groupLegend}
			legendLabels={labels}
			showTooltip={showTooltip}
			canPinTooltip={canPinTooltip}
			decimalPrecision={decimalPrecision}
			renderTooltipFooter={renderTooltipFooter}
			tooltipPortalRoot={tooltipPortalRoot}
			layoutChildren={layoutChildren}
			data-testid={testId}
		/>
	);
}
