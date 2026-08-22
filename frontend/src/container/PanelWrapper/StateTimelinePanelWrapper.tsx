import { useRef } from 'react';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import { LegendPosition } from 'types/api/dashboard/getAll';
import { QueryDataV3 } from 'types/api/widgets/getQuery';
import { getTimeRange } from 'utils/getTimeRange';

import StateTimelinePanel from '../DashboardContainer/visualization/panels/StateTimelinePanel/StateTimelinePanel';
import { transformSeriesToSwimLanes } from '../DashboardContainer/visualization/panels/StateTimelinePanel/utils/transformData';
import { PanelWrapperProps } from './panelWrapper.types';

function StateTimelinePanelWrapper({
	queryResponse,
	widget,
}: PanelWrapperProps): JSX.Element {
	const graphRef = useRef<HTMLDivElement>(null);
	const containerDimensions = useResizeObserver(graphRef);
	const isDarkMode = useIsDarkMode();

	// Extract query data (QueryDataV3[]) from the response
	const queryData: QueryDataV3[] =
		queryResponse?.data?.payload?.data?.newResult?.data?.result || [];

		hasPayload: !!queryResponse?.data?.payload,
		resultKeys: Object.keys(queryResponse?.data?.payload?.data || {}),
		newResultKeys: Object.keys(queryResponse?.data?.payload?.data?.newResult?.data || {}),
		resultLength: queryResponse?.data?.payload?.data?.newResult?.data?.result?.length,
		firstResult: queryResponse?.data?.payload?.data?.newResult?.data?.result?.[0] ? Object.keys(queryResponse.data.payload.data.newResult.data.result[0]) : 'empty',
		firstSeries: queryResponse?.data?.payload?.data?.newResult?.data?.result?.[0]?.series?.length,
	}));
		queryName: qd.queryName,
		seriesCount: qd.series?.length || 0,
		firstSeriesLabels: qd.series?.[0]?.labels,
		firstSeriesValuesCount: qd.series?.[0]?.values?.length || 0,
		firstValue: qd.series?.[0]?.values?.[0],
	})));

	// Derive time range from the query response params
	const { startTime, endTime } = getTimeRange(queryResponse);
	const timeRange = { start: startTime || 0, end: endTime || 0 };

	// Get thresholds from widget configuration
	const thresholds = widget.thresholds || [];


	// Get legend template from the first query builder entry (if configured)
	const legendTemplate =
		widget.query?.builder?.queryData?.[0]?.legend || undefined;

	// Get legend position from widget config
	const legendPosition = widget.legendPosition ?? LegendPosition.BOTTOM;

	// Transform series data into swim-lane model
	const swimLaneModel = transformSeriesToSwimLanes(
		queryData,
		timeRange,
		thresholds,
		isDarkMode,
		legendTemplate,
	);

	// Debug: log what we're receiving and computing
	if (swimLaneModel.rows.length > 0) {
	}

	return (
		<div ref={graphRef} style={{ width: '100%', height: '100%' }}>
			<StateTimelinePanel
				swimLaneModel={swimLaneModel}
				width={containerDimensions.width || 800}
				height={containerDimensions.height || 400}
				isDarkMode={isDarkMode}
				legendPosition={legendPosition}
			/>
		</div>
	);
}

export default StateTimelinePanelWrapper;
