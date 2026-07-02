import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { PANEL_TYPES } from 'constants/queryBuilder';
import EmptyWidget from 'container/GridCardLayout/EmptyWidget';
import WidgetGraphComponent from 'container/GridCardLayout/GridCard/WidgetGraphComponent';
import { populateMultipleResults } from 'container/NewWidget/LeftContainer/WidgetGraph/util';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import { isEqual } from 'lodash-es';
import { Widgets } from 'types/api/dashboard/getAll';
import { getSortedSeriesData } from 'utils/getSortedSeriesData';

import { getPublicPanelRequestData } from './utils';

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
	const graphRef = useRef<HTMLDivElement>(null);
	const updatedQuery = widget?.query;

	// State (not memo) so LIST panels get a setRequestData — ListPanelWrapper
	// renders nothing without one.
	const [requestData, setRequestData] = useState<GetQueryResultsProps>(() =>
		getPublicPanelRequestData({ widget, startTime, endTime }),
	);

	useEffect(() => {
		if (!isEqual(updatedQuery, requestData.query)) {
			setRequestData((prev) => ({
				...prev,
				query: updatedQuery,
			}));
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [updatedQuery]);

	const queryResponse = useGetQueryRange(
		{
			...requestData,
			start: startTime,
			end: endTime,
			originalGraphType: widget?.panelTypes,
		},
		ENTITY_VERSION_V5,
		{
			// Public data is fetched by index and the payload redacts each widget's
			// filters, so query bodies are identical across panels. Key on panel
			// identity + time — the only inputs that determine the response — so
			// panels don't collapse onto one cache entry.
			queryKey: [widget?.id, index, startTime, endTime],
			retry(failureCount, error): boolean {
				if (
					String(error).includes('status: error') &&
					String(error).includes('i/o timeout')
				) {
					return false;
				}

				return failureCount < 2;
			},
			keepPreviousData: true,
			enabled: !!widget?.query,
			refetchOnMount: false,
		},
		{},
		{
			isPublic: true,
			widgetIndex: index,
			publicDashboardId: dashboardId,
		},
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
		queryResponse.data = transformedData;
	}

	const onDragSelect = useCallback((_start: number, _end: number): void => {
		// Handle drag select if needed - no-op for public dashboards
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
					isFetchingResponse={queryResponse.isFetching || queryResponse.isLoading}
					setRequestData={setRequestData}
					hidePagination
					onDragSelect={onDragSelect}
				/>
			)}
		</div>
	);
}

export default memo(Panel);
