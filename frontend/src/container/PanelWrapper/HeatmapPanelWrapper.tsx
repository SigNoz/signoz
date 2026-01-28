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
	createExplicitValueBuckets,
	rebucketTimeData,
	rebucketValueData,
} from 'lib/uPlotLib/utils/adaptiveBucketing';
import { ContextMenu, useCoordinates } from 'periscope/components/ContextMenu';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useTimezone } from 'providers/Timezone';
import { useEffect, useMemo, useRef } from 'react';
import { BucketData } from 'types/api/v5/queryRange';
import uPlot, { AlignedData } from 'uplot';

import { HEATMAP_COLOR_PALETTES, HeatmapColorPaletteKey } from './constants';
import { PanelWrapperProps } from './panelWrapper.types';
import { focusHeatmap, formatBucketValue, tooltipStyles } from './utils';

type TooltipData = {
	timeRange: string;
	valueRange: string;
	count: number;
	percentage: number;
};

const BUCKET_EPSILON = 0.000001;

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
	ySplits: undefined as number[] | undefined,
};

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
		)[0] as BucketData;

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

	/* eslint-disable sonarjs/cognitive-complexity */
	const {
		data,
		heatmapQueryName,
		yAxisRange,
		bucketLabels,
		totalCount,
		timeBucketIntervalMs,
		valueBucketResult,
		ySplits,
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
			const {
				timestamps,
				bucketBounds,
				bucketStarts,
				counts,
				bucketCount,
			} = heatmapResult;

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

			// If bucketCount is specified (user explicitly set N in heatmap(field, N)),
			const isBucketCountSpecified = bucketCount && bucketCount > 0;

			let valueBucketResult;
			let finalCounts;
			let finalLabels;

			if (isBucketCountSpecified) {
				const originalBuckets = focused.bucketEnds.map((end, i) => ({
					start: focused.derivedStarts[i],
					end,
				}));

				// Filter out zero-width or reversed buckets
				const validIndices: number[] = [];
				const filteredBuckets = originalBuckets.filter((bucket, index) => {
					const isValid = bucket.end > bucket.start + BUCKET_EPSILON;
					if (isValid) {
						validIndices.push(index);
					}
					return isValid;
				});

				const labeledBuckets = filteredBuckets;

				valueBucketResult = createExplicitValueBuckets(
					labeledBuckets,
					availableHeight,
				);

				finalCounts = focused.focusedCounts.map((row) =>
					validIndices.map((idx) => row[idx]),
				);

				finalLabels = labeledBuckets.map((bucket) => {
					const start = formatBucketValue(bucket.start);
					const end = formatBucketValue(bucket.end);
					return `${start}-${end}`;
				});
			} else {
				const valueBucketConfig = {
					minCellSize: 16,
					maxBuckets: 100,
				};

				// Calculate value buckets based on focused data and available height
				valueBucketResult = calculateValueBuckets(
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

				const rebucketResult = rebucketValueData(
					originalBuckets,
					focused.focusedCounts,
					valueBucketResult,
				);

				finalCounts = rebucketResult.bucketedCounts;
				finalLabels = rebucketResult.bucketLabels;
			}

			// Prepare data for uPlot heatmap

			const xValues = bucketedTimestamps.map((ts) => ts / 1000);
			const len = xValues.length;
			const numBuckets = valueBucketResult.buckets.length;

			let bucketStartsFlat = valueBucketResult.buckets.map((b) => b.start);
			let bucketEndsFlat = valueBucketResult.buckets.map((b) => b.end);

			if (isBucketCountSpecified) {
				bucketStartsFlat = valueBucketResult.buckets.map((_, i) => i);
				bucketEndsFlat = valueBucketResult.buckets.map((_, i) => i + 1);
			}

			const minBounds = Array(len).fill(0);
			const maxBounds = Array(len).fill(numBuckets);

			const starts2d = Array(len)
				.fill(null)
				.map(() => [...bucketStartsFlat]);
			const ends2d = Array(len)
				.fill(null)
				.map(() => [...bucketEndsFlat]);

			let yMin = valueBucketResult.buckets[0]?.start ?? 0;
			let yMax = valueBucketResult.buckets[numBuckets - 1]?.end ?? 100;

			if (isBucketCountSpecified) {
				yMin = 0;
				yMax = numBuckets;
			}

			let ySplits: number[] | undefined;

			if (isBucketCountSpecified) {
				ySplits = Array.from({ length: numBuckets }, (_, i) => i + 0.5);
			}

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
				ySplits,
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
			if (!valueBucketResult.bucketSize) {
				const bucketIdx = Math.floor(splitValue);
				return bucketLabels[bucketIdx] || '';
			}

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
		[valueBucketResult.buckets, valueBucketResult.bucketSize, bucketLabels],
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
					gridColor: isDarkMode ? 'rgba(0, 0, 0, 1)' : 'rgba(255, 255, 255, 1)',
					gridLineWidth: 0.75,
					hoverStroke: isDarkMode ? 'rgba(255,255,255,0.50)' : 'rgba(0,0,0,0.50)',
					hoverLineWidth: 0.75,
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
					splits: ySplits ? (): number[] => ySplits : undefined,
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

		if (results.length === 0) return true;

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
