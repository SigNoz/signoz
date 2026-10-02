import { useCallback, useMemo, useRef } from 'react';
import { ChartScatter } from '@signozhq/icons';
import type { DashboardtypesScatterPlotPanelSpecDTO } from 'api/generated/services/sigNoz.schemas';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import type { IRenderTooltipFooterArgs } from 'lib/uPlotV2/components/types';
import type { ScatterPointLabel } from 'lib/uPlotV2/plugins/ScatterPlugin/types';
import type { ScatterPointClick } from 'lib/visualization/charts/types';
import Scatter from 'lib/visualization/charts/Scatter/Scatter';
import {
	buildScatterConfig,
	prepareScatterChartData,
} from 'lib/visualization/charts/Scatter/utils';
import TooltipFooter from 'lib/visualization/panels/components/TooltipFooter';
import { prepareScalarTables } from 'pages/DashboardPage/DashboardContainer/queryV5/prepareScalarTables';
import { getScalarResults } from 'pages/DashboardPage/DashboardContainer/queryV5/v5ResponseData';

import NoData from '../../components/NoData/NoData';
import PanelMessage from '../../components/PanelMessage/PanelMessage';
import PanelStyles from '../../panel.module.scss';
import type { PanelRendererProps } from '../../types/rendererProps';
import { mapThresholds } from '../../utils/baseConfigBuilder';
import { enrichScatterClick } from '../../utils/drilldown/enrichScatterClick';
import { getBuilderQueries } from '../../utils/getBuilderQueries';
import { getPanelTimeRange } from '../../utils/getPanelTimeRange';
import {
	resolveDecimalPrecision,
	resolveLegendPosition,
} from '../../utils/chartAppearance/resolvers';
import {
	resolveSelectionPreferencesSource,
	shouldSaveSelectionPreference,
} from '../../utils/selectionPreferences';

import ScatterPlotFooter from './components/ScatterPlotFooter/ScatterPlotFooter';
import {
	getScatterPlotEmptyMessage,
	getScatterPlotFooterText,
} from './messages';
import { resolvePointOpacity, resolvePointSize } from './points';
import { prepareScatterPlotData } from './prepareData';
import styles from './Renderer.module.scss';
import { ScatterPlotDataStatus } from './types';
import { toScatterAxisOptions } from './utils';

