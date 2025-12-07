import { ENTITY_VERSION_V5 } from 'constants/app';
import { PANEL_TYPES } from 'constants/queryBuilder';
import EmptyWidget from 'container/GridCardLayout/EmptyWidget';
import WidgetGraphComponent from 'container/GridCardLayout/GridCard/WidgetGraphComponent';
import { populateMultipleResults } from 'container/NewWidget/LeftContainer/WidgetGraph/util';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import { memo, useCallback, useMemo, useRef } from 'react';
import { Widgets } from 'types/api/dashboard/getAll';
import { DataSource } from 'types/common/queryBuilder';
import { getGraphType } from 'utils/getGraphType';
import { getSortedSeriesData } from 'utils/getSortedSeriesData';

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

	const requestData: GetQueryResultsProps = useMemo(() => {
		if (widget.panelTypes !== PANEL_TYPES.LIST) {
			return {
				selectedTime: widget?.timePreferance,
				graphType: getGraphType(widget.panelTypes),
				query: updatedQuery,
				variables: {}, // we are not supporting variables in public dashboards
				fillGaps: widget.fillSpans,
				formatForWeb: widget.panelTypes === PANEL_TYPES.TABLE,
				start: startTime,
				end: endTime,
				originalGraphType: widget.panelTypes,
			};
		}

		updatedQuery.builder.queryData[0].pageSize = 10;
		const initialDataSource = updatedQuery.builder.queryData[0].dataSource;

		return {
			query: updatedQuery,
			graphType: PANEL_TYPES.LIST,
			selectedTime: widget.timePreferance || 'GLOBAL_TIME',
			tableParams: {
				pagination: {
					offset: 0,
					limit: updatedQuery.builder.queryData[0].limit || 0,
				},
				// we do not need select columns in case of logs
				selectColumns:
					initialDataSource === DataSource.TRACES && widget.selectedTracesFields,
			},
			fillGaps: widget.fillSpans,
			start: startTime,
			end: endTime,
		};
	}, [widget, updatedQuery, startTime, endTime]);

	const queryResponse = useGetQueryRange(
		{
			...requestData,
			originalGraphType: widget?.panelTypes,
		},
		ENTITY_VERSION_V5,
		{
			queryKey: [
				widget?.query,
				widget?.panelTypes,
				requestData,
				startTime,
				endTime,
			],
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
		// eslint-disable-next-line no-param-reassign
		queryResponse.data = transformedData;
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
					onDragSelect={onDragSelect}
				/>
			)}
		</div>
	);
}

export default memo(Panel);
