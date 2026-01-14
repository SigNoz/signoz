import { Color } from '@signozhq/design-tokens';
import { useTooltip, useTooltipInPortal } from '@visx/tooltip';
import { Typography } from 'antd';
import { ToggleGraphProps } from 'components/Graph/types';
import Uplot from 'components/Uplot';
import GraphManager from 'container/GridCardLayout/GridCard/FullView/GraphManager';
import { getLocalStorageGraphVisibilityState } from 'container/GridCardLayout/GridCard/utils';
import useGraphContextMenu from 'container/QueryTable/Drilldown/useGraphContextMenu';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import heatmapPlugin from 'lib/uPlotLib/plugins/heatmapPlugin';
import {
	calculateTimeBuckets,
	calculateValueBuckets,
	rebucketTimeData,
	rebucketValueData,
} from 'lib/uPlotLib/utils/adaptiveBucketing';
import { ContextMenu, useCoordinates } from 'periscope/components/ContextMenu';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useTimezone } from 'providers/Timezone';
import { useEffect, useMemo, useRef } from 'react';
import { HeatmapData } from 'types/api/v5/queryRange';
import uPlot, { AlignedData } from 'uplot';

import { HEATMAP_COLOR_PALETTES, HeatmapColorPaletteKey } from './constants';
import { PanelWrapperProps } from './panelWrapper.types';
import { tooltipStyles } from './utils';

type FocusedHeatmap = {
	bucketEnds: number[];
	derivedStarts: number[];
	focusedCounts: number[][];
	minY: number;
	maxY: number;
};

type TooltipData = {
	timeRange: string;
	valueRange: string;
	count: number;
	percentage: number;
};

const LOWER_PERCENTILE_THRESHOLD = 0.01;
const UPPER_PERCENTILE_THRESHOLD = 0.99;

const DEFAULT_HEATMAP_STATE = {
	data: ([[], [], [], [], [], []] as unknown) as AlignedData,
	heatmapQueryName: '',
	heatmapUnit: '',
	yAxisRange: { min: 0, max: 100 },
	bucketLabels: [] as string[],
	bucketedTimestamps: [] as number[],
	valueBucketResult: {
		numberOfBuckets: 0,
		bucketSize: 0,
		cellHeight: 0,
		buckets: [] as { start: number; end: number }[],
	},
	minCount: 0,
	maxCount: 0,
	p99Count: 0,
	totalCount: 0,
	timeBucketIntervalMs: 60000,
};

function buildDerivedStarts(
	bucketEnds: number[],
	bucketStarts?: number[],
): number[] {
	if (bucketStarts?.length === bucketEnds.length) return bucketStarts;
	return bucketEnds.map((_, idx) => (idx === 0 ? 0 : bucketEnds[idx - 1]));
}

function computeBucketTotals(
	counts: number[][],
	bucketCount: number,
): { bucketTotals: number[]; total: number } {
	const bucketTotals = new Array(bucketCount).fill(0);
	let total = 0;

	for (let rowIndex = 0; rowIndex < counts.length; rowIndex += 1) {
		const row = counts[rowIndex] || [];
		const rowLen = Math.min(row.length, bucketTotals.length);
		for (let bucketIndex = 0; bucketIndex < rowLen; bucketIndex += 1) {
			const v = row[bucketIndex];
			if (Number.isFinite(v) && v > 0) {
				bucketTotals[bucketIndex] += v;
				total += v;
			}
		}
	}

	return { bucketTotals, total };
}

function findCumulativeIndex(bucketTotals: number[], target: number): number {
	let cum = 0;
	for (let i = 0; i < bucketTotals.length; i += 1) {
		cum += bucketTotals[i];
		if (cum >= target) return i;
	}
	return bucketTotals.length - 1;
}

function findNonZeroRange(
	bucketTotals: number[],
): { minIdx: number; maxIdx: number } {
	let minIdx = 0;
	let maxIdx = bucketTotals.length - 1;

	for (let i = 0; i < bucketTotals.length; i += 1) {
		if (bucketTotals[i] > 0) {
			minIdx = i;
			break;
		}
	}
	for (let i = bucketTotals.length - 1; i >= 0; i -= 1) {
		if (bucketTotals[i] > 0) {
			maxIdx = i;
			break;
		}
	}

	return { minIdx, maxIdx };
}

