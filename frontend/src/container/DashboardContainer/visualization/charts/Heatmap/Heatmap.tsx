import { useCallback, useMemo, useRef, useState } from 'react';
import ChartWrapper from 'container/DashboardContainer/visualization/charts/ChartWrapper/ChartWrapper';
import ColorBar from 'lib/uPlotV2/components/ColorBar/ColorBar';
import Legend from 'lib/uPlotV2/components/Legend/Legend';
import HeatmapTooltip from 'lib/uPlotV2/components/Tooltip/HeatmapTooltip';
import {
	LegendPosition,
	TooltipRenderArgs,
} from 'lib/uPlotV2/components/types';
import {
	createHeatmapColorResolver,
	DEFAULT_HEATMAP_COLORS,
	resolveCountDomain,
	resolveExtremeColor,
} from 'lib/uPlotV2/plugins/HeatmapPlugin/colorScale';
import type { LegendItem } from 'lib/uPlotV2/config/types';
import { resolveHeatmapYAxis } from 'lib/uPlotV2/plugins/HeatmapPlugin/geometry';
import {
	resolveGroupPeaks,
	resolveHeatmapGrid,
} from 'lib/uPlotV2/plugins/HeatmapPlugin/grid';
import {
	HeatmapAxisScale,
	HeatmapCell,
	HeatmapColorMode,
} from 'lib/uPlotV2/plugins/HeatmapPlugin/types';
import { ChartClickData } from 'lib/uPlotV2/plugins/TooltipPlugin/types';

import { HeatmapChartProps } from './types';
import { useHeatmapGroupLegend } from './useHeatmapGroupLegend';
import { buildHeatmapConfig, prepareHeatmapChartData } from './utils';

/** Vertical space the colour bar takes out of the container. */
const COLOR_BAR_HEIGHT = 28;

/**
 * Columns are time slices, rows are bucket ranges, cell colour is the observation
 * count — so a distribution can be watched changing shape instead of collapsing to
 * percentile lines. Drawn on canvas (see `createHeatmapHooks`): a 40 × 240 grid is
 * ~9,600 cells, far past what per-cell DOM carries.
 */
