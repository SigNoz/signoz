import { Color } from '@signozhq/design-tokens';
import { useTooltip, useTooltipInPortal } from '@visx/tooltip';
import { Typography } from 'antd';
import { ToggleGraphProps } from 'components/Graph/types';
import Uplot from 'components/Uplot';
import { themeColors } from 'constants/theme';
import GraphManager from 'container/GridCardLayout/GridCard/FullView/GraphManager';
import { getLocalStorageGraphVisibilityState } from 'container/GridCardLayout/GridCard/utils';
import { getUplotClickData } from 'container/QueryTable/Drilldown/drilldownUtils';
import useGraphContextMenu from 'container/QueryTable/Drilldown/useGraphContextMenu';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import getLabelName from 'lib/getLabelName';
import { getUplotDistributionChartOptions } from 'lib/uPlotLib/utils/getUplotDistributionChartOptions';
import { generateColor } from 'lib/uPlotLib/utils/generateColor';
import _noop from 'lodash-es/noop';
import { ContextMenu, useCoordinates } from 'periscope/components/ContextMenu';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useTimezone } from 'providers/Timezone';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import uPlot, { AlignedData } from 'uplot';

import { PanelWrapperProps } from './panelWrapper.types';
import { tooltipStyles } from './utils';

type TooltipData = {
	bucketLabel: string;
	count: number;
	percentage: number;
};

const DEFAULT_DISTRIBUTION_STATE = {
	data: ([[0], [0]] as unknown) as AlignedData,
	bucketLabels: [] as string[],
	totalCount: 0,
	queryName: '',
	legend: '',
};

function formatBucketValue(val: number): string {
	if (val === 0) {
		return '0';
	}
	if (Math.abs(val) < 0.001) {
		return val.toExponential(2);
	}
	if (Math.abs(val) >= 1000) {
		return new Intl.NumberFormat('en-US', {
			notation: 'compact',
			maximumFractionDigits: 1,
		}).format(val);
	}
	return parseFloat(val.toFixed(2)).toString();
}

function DistributionPanelWrapper({
	queryResponse,
	widget,
	setGraphVisibility,
	graphVisibility,
	isFullViewMode,
	onToggleModelHandler,
	onClickHandler,
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

	const { data, bucketLabels, totalCount, queryName, legend } = useMemo(() => {
		const queryPayload = queryResponse?.data?.payload as any;

		if (queryPayload?.data?.result) {
			const queryResult = queryPayload.data.result;
			const firstQueryResult = queryResult[0];

			if (firstQueryResult?.results && Array.isArray(firstQueryResult.results)) {
				try {
					const bucketMap = new Map<
						string,
						{ start: number; end: number; value: number }
					>();

					firstQueryResult.results.forEach((bucket: any) => {
						const key = `${bucket.bucket_start}-${bucket.bucket_end}`;
						const existing = bucketMap.get(key);

						if (existing) {
							existing.value += bucket.value;
						} else {
							bucketMap.set(key, {
								start: bucket.bucket_start,
								end: bucket.bucket_end,
								value: bucket.value,
							});
						}
					});

					const buckets = Array.from(bucketMap.values()).sort(
						(a, b) => a.start - b.start,
					);
					const labels = buckets.map(
						(b) => `${formatBucketValue(b.start)} - ${formatBucketValue(b.end)}`,
					);
					const counts = buckets.map((b) => b.value);
					const total = counts.reduce((sum, c) => sum + c, 0);
					const xValues = counts.map((_, idx) => idx);

					return {
						data: ([xValues, counts] as unknown) as AlignedData,
						bucketLabels: labels,
						totalCount: total,
						queryName: firstQueryResult.queryName || '',
						legend: firstQueryResult.legend || '',
					};
				} catch (e) {
					return DEFAULT_DISTRIBUTION_STATE;
				}
			}
		}

		return DEFAULT_DISTRIBUTION_STATE;
	}, [queryResponse]);

	const handleBucketHover = useMemo(
		() => (
			hoverData: { bucketIndex: number; count: number; label: string } | null,
			mousePos: { x: number; y: number },
		): void => {
			if (!hoverData || !mousePos) {
				hideTooltip();
				return;
			}

			const { bucketIndex, count } = hoverData;
			const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0;
			const bucketLabel = bucketLabels[bucketIndex] || `Bucket ${bucketIndex}`;

			const containerBounds =
				containerBoundsRef.current || graphRef.current?.getBoundingClientRect();
			const leftOffset = containerBounds?.left || 0;
			const topOffset = containerBounds?.top || 0;

			showTooltip({
				tooltipLeft: mousePos.x - leftOffset + 10,
				tooltipTop: mousePos.y - topOffset + 10,
				tooltipData: {
					bucketLabel,
					count,
					percentage,
				},
			});
		},
		[hideTooltip, totalCount, bucketLabels, showTooltip],
	);

	const legendLabel = useMemo(() => getLabelName({}, queryName, legend), [
		queryName,
		legend,
	]);

	const barColor = useMemo(
		() =>
			widget.customLegendColors?.[legendLabel] ||
			generateColor(
				legendLabel,
				isDarkMode ? themeColors.chartcolors : themeColors.lightModeColor,
			),
		[widget.customLegendColors, legendLabel, isDarkMode],
	);

	const clickHandlerWithContextMenu = useCallback(
		(...args: any[]) => {
			const [
				,
				,
				,
				,
				metric,
				queryData,
				absoluteMouseX,
				absoluteMouseY,
				,
				focusedSeries,
			] = args;
			const data = getUplotClickData({
				metric,
				queryData,
				absoluteMouseX,
				absoluteMouseY,
				focusedSeries,
			});
			if (data && data?.record?.queryName) {
				onClick(data.coord, { ...data.record, label: data.label });
			}
		},
		[onClick],
	);

	const options: uPlot.Options = useMemo(
		() =>
			getUplotDistributionChartOptions({
				id: widget.id,
				dimensions: containerDimensions,
				isDarkMode,
				bucketLabels,
				queryName,
				legend,
				customLegendColors: widget.customLegendColors,
				isLogScale: widget.isLogScale,
				onClickHandler: enableDrillDown
					? clickHandlerWithContextMenu
					: onClickHandler ?? _noop,
				onHover: handleBucketHover,
				tzDate: (timestamp: number) =>
					uPlot.tzDate(new Date(timestamp * 1e3), timezone.value),
			}),
		[
			widget.id,
			widget.customLegendColors,
			widget.isLogScale,
			containerDimensions,
			isDarkMode,
			bucketLabels,
			queryName,
			legend,
			enableDrillDown,
			clickHandlerWithContextMenu,
			onClickHandler,
			handleBucketHover,
			timezone.value,
		],
	);

	const hasNoData = useMemo(() => {
		const queryPayload = queryResponse?.data?.payload as any;

		if (queryPayload?.data?.result) {
			const queryResult = queryPayload.data.result;
			return !queryResult.some(
				(qr: any) =>
					qr.results && Array.isArray(qr.results) && qr.results.length > 0,
			);
		}

		return true;
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
			{hasNoData ? (
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
					<Uplot options={options} data={data} ref={lineChartRef} />
				</div>
			)}
			{tooltipOpen && tooltipData && !hasNoData && (
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
						minWidth: '180px',
					}}
				>
					<div style={{ fontSize: '11px', opacity: 0.7 }}>Bucket Range</div>
					<div style={{ fontSize: '12px', marginBottom: '8px' }}>
						{tooltipData.bucketLabel}
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

export default DistributionPanelWrapper;