function ScatterPlotPanelRenderer({
	panelId,
	panel,
	data,
	isFetching,
	refetch,
	panelMode,
	onClick,
	enableDrillDown,
}: PanelRendererProps<'signoz/ScatterPlotPanel'>): JSX.Element {
	const graphRef = useRef<HTMLDivElement>(null);
	const containerDimensions = useResizeObserver(graphRef);
	const isDarkMode = useIsDarkMode();

	const spec = useMemo<DashboardtypesScatterPlotPanelSpecDTO>(
		() => panel.spec.plugin.spec,
		[panel.spec.plugin.spec],
	);

	// V5 joins every query into one scalar result, so the first non-empty table
	// holds every group.
	const table = useMemo(
		() =>
			prepareScalarTables({
				results: getScalarResults(data.response),
				legendMap: data.legendMap ?? {},
				requestPayload: data.requestPayload,
			}).find((candidate) => candidate.columns.length > 0),
		[data.response, data.legendMap, data.requestPayload],
	);

	const scatterData = useMemo(
		() =>
			prepareScatterPlotData({
				table,
				dimensions: spec.dimensions,
				axes: spec.axes,
				columnUnits: spec.formatting?.columnUnits ?? {},
			}),
		[table, spec.dimensions, spec.axes, spec.formatting?.columnUnits],
	);

	const decimalPrecision = useMemo(
		() => resolveDecimalPrecision(spec.formatting?.decimalPrecision),
		[spec.formatting?.decimalPrecision],
	);

	const legendPosition = useMemo(
		() => resolveLegendPosition(spec.legend?.position),
		[spec.legend?.position],
	);

	const emptyMessage = getScatterPlotEmptyMessage(scatterData);
	const footerText = getScatterPlotFooterText(scatterData);

	const readyData =
		scatterData.status === ScatterPlotDataStatus.Ready &&
		scatterData.drawnGroups > 0
			? scatterData
			: undefined;

	const config = useMemo(
		() =>
			readyData
				? buildScatterConfig({
						id: panelId,
						series: readyData.series,
						isDarkMode,
						x: toScatterAxisOptions(spec.axes?.x, readyData.channels.x.unit),
						y: toScatterAxisOptions(spec.axes?.y, readyData.channels.y.unit),
						pointSize: resolvePointSize(spec.chartAppearance?.points),
						fillOpacity: resolvePointOpacity(spec.chartAppearance?.points),
						colorMapping: spec.legend?.customColors ?? {},
						thresholds: mapThresholds(spec.thresholds),
						decimalPrecision,
						selectionPreferencesSource: resolveSelectionPreferencesSource(panelMode),
						shouldSaveSelectionPreference: shouldSaveSelectionPreference(panelMode),
					})
				: undefined,
		[
			readyData,
			panelId,
			isDarkMode,
			spec.axes?.x,
			spec.axes?.y,
			spec.chartAppearance?.points,
			spec.legend?.customColors,
			spec.thresholds,
			decimalPrecision,
			panelMode,
		],
	);

	const chartData = useMemo(
		() => (readyData ? prepareScatterChartData(readyData.series) : undefined),
		[readyData],
	);

	const resolvePointLabels = useCallback(
		(seriesIndex: number, dataIndex: number): ScatterPointLabel[] =>
			readyData?.pointLabels[seriesIndex - 1]?.[dataIndex] ?? [],
		[readyData],
	);

	const builderQueries = useMemo(
		() => getBuilderQueries(panel.spec.queries || []),
		[panel.spec.queries],
	);

	const handlePointClick = useCallback(
		({ seriesIndex, dataIndex, color, coordinates }: ScatterPointClick): void => {
			if (!onClick || !readyData) {
				return;
			}
			const payload = enrichScatterClick({
				labels: readyData.pointLabels[seriesIndex - 1]?.[dataIndex] ?? [],
				label: readyData.series[seriesIndex - 1]?.label ?? '',
				color,
				axisQueries: readyData.axisQueries,
				builderQueries,
				coordinates,
				timeRange: getPanelTimeRange(data.requestPayload),
			});
			if (payload) {
				onClick(payload);
			}
		},
		[onClick, readyData, builderQueries, data.requestPayload],
	);

	const renderTooltipFooter = useCallback(
		({ isPinned, dismiss }: IRenderTooltipFooterArgs) => (
			<TooltipFooter
				id={panelId}
				isPinned={isPinned}
				dismiss={dismiss}
				canDrilldown={!!enableDrillDown}
			/>
		),
		[panelId, enableDrillDown],
	);

	return (
		<div
			data-testid="scatter-plot-panel-renderer"
			className={PanelStyles.panelContainer}
		>
			{!readyData && emptyMessage && (
				<PanelMessage
					icon={<ChartScatter size={18} />}
					title={emptyMessage.title}
					description={emptyMessage.description}
					data-testid="scatter-plot-empty-message"
				/>
			)}
			{!readyData && !emptyMessage && (
				<NoData isFetching={isFetching} onRetry={refetch} panel={panel} />
			)}
			{/* Stays mounted through the empty states: the size observer is bound to this node. */}
			<div
				ref={graphRef}
				className={styles.chart}
				hidden={!readyData}
				data-testid="scatter-plot-chart-area"
			>
				{readyData &&
					config &&
					chartData &&
					containerDimensions.width > 0 &&
					containerDimensions.height > 0 && (
						<Scatter
							key={panelId}
							config={config}
							data={chartData}
							channels={readyData.channels}
							resolvePointLabels={resolvePointLabels}
							legendConfig={{ position: legendPosition }}
							decimalPrecision={decimalPrecision}
							canPinTooltip
							width={containerDimensions.width}
							height={containerDimensions.height}
							renderTooltipFooter={renderTooltipFooter}
							onPointClick={enableDrillDown ? handlePointClick : undefined}
							data-testid="scatter-plot-chart"
						/>
					)}
			</div>
			{readyData && footerText && <ScatterPlotFooter text={footerText} />}
		</div>
	);
}

export default ScatterPlotPanelRenderer;
