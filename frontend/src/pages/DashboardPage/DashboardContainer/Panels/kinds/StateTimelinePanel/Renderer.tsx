import { useMemo, useRef } from 'react';
import type { DashboardtypesStateTimelinePanelSpecDTO } from 'api/generated/services/sigNoz.schemas';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import StateTimelinePanel from 'lib/visualization/charts/StateTimeline/StateTimelinePanel';
import type { PanelSeries } from 'pages/DashboardPage/DashboardContainer/queryV5/types';
import {
	flattenTimeSeries,
	getExecStats,
	getTimeSeriesResults,
} from 'pages/DashboardPage/DashboardContainer/queryV5/v5ResponseData';

import { resolveLabelFromLabels } from 'lib/visualization/charts/StateTimeline/utils/legendResolver';
import { transformSeriesToSwimLanes } from 'lib/visualization/charts/StateTimeline/utils/transformData';

import NoData from '../../components/NoData/NoData';
import PanelStyles from '../../panel.module.scss';
import { PanelRendererProps } from '../../types/rendererProps';
import { getBuilderQueries } from '../../utils/getBuilderQueries';
import { getPanelTimeRange } from '../../utils/getPanelTimeRange';
import { resolveSeriesLabelV5 } from '../../utils/resolveSeriesLabel';

function StateTimelinePanelRenderer({
	panel,
	data,
	isFetching,
	refetch,
	onDragSelect,
}: PanelRendererProps<'signoz/StateTimelinePanel'>): JSX.Element {
	const graphRef = useRef<HTMLDivElement>(null);
	const containerDimensions = useResizeObserver(graphRef);
	const isDarkMode = useIsDarkMode();

	const spec = useMemo<DashboardtypesStateTimelinePanelSpecDTO>(
		() => panel.spec.plugin.spec,
		[panel.spec.plugin.spec],
	);

	const builderQueries = useMemo(
		() => getBuilderQueries(panel.spec.queries),
		[panel.spec.queries],
	);

	const timeRange = useMemo(() => {
		const { startTime, endTime } = getPanelTimeRange(data.requestPayload);
		return { start: startTime, end: endTime };
	}, [data.requestPayload]);

	// Flatten the V5 response, then resolve each series' swim-lane label. Try the
	// shared legend matrix first (honours legend templates); but for grouped
	// metric queries it yields only the query name (metric aggregations carry no
	// alias/expression), so fall back to the series' own labels — the group-by
	// values (e.g. service / destination) that actually identify the row.
	const flatSeries = useMemo<PanelSeries[]>(() => {
		const series = flattenTimeSeries(
			getTimeSeriesResults(data.response),
			data.legendMap ?? {},
		);
		return series.map((s) => {
			const resolved = resolveSeriesLabelV5(s, builderQueries, s.legend);
			const isQueryNameOnly = resolved === s.queryName || resolved === '';
			const hasLabels = Object.keys(s.labels).length > 0;
			const legend =
				isQueryNameOnly && hasLabels ? resolveLabelFromLabels(s.labels) : resolved;
			return { ...s, legend };
		});
	}, [data.response, data.legendMap, builderQueries]);

	const stepIntervals = useMemo(
		() => getExecStats(data.response)?.stepIntervals,
		[data.response],
	);

	const swimLaneModel = useMemo(
		() =>
			transformSeriesToSwimLanes(
				flatSeries,
				timeRange,
				spec.thresholds ?? [],
				isDarkMode,
				stepIntervals,
			),
		[flatSeries, timeRange, spec.thresholds, isDarkMode, stepIntervals],
	);

	return (
		<div
			ref={graphRef}
			data-testid="state-timeline-renderer"
			className={PanelStyles.panelContainer}
		>
			{flatSeries.length === 0 && (
				<NoData isFetching={isFetching} onRetry={refetch} panel={panel} />
			)}
			{flatSeries.length > 0 &&
				containerDimensions.width > 0 &&
				containerDimensions.height > 0 && (
					<StateTimelinePanel
						swimLaneModel={swimLaneModel}
						width={containerDimensions.width}
						height={containerDimensions.height}
						isDarkMode={isDarkMode}
						onDragSelect={onDragSelect}
					/>
				)}
		</div>
	);
}

export default StateTimelinePanelRenderer;
