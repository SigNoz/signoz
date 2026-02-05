import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import TimeSeries from 'container/DashboardContainer/visualization/charts/TimeSeries/TimeSeries';
import ChartManager from 'container/DashboardContainer/visualization/components/ChartManager/ChartManager';
import { PanelWrapperProps } from 'container/PanelWrapper/panelWrapper.types';
import {
	getTimeRangeFromStepInterval,
	isApmMetric,
} from 'container/PanelWrapper/utils';
import { getUplotClickData } from 'container/QueryTable/Drilldown/drilldownUtils';
import useGraphContextMenu from 'container/QueryTable/Drilldown/useGraphContextMenu';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import { LegendPosition } from 'lib/uPlotV2/components/types';
import { LineInterpolation } from 'lib/uPlotV2/config/types';
import { ContextMenu, useCoordinates } from 'periscope/components/ContextMenu';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useTimezone } from 'providers/Timezone';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { DataSource } from 'types/common/queryBuilder';
import uPlot from 'uplot';
import { getTimeRange } from 'utils/getTimeRange';

import { prepareChartData, prepareUPlotConfig } from '../TimeSeriesPanel/utils';

function TimeSeriesPanel(props: PanelWrapperProps): JSX.Element {
	const {
		panelMode,
		queryResponse,
		widget,
		onDragSelect,
		isFullViewMode,
		onToggleModelHandler,
	} = props;
	const { toScrollWidgetId, setToScrollWidgetId } = useDashboard();
	const graphRef = useRef<HTMLDivElement>(null);
	const [minTimeScale, setMinTimeScale] = useState<number>();
	const [maxTimeScale, setMaxTimeScale] = useState<number>();
	const containerDimensions = useResizeObserver(graphRef);

	const isDarkMode = useIsDarkMode();
	const { timezone } = useTimezone();

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

	useEffect((): void => {
		const { startTime, endTime } = getTimeRange(queryResponse);

		setMinTimeScale(startTime);
		setMaxTimeScale(endTime);
	}, [queryResponse]);

	const {
		coordinates,
		popoverPosition,
		clickedData,
		onClose,
		subMenu,
		onClick,
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

	const clickHandlerWithContextMenu = useCallback(
		(...args: any[]) => {
			const [
				xValue,
				,
				,
				,
				metric,
				queryData,
				absoluteMouseX,
				absoluteMouseY,
				axesData,
				focusedSeries,
			] = args;
			const data = getUplotClickData({
				metric,
				queryData,
				absoluteMouseX,
				absoluteMouseY,
				focusedSeries,
			});
			// Compute time range if needed and if axes data is available
			let timeRange;
			if (axesData && queryData?.queryName) {
				// Get the compositeQuery from the response params
				const compositeQuery = (queryResponse?.data?.params as any)?.compositeQuery;

				if (compositeQuery?.queries) {
					// Find the specific query by name from the queries array
					const specificQuery = compositeQuery.queries.find(
						(query: any) => query.spec?.name === queryData.queryName,
					);

					// Use the stepInterval from the specific query, fallback to default
					const stepInterval = specificQuery?.spec?.stepInterval || 60;
					timeRange = getTimeRangeFromStepInterval(
						stepInterval,
						metric?.clickedTimestamp || xValue, // Use the clicked timestamp if available, otherwise use the click position timestamp
						specificQuery?.spec?.signal === DataSource.METRICS &&
							isApmMetric(specificQuery?.spec?.aggregations[0]?.metricName),
					);
				}
			}

			if (data && data?.record?.queryName) {
				onClick(data.coord, { ...data.record, label: data.label, timeRange });
			}
		},
		[onClick, queryResponse],
	);

	const chartData = useMemo(() => {
		if (!queryResponse?.data?.payload) {
			return [];
		}
		return prepareChartData(queryResponse?.data?.payload);
	}, [queryResponse?.data?.payload]);

	const config = useMemo(() => {
		const tzDate = (timestamp: number): Date =>
			uPlot.tzDate(new Date(timestamp * 1e3), timezone.value);

		return prepareUPlotConfig({
			widgetId: widget.id || '',
			apiResponse: queryResponse?.data?.payload as MetricRangePayloadProps,
			tzDate,
			minTimeScale: minTimeScale,
			maxTimeScale: maxTimeScale,
			isLogScale: widget?.isLogScale ?? false,
			thresholds: {
				scaleKey: 'y',
				thresholds: (widget.thresholds || []).map((threshold) => ({
					thresholdValue: threshold.thresholdValue ?? 0,
					thresholdColor: threshold.thresholdColor,
					thresholdUnit: threshold.thresholdUnit,
					thresholdLabel: threshold.thresholdLabel,
				})),
				yAxisUnit: widget.yAxisUnit,
			},
			yAxisUnit: widget.yAxisUnit || '',
			softMin: widget.softMin === undefined ? null : widget.softMin,
			softMax: widget.softMax === undefined ? null : widget.softMax,
			spanGaps: false,
			colorMapping: widget.customLegendColors ?? {},
			lineInterpolation: LineInterpolation.Spline,
			isDarkMode,
			onClick: clickHandlerWithContextMenu,
			onDragSelect,
			currentQuery: widget.query,
			panelMode,
		});
	}, [
		widget.id,
		maxTimeScale,
		minTimeScale,
		timezone.value,
		widget.customLegendColors,
		widget.isLogScale,
		widget.softMax,
		widget.softMin,
		isDarkMode,
		queryResponse?.data?.payload,
		widget.query,
		widget.thresholds,
		widget.yAxisUnit,
		panelMode,
		clickHandlerWithContextMenu,
		onDragSelect,
	]);

	const layoutChildren = useMemo(() => {
		if (!isFullViewMode) {
			return null;
		}
		return (
			<ChartManager
				config={config}
				data={chartData}
				yAxisUnit={widget.yAxisUnit}
				onCancel={onToggleModelHandler}
			/>
		);
	}, [
		isFullViewMode,
		config,
		chartData,
		widget.yAxisUnit,
		onToggleModelHandler,
	]);

	return (
		<div style={{ height: '100%', width: '100%' }} ref={graphRef}>
			{containerDimensions.width > 0 && containerDimensions.height > 0 && (
				<TimeSeries
					config={config}
					legendConfig={{
						position: widget?.legendPosition ?? LegendPosition.BOTTOM,
					}}
					yAxisUnit={widget.yAxisUnit}
					decimalPrecision={widget.decimalPrecision}
					timezone={timezone.value}
					data={chartData as uPlot.AlignedData}
					width={containerDimensions.width}
					height={containerDimensions.height}
					layoutChildren={layoutChildren}
				>
					<ContextMenu
						coordinates={coordinates}
						popoverPosition={popoverPosition}
						title={menuItemsConfig.header as string}
						items={menuItemsConfig.items}
						onClose={onClose}
					/>
				</TimeSeries>
			)}
		</div>
	);
}

export default TimeSeriesPanel;