function focusHeatmap(
	bucketEndsFull: number[],
	bucketStarts: number[] | undefined,
	counts: number[][],
): FocusedHeatmap {
	const derivedStartsFull = buildDerivedStarts(bucketEndsFull, bucketStarts);

	const { bucketTotals, total } = computeBucketTotals(
		counts,
		bucketEndsFull.length,
	);

	let minIdx = 0;
	let maxIdx = bucketEndsFull.length - 1;

	if (total > 0) {
		const lowerTarget = total * LOWER_PERCENTILE_THRESHOLD;
		const upperTarget = total * UPPER_PERCENTILE_THRESHOLD;

		const lowerIdx = findCumulativeIndex(bucketTotals, lowerTarget);
		let upperIdx = findCumulativeIndex(bucketTotals, upperTarget);

		if (upperIdx <= lowerIdx) {
			const nonZero = findNonZeroRange(bucketTotals);
			upperIdx = nonZero.maxIdx;
			minIdx = nonZero.minIdx;
			maxIdx = upperIdx;
		} else {
			minIdx = lowerIdx;
			maxIdx = upperIdx;
		}

		minIdx = Math.max(0, minIdx - 1);
		maxIdx = Math.min(bucketEndsFull.length - 1, maxIdx + 1);
	}

	const bucketEnds = bucketEndsFull.slice(minIdx, maxIdx + 1);
	const derivedStarts = derivedStartsFull.slice(minIdx, maxIdx + 1);
	const focusedCounts = counts.map((row) =>
		(row || []).slice(minIdx, maxIdx + 1),
	);

	const minY = derivedStarts[0] ?? bucketEnds[0];
	let actualMaxIdx = bucketEnds.length - 1;
	for (let i = bucketEnds.length - 1; i >= 0; i -= 1) {
		const hasData = focusedCounts.some((row) => (row[i] ?? 0) > 0);
		if (hasData) {
			actualMaxIdx = i;
			break;
		}
	}
	const maxY = bucketEnds[actualMaxIdx];

	return { bucketEnds, derivedStarts, focusedCounts, minY, maxY };
}