export default function Heatmap(props: HeatmapChartProps): JSX.Element {
	const {
		id,
		buckets,
		step,
		series,
		width,
		height,
		isDarkMode,
		axisScale = HeatmapAxisScale.Log,
		yAxisUnit,
		decimalPrecision,
		timezone,
		showVisualMap = true,
		showLegend = true,
		legendPosition = LegendPosition.BOTTOM,
		dimOnHover = true,
		showTooltip = true,
		canPinTooltip = false,
		pinKey,
		seriesColor,
		minTimeScale,
		maxTimeScale,
		onDragSelect,
		onCellClick,
		renderTooltipFooter,
		tooltipPortalRoot,
		layoutChildren,
		'data-testid': testId,
	} = props;

	const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null);
	const hoveredCellRef = useRef<HeatmapCell | null>(null);
	const onCellClickRef = useRef(onCellClick);
	onCellClickRef.current = onCellClick;

	const groups = useMemo(() => series.map((entry) => entry.label), [series]);

	// One series has nothing to choose between.
	const hasGroupLegend = showLegend && groups.length > 1;

	const colors = useMemo(
		() => ({ ...DEFAULT_HEATMAP_COLORS, ...props.colors }),
		[props.colors],
	);

	// The opacity fill no longer follows a group colour: with several groups enabled
	// at once there is no single one to follow.
	const resolvedSeriesColor = seriesColor ?? DEFAULT_HEATMAP_COLORS.fill;

	// Opacity mode keeps the solid fill; a partially transparent marker is hard to
	// read against the panel.
	const extremeColor = resolveExtremeColor({
		options: colors,
		isDarkMode,
		seriesColor: resolvedSeriesColor,
	});

	const {
		visibleGroups,
		focusedSeriesIndex,
		onLegendClick,
		onLegendMouseMove,
		onLegendMouseLeave,
	} = useHeatmapGroupLegend({ groups });

	const grid = useMemo(
		() => resolveHeatmapGrid({ buckets, step, series, visibleGroups }),
		[buckets, step, series, visibleGroups],
	);

	const yAxis = useMemo(
		() => resolveHeatmapYAxis(grid.bounds, axisScale),
		[grid.bounds, axisScale],
	);

	const hasGrid = yAxis.rows.length > 0 && grid.timestamps.length > 0;

	const data = useMemo(
		() =>
			hasGrid
				? prepareHeatmapChartData(grid, yAxis.rows.length)
				: ([[]] as unknown as ReturnType<typeof prepareHeatmapChartData>),
		[grid, yAxis.rows.length, hasGrid],
	);

	const colorResolver = useMemo(
		() =>
			createHeatmapColorResolver({
				options: colors,
				domain: resolveCountDomain(colors, grid.counts),
				isDarkMode,
				seriesColor: resolvedSeriesColor,
			}),
		[colors, grid.counts, isDarkMode, resolvedSeriesColor],
	);

	// Stable: the renderer captures it at config-build time, so a new identity would
	// recreate the plot on every hover.
	const handleHoverChange = useCallback((cell: HeatmapCell | null): void => {
		hoveredCellRef.current = cell;
		setHoveredCell(cell);
	}, []);

	const config = useMemo(
		() =>
			buildHeatmapConfig({
				id,
				grid,
				yAxis,
				colors,
				isDarkMode,
				seriesColor: resolvedSeriesColor,
				dimOnHover,
				onHoverChange: handleHoverChange,
				yAxisUnit,
				decimalPrecision,
				timezone,
				minTimeScale,
				maxTimeScale,
				onDragSelect,
			}),
		[
			id,
			grid,
			yAxis,
			colors,
			isDarkMode,
			resolvedSeriesColor,
			dimOnHover,
			handleHoverChange,
			yAxisUnit,
			decimalPrecision,
			timezone,
			minTimeScale,
			maxTimeScale,
			onDragSelect,
		],
	);

	// Each marker takes the ramp colour for where that group's densest cell falls on
	// the colour bar, so a swatch reads against the same scale as the grid.
	const groupPeaks = useMemo(() => resolveGroupPeaks(series), [series]);
	const isPaletteMode = colors.mode === HeatmapColorMode.Palette;

	const legendItems = useMemo<LegendItem[]>(
		() =>
			groups.map((group, index) => ({
				// +1 mirrors uPlot's 1-based data series, so the shared legend's index
				// handling is identical across charts.
				seriesIndex: index + 1,
				label: group,
				color: isPaletteMode
					? (colorResolver.colorFor(groupPeaks.get(group) ?? 0) ?? extremeColor)
					: extremeColor,
				show: visibleGroups.includes(group),
			})),
		[
			groups,
			visibleGroups,
			isPaletteMode,
			colorResolver,
			groupPeaks,
			extremeColor,
		],
	);

	const renderTooltip = useCallback(
		(args: TooltipRenderArgs): React.ReactNode => (
			<HeatmapTooltip
				{...args}
				id={id}
				yAxis={yAxis}
				step={grid.step}
				series={series}
				visibleGroups={visibleGroups}
				groupColor={extremeColor}
				yAxisUnit={yAxisUnit}
				decimalPrecision={decimalPrecision}
				timezone={timezone}
				canPinTooltip={canPinTooltip}
				renderTooltipFooter={renderTooltipFooter}
			/>
		),
		[
			id,
			yAxis,
			grid.step,
			series,
			visibleGroups,
			extremeColor,
			yAxisUnit,
			decimalPrecision,
			timezone,
			canPinTooltip,
			renderTooltipFooter,
		],
	);

	const handleClick = useCallback((clickData: ChartClickData): void => {
		if (hoveredCellRef.current) {
			onCellClickRef.current?.(hoveredCellRef.current, clickData);
		}
	}, []);

	const groupLegend = useCallback(
		(averageLegendWidth: number): React.ReactNode => (
			<Legend
				items={legendItems}
				position={legendPosition}
				averageLegendWidth={averageLegendWidth}
				focusedSeriesIndex={focusedSeriesIndex}
				onClick={onLegendClick}
				onMouseMove={onLegendMouseMove}
				onMouseLeave={onLegendMouseLeave}
			/>
		),
		[
			legendItems,
			legendPosition,
			focusedSeriesIndex,
			onLegendClick,
			onLegendMouseMove,
			onLegendMouseLeave,
		],
	);

	const visualMap = useMemo(() => {
		if (!showVisualMap || !hasGrid) {
			return null;
		}
		return (
			<ColorBar
				label="count"
				ramp={colorResolver.ramp}
				minLabel={colorResolver.domain.min.toLocaleString()}
				maxLabel={colorResolver.domain.max.toLocaleString()}
				markerPosition={colorResolver.positionOf(hoveredCell?.count ?? null)}
			/>
		);
	}, [showVisualMap, hasGrid, colorResolver, hoveredCell]);

	return (
		<ChartWrapper
			config={config}
			data={data}
			width={width}
			height={
				showVisualMap && hasGrid ? Math.max(0, height - COLOR_BAR_HEIGHT) : height
			}
			legendConfig={{ position: legendPosition }}
			showLegend={hasGroupLegend}
			customLegend={groupLegend}
			legendLabels={groups}
			showTooltip={showTooltip}
			canPinTooltip={canPinTooltip}
			pinKey={pinKey}
			onClick={onCellClick ? handleClick : undefined}
			yAxisUnit={yAxisUnit}
			decimalPrecision={decimalPrecision}
			timezone={timezone}
			customTooltip={renderTooltip}
			renderTooltipFooter={renderTooltipFooter}
			tooltipPortalRoot={tooltipPortalRoot}
			contentFooter={visualMap}
			layoutChildren={layoutChildren}
			data-testid={testId}
		/>
	);
}
