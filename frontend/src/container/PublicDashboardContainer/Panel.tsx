import { PANEL_TYPES } from 'constants/queryBuilder';
import EmptyWidget from 'container/GridCardLayout/EmptyWidget';
import WidgetGraphComponent from 'container/GridCardLayout/GridCard/WidgetGraphComponent';
import { populateMultipleResults } from 'container/NewWidget/LeftContainer/WidgetGraph/util';
import { useGetPublicDashboardWidgetData } from 'hooks/dashboard/useGetPublicDashboardWidgetData';
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { Widgets } from 'types/api/dashboard/getAll';
import { getSortedSeriesData } from 'utils/getSortedSeriesData';

import { transformPublicDashboardDataToQueryResponse } from './transformPublicDashboardData';

function Panel({
	widget,
	index,
	dashboardId,
	startTime,
	endTime,
}: {
	widget: Widgets;
	index: number;
	dashboardId: string;
	startTime: number;
	endTime: number;
}): JSX.Element {
	const {
		data: publicDashboardWidgetData,
		isLoading: isLoadingPublicDashboardWidgetData,
		isFetching: isFetchingPublicDashboardWidgetData,
		refetch: refetchPublicDashboardWidgetData,
	} = useGetPublicDashboardWidgetData(
		dashboardId,
		index,
		startTime * 1000, // convert to milliseconds
		endTime * 1000, // convert to milliseconds
	);

	useEffect(() => {
		refetchPublicDashboardWidgetData();
	}, [startTime, endTime, refetchPublicDashboardWidgetData]);

	const graphRef = useRef<HTMLDivElement>(null);

	const queryResponse = useMemo(
		() =>
			transformPublicDashboardDataToQueryResponse(
				publicDashboardWidgetData,
				isLoadingPublicDashboardWidgetData,
				widget.query,
			),
		[publicDashboardWidgetData, isLoadingPublicDashboardWidgetData, widget.query],
	);

	const isEmptyLayout = widget?.id === PANEL_TYPES.EMPTY_WIDGET;

	if (queryResponse.data && widget.panelTypes === PANEL_TYPES.BAR) {
		const sortedSeriesData = getSortedSeriesData(
			queryResponse.data?.payload.data.result,
		);
		queryResponse.data.payload.data.result = sortedSeriesData;
	}

	if (queryResponse.data && widget.panelTypes === PANEL_TYPES.PIE) {
		const transformedData = populateMultipleResults(queryResponse?.data);
		// eslint-disable-next-line no-param-reassign
		queryResponse.data = transformedData;
	}

	const onDragSelect = useCallback((_start: number, _end: number): void => {
		// Handle drag select if needed
		console.log('onDragSelect', _start, _end);
	}, []);

	return (
		<div
			className="panel-container"
			style={{ height: '100%', width: '100%' }}
			ref={graphRef}
		>
			{isEmptyLayout ? (
				<EmptyWidget />
			) : (
				<WidgetGraphComponent
					widget={widget}
					queryResponse={queryResponse}
					errorMessage={undefined}
					headerMenuList={[]}
					isWarning={false}
					isFetchingResponse={
						isLoadingPublicDashboardWidgetData || isFetchingPublicDashboardWidgetData
					}
					onDragSelect={onDragSelect}
				/>
			)}
		</div>
	);
}

export default memo(Panel);