function HeatmapPanelWrapper({
	queryResponse,
	widget,
	setGraphVisibility,
	graphVisibility,
	isFullViewMode,
	onToggleModelHandler,
	enableDrillDown = false,
}: PanelWrapperProps): JSX.Element {
	const graphRef = useRef<HTMLDivElement>(null);
	const lineChartRef = useRef<ToggleGraphProps>();
	const containerBoundsRef = useRef<DOMRect | null>(null);
	const containerDimensions = useResizeObserver(graphRef);
	const isDarkMode = useIsDarkMode();
	const {
		tooltipOpen,
		tooltipLeft,
		tooltipTop,
		tooltipData,
		showTooltip,
		hideTooltip,
	} = useTooltip<TooltipData>();
	const { containerRef, TooltipInPortal } = useTooltipInPortal({
		scroll: true,
		detectBounds: true,
	});
	const { timezone } = useTimezone();
	const { toScrollWidgetId, setToScrollWidgetId } = useDashboard();
	const {
		coordinates,
		popoverPosition,
		clickedData,
		onClose,
		onClick,
		subMenu,
		setSubMenu,
	} = useCoordinates();
	const { menuItemsConfig } = useGraphContextMenu({
		widgetId: widget.id || '',
		query: widget.query,
		graphData: clickedData,
		onClose,
		coordinates,
		subMenu,
		setSubMenu,
		contextLinks: widget.contextLinks,
		panelType: widget.panelTypes,
		queryRange: queryResponse,
	});

	useEffect(() => {
		if (toScrollWidgetId === widget.id) {
			graphRef.current?.scrollIntoView({
				behavior: 'smooth',
				block: 'center',
			});
			graphRef.current?.focus();
			setToScrollWidgetId('');
		}
	}, [toScrollWidgetId, setToScrollWidgetId, widget.id]);

	useEffect(() => {
		const {
			graphVisibilityStates: localStoredVisibilityState,
		} = getLocalStorageGraphVisibilityState({
			apiResponse: queryResponse.data?.payload.data.result || [],
			name: widget.id,
		});
		if (setGraphVisibility) {
			setGraphVisibility(localStoredVisibilityState);
		}
	}, [
		queryResponse?.data?.payload?.data?.result,
		setGraphVisibility,
		widget.id,
	]);

	const rawDataStats = useMemo(() => {
		const queryPayload = queryResponse?.data?.payload as any;
		const results =
			queryPayload?.data?.newResult?.data?.result ||
			queryPayload?.data?.result ||
			[];

		if (results.length === 0) return null;

		const heatmapResult = results.filter(
			(r: any) => r.bucketBounds && r.counts,
		)[0] as HeatmapData;

		if (!heatmapResult) return null;

		const { counts } = heatmapResult;

		const allCounts = counts.flat().filter((c) => Number.isFinite(c) && c > 0);
		const minCount = allCounts.length > 0 ? Math.min(...allCounts) : 0;
		const maxCount = allCounts.length > 0 ? Math.max(...allCounts) : 0;
		const totalCount = allCounts.reduce((sum, c) => sum + c, 0);

		const sortedCounts = [...allCounts].sort((a, b) => a - b);
		const p99Index = Math.floor(sortedCounts.length * 0.99);
		const p99Count = sortedCounts.length > 0 ? sortedCounts[p99Index] : 0;

		return {
			heatmapResult,
			minCount,
			maxCount,
			p99Count,
			totalCount,
		};
	}, [queryResponse]);

	const {
		data,
		heatmapQueryName,
		yAxisRange,
		bucketLabels,
		totalCount,
		timeBucketIntervalMs,
		valueBucketResult,
	} = useMemo(() => {
		if (!rawDataStats) {
			return DEFAULT_HEATMAP_STATE;
		}

		try {
			const {
				heatmapResult,
				minCount,
				maxCount,
				p99Count,
				totalCount,
			} = rawDataStats;
			const { timestamps, bucketBounds, bucketStarts, counts } = heatmapResult;

			const useLogScale = widget.isLogScale;

			const availableWidth = Math.max(
				400,
				(containerDimensions.width || 800) - 80,
			);
			const availableHeight = Math.max(
				200,
				(containerDimensions.height || 300) - 60,
			);

			const queryParams = queryResponse?.data?.params as any;
			const queryStartMs = queryParams?.start || timestamps[0] || Date.now();
			const queryEndMs =
				queryParams?.end || timestamps[timestamps.length - 1] || queryStartMs;

			const timeBucketConfig = {
				minCellSize: 20,
				maxBuckets: 80,
			};

			// Calculate buckets based on time range and available width

			const timeBucketResult = calculateTimeBuckets(
				queryStartMs,
				queryEndMs,
				availableWidth,
				timeBucketConfig,
			);

			const { bucketedTimestamps, bucketedCounts } = rebucketTimeData(
				timestamps,
				counts,
				timeBucketResult,
				queryStartMs,
			);

			const focused = focusHeatmap(bucketBounds, bucketStarts, bucketedCounts);

			const valueBucketConfig = {
				minCellSize: 16,
				maxBuckets: 100,
			};

			// Calculate value buckets based on focused data and available height

			const valueBucketResult = calculateValueBuckets(
				focused.minY,
				focused.maxY,
				availableHeight,
				valueBucketConfig,
				useLogScale,
			);

			const originalBuckets = focused.bucketEnds.map((end, i) => ({
				start: focused.derivedStarts[i],
				end,
			}));

			const {
				bucketedCounts: finalCounts,
				bucketLabels: finalLabels,
			} = rebucketValueData(
				originalBuckets,
				focused.focusedCounts,
				valueBucketResult,
			);

			// Prepare data for uPlot heatmap

			const xValues = bucketedTimestamps.map((ts) => ts / 1000);
			const len = xValues.length;
			const numBuckets = valueBucketResult.buckets.length;

			const bucketStartsFlat = valueBucketResult.buckets.map((b) => b.start);
			const bucketEndsFlat = valueBucketResult.buckets.map((b) => b.end);

			const minBounds = Array(len).fill(0);
			const maxBounds = Array(len).fill(numBuckets);

			const starts2d = Array(len)
				.fill(null)
				.map(() => [...bucketStartsFlat]);
			const ends2d = Array(len)
				.fill(null)
				.map(() => [...bucketEndsFlat]);

			const yMin = valueBucketResult.buckets[0]?.start ?? 0;
			const yMax = valueBucketResult.buckets[numBuckets - 1]?.end ?? 100;

			return {
				data: ([
					xValues,
					minBounds,
					maxBounds,
					starts2d,
					ends2d,
					finalCounts,
				] as unknown) as AlignedData,
				heatmapQueryName: heatmapResult.queryName,
				yAxisRange: { min: yMin, max: yMax },
				bucketLabels: finalLabels,
				bucketedTimestamps,
				valueBucketResult,
				minCount,
				maxCount,
				p99Count,
				totalCount,
				timeBucketIntervalMs: timeBucketResult.intervalMs,
				useLogScale,
			};
		} catch (error) {
			return DEFAULT_HEATMAP_STATE;
		}
	}, [
		rawDataStats,
		containerDimensions.width,
		containerDimensions.height,
		queryResponse?.data?.params,
		widget.isLogScale,
	]);

	const formatDate = useMemo(() => {
		const fmt = new Intl.DateTimeFormat('en-US', {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: true,
			timeZone: timezone.value || undefined,
		});
		return (ms: number): string => fmt.format(new Date(ms));
	}, [timezone.value]);

	const ySplits = undefined;

	const calculateYAxisSize = useMemo(
		() => (
			values: string[] | null,
			ctx: CanvasRenderingContext2D | null,
		): number => {
			if (!values || values.length === 0) return 40;

			const longestVal = values.reduce(
				(acc, val) => (val.length > acc.length ? val : acc),
				'',
			);

			if (longestVal && ctx) {
				const font = '12px system-ui, -apple-system, sans-serif';
				const canvasCtx = ctx;
				canvasCtx.font = font;
				const textWidth = canvasCtx.measureText(longestVal).width;
				return Math.ceil(textWidth / devicePixelRatio) + 25;
			}

			return 60;
		},
		[],
	);

	const calculateTimeRange = useMemo(
		() => (
			xi: number,
		): { timeStart: number; timeEnd: number; timeRange: string } => {
			const timeStart = (data as any)[0]?.[xi] ? (data as any)[0][xi] * 1000 : 0;
			const timeEnd = (data as any)[0]?.[xi + 1]
				? (data as any)[0][xi + 1] * 1000
				: timeStart + timeBucketIntervalMs;

			return {
				timeStart,
				timeEnd,
				timeRange: `${formatDate(timeStart)} → ${formatDate(timeEnd)}`,
			};
		},
		[data, timeBucketIntervalMs, formatDate],
	);

	const handleCellClick = useMemo(
		() => (
			cellData: { xi: number; yi: number; count: number } | null,
			mousePos: { x: number; y: number },
		): void => {
			if (!enableDrillDown || !heatmapQueryName || !cellData || !mousePos) {
				return;
			}

			const { xi, yi } = cellData;
			const label = bucketLabels[yi] || 'Heatmap';

			const { timeRange } = calculateTimeRange(xi);

			onClick(mousePos, {
				queryName: heatmapQueryName,
				filters: [],
				label,
				timeRange,
			});
		},
		[
			enableDrillDown,
			heatmapQueryName,
			bucketLabels,
			onClick,
			calculateTimeRange,
		],
	);

	const handleCellHover = useMemo(
		() => (
			cellData: { xi: number; yi: number; count: number } | null,
			mousePos: { x: number; y: number },
		): void => {
			if (!cellData || !mousePos) {
				hideTooltip();
				return;
			}

			const { xi, yi, count } = cellData;
			const { timeRange } = calculateTimeRange(xi);
			const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0;
			const valueRange = bucketLabels[yi] || '';

			const containerBounds =
				containerBoundsRef.current || graphRef.current?.getBoundingClientRect();
			const leftOffset = containerBounds?.left || 0;
			const topOffset = containerBounds?.top || 0;

			showTooltip({
				tooltipLeft: mousePos.x - leftOffset + 5,
				tooltipTop: mousePos.y - topOffset + 5,
				tooltipData: {
					timeRange,
					valueRange,
					count,
					percentage,
				},
			});
		},
		[
			hideTooltip,
			calculateTimeRange,
			totalCount,
			bucketLabels,
			showTooltip,
			graphRef,
		],
	);

	const findBucketLabel = useMemo(
		() => (splitValue: number): string => {
			const bucketIdx = valueBucketResult.buckets.findIndex(
				(bucket) => splitValue >= bucket.start && splitValue <= bucket.end,
			);

			if (bucketIdx >= 0 && bucketIdx < bucketLabels.length) {
				return bucketLabels[bucketIdx];
			}

			const buckets = valueBucketResult.buckets as Array<{
				start: number;
				end: number;
			}>;
			const closestIdx = buckets.reduce(
				(closest: number, bucket: { start: number; end: number }, idx: number) => {
					const currentDist = Math.min(
						Math.abs(splitValue - bucket.start),
						Math.abs(splitValue - bucket.end),
					);
					const closestDist = Math.min(
						Math.abs(splitValue - buckets[closest].start),
						Math.abs(splitValue - buckets[closest].end),
					);
					return currentDist < closestDist ? idx : closest;
				},
				0,
			);

			return bucketLabels[closestIdx] || '';
		},
		[valueBucketResult.buckets, bucketLabels],
	);

	const heatmapColors = useMemo(() => {
		const paletteKey = (widget.heatmapColorPalette ||
			'default') as HeatmapColorPaletteKey;
		return HEATMAP_COLOR_PALETTES[paletteKey] || HEATMAP_COLOR_PALETTES.default;
	}, [widget.heatmapColorPalette]);

	const options: uPlot.Options = useMemo(() => {
		const axisColor = isDarkMode ? Color.BG_VANILLA_400 : Color.BG_INK_400;

		return {
			width: containerDimensions.width,
			height: containerDimensions.height || 300,
			plugins: [
				heatmapPlugin({
					palette: [...heatmapColors],
					showGrid: true,
					gridColor: isDarkMode
						? 'rgba(0, 0, 0, 0.85)'
						: 'rgba(255, 255, 255, 0.85)',
					hoverStroke: isDarkMode ? 'rgba(255,255,255,0.50)' : 'rgba(0,0,0,0.50)',
					hoverLineWidth: 1,
					emptyColor: isDarkMode ? 'rgb(18, 20, 22)' : 'rgb(240, 242, 245)',
					onClick: handleCellClick,
					onHover: handleCellHover,
				}),
			],
			cursor: { show: true },
			legend: { show: false },
			axes: [
				{
					gap: 10,
					stroke: axisColor,
					grid: { show: false },
				},
				{
					show: true,
					stroke: axisColor,
					grid: { show: false },
					values: (_u: uPlot, splits: number[]): string[] =>
						splits.map((split) => {
							const label = findBucketLabel(split);
							if (widget.yAxisUnit && widget.yAxisUnit !== 'none') {
								return `${label} ${widget.yAxisUnit}`;
							}
							return label;
						}),
					size: (self: uPlot, values: string[] | null): number =>
						calculateYAxisSize(values, self?.ctx || null),
				},
			],
			scales: {
				x: {
					range: (u: uPlot, dataMin: number, dataMax: number): [number, number] => {
						const step = timeBucketIntervalMs / 1000;
						return [dataMin - step * 0.5, dataMax + step * 0.5];
					},
				},
				y: {
					range: (): [number, number] => [yAxisRange.min, yAxisRange.max],
					splits: ySplits,
				},
			},
			series: [
				{ label: 'Time' },
				{
					paths: (): null => null,
					points: { show: false },
				},
				{
					paths: (): null => null,
					points: { show: false },
				},
			],
			tzDate: (timestamp: number): Date =>
				uPlot.tzDate(new Date(timestamp * 1e3), timezone.value),
		};
	}, [
		containerDimensions,
		isDarkMode,
		timezone.value,
		yAxisRange,
		ySplits,
		timeBucketIntervalMs,
		heatmapColors,
		handleCellClick,
		handleCellHover,
		findBucketLabel,
		calculateYAxisSize,
		widget.yAxisUnit,
	]);

	const hasNonHistogramData = useMemo(() => {
		const queryPayload = queryResponse?.data?.payload as any;
		const results =
			queryPayload?.data?.newResult?.data?.result ||
			queryPayload?.data?.result ||
			[];

		if (results.length === 0) return false;

		const hasValidHeatmapData = results.some(
			(r: any) => r.bucketBounds && r.counts,
		);
		return results.length > 0 && !hasValidHeatmapData;
	}, [queryResponse]);

	return (
		<div
			style={{ height: '100%', width: '100%', position: 'relative' }}
			ref={containerRef}
			onMouseEnter={(): void => {
				containerBoundsRef.current =
					graphRef.current?.getBoundingClientRect() ?? null;
			}}
		>
			{hasNonHistogramData ? (
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						height: '100%',
						color: isDarkMode ? Color.BG_VANILLA_400 : Color.BG_INK_400,
						fontSize: '14px',
						textAlign: 'center',
						padding: '20px',
					}}
				>
					<Typography>No Data</Typography>
				</div>
			) : (
				<div ref={graphRef} style={{ height: '100%', width: '100%' }}>
					<Uplot options={options} data={data} />
				</div>
			)}
			{tooltipOpen && tooltipData && !hasNonHistogramData && (
				<TooltipInPortal
					top={tooltipTop}
					left={tooltipLeft}
					style={{
						...tooltipStyles,
						background: isDarkMode ? Color.BG_INK_400 : Color.BG_VANILLA_100,
						color: isDarkMode ? Color.BG_VANILLA_100 : Color.BG_INK_400,
						flexDirection: 'column',
						alignItems: 'flex-start',
						gap: '8px',
						padding: '12px',
						minWidth: '200px',
					}}
				>
					<div style={{ fontSize: '11px', opacity: 0.7 }}>Time Range</div>
					<div style={{ fontSize: '12px', marginBottom: '8px' }}>
						{tooltipData.timeRange}
					</div>

					<div style={{ fontSize: '11px', opacity: 0.7 }}>Value Range</div>
					<div style={{ fontSize: '12px', marginBottom: '8px' }}>
						{tooltipData.valueRange}
					</div>

					<div style={{ fontSize: '11px', opacity: 0.7 }}>Count</div>
					<div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
						{tooltipData.count.toLocaleString()}
					</div>

					<div style={{ fontSize: '11px', opacity: 0.7 }}>Percentage</div>
					<div style={{ fontSize: '12px' }}>
						{tooltipData.percentage.toFixed(2)}% of total
					</div>
				</TooltipInPortal>
			)}
			<ContextMenu
				coordinates={coordinates}
				popoverPosition={popoverPosition}
				title={menuItemsConfig.header as string}
				items={menuItemsConfig.items}
				onClose={onClose}
			/>
			{isFullViewMode && setGraphVisibility && (
				<GraphManager
					data={data}
					name={widget.id}
					options={options}
					yAxisUnit={widget.yAxisUnit}
					onToggleModelHandler={onToggleModelHandler}
					setGraphsVisibilityStates={setGraphVisibility}
					graphsVisibilityStates={graphVisibility}
					lineChartRef={lineChartRef}
				/>
			)}
		</div>
	);
}

export default HeatmapPanelWrapper;
