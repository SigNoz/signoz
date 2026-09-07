import { memo, useEffect, useMemo, useRef, useState } from 'react';
// eslint-disable-next-line no-restricted-imports
import { useDispatch, useSelector } from 'react-redux';
import logEvent from 'api/common/logEvent';
import { DEFAULT_ENTITY_VERSION, ENTITY_VERSION_V5 } from 'constants/app';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { useScrollWidgetIntoView } from 'lib/visualization/hooks/useScrollWidgetIntoView';
import { populateMultipleResults } from 'lib/query/populateMultipleResults';
import { CustomTimeType } from 'container/TopNav/DateTimeSelectionV2/types';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { useIntersectionObserver } from 'hooks/useIntersectionObserver';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import getTimeString from 'lib/getTimeString';
import { isEqual } from 'lodash-es';
import isEmpty from 'lodash-es/isEmpty';
import { UpdateTimeInterval } from 'store/actions';
import { AppState } from 'store/reducers';
import APIError from 'types/api/error';
import { DataSource } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';
import { getGraphType } from 'utils/getGraphType';
import { getSortedSeriesData } from 'utils/getSortedSeriesData';

import {
	DASHBOARD_CACHE_TIME,
	DASHBOARD_CACHE_TIME_ON_REFRESH_ENABLED,
} from '../../../constants/queryCacheTime';
import { REACT_QUERY_KEY } from '../../../constants/reactQueryKeys';
import EmptyWidget from 'container/WidgetCard/EmptyWidget';
import { MenuItemKeys } from 'container/WidgetCard/Header/contants';
import { GridCardGraphProps } from 'container/WidgetCard/Card/types';
import {
	errorDetails,
	isDataAvailableByPanelType,
} from 'container/WidgetCard/Card/utils';
import WidgetGraphComponent from 'container/WidgetCard/Card/WidgetGraphComponent';

// eslint-disable-next-line sonarjs/cognitive-complexity
function GridCardGraph({
	widget,
	headerMenuList = [MenuItemKeys.View],
	isQueryEnabled,
	threshold,
	version,
	onClickHandler,
	onDragSelect,
	customOnDragSelect,
	customTooltipElement,
	dataAvailable,
	getGraphData,
	openTracesButton,
	onOpenTraceBtnClick,
	customSeries,
	customErrorMessage,
	start,
	end,
	analyticsEvent,
	customTimeRange,
	customOnRowClick,
	customTimeRangeWindowForCoRelation,
	enableDrillDown,
}: GridCardGraphProps): JSX.Element {
	const dispatch = useDispatch();
	const [errorMessage, setErrorMessage] = useState<string>();
	const [isInternalServerError, setIsInternalServerError] =
		useState<boolean>(false);
	const {
		minTime,
		maxTime,
		selectedTime: globalSelectedInterval,
		isAutoRefreshDisabled,
	} = useSelector<AppState, GlobalReducer>((state) => state.globalTime);

	const handleBackNavigation = (): void => {
		const searchParams = new URLSearchParams(window.location.search);
		const startTime = searchParams.get(QueryParams.startTime);
		const endTime = searchParams.get(QueryParams.endTime);
		const relativeTime = searchParams.get(
			QueryParams.relativeTime,
		) as CustomTimeType;

		if (relativeTime) {
			dispatch(UpdateTimeInterval(relativeTime));
		} else if (startTime && endTime && startTime !== endTime) {
			dispatch(
				UpdateTimeInterval('custom', [
					parseInt(getTimeString(startTime), 10),
					parseInt(getTimeString(endTime), 10),
				]),
			);
		}
	};

	useEffect(() => {
		window.addEventListener('popstate', handleBackNavigation);

		return (): void => {
			window.removeEventListener('popstate', handleBackNavigation);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const widgetContainerRef = useRef<HTMLDivElement>(null);

	const isVisible = useIntersectionObserver(widgetContainerRef, undefined, true);

	useScrollWidgetIntoView(widget?.id || '', widgetContainerRef);

	const updatedQuery = widget?.query;

	const isEmptyWidget =
		widget?.id === PANEL_TYPES.EMPTY_WIDGET || isEmpty(widget);

	const queryEnabledCondition = isVisible && !isEmptyWidget && isQueryEnabled;

	const [requestData, setRequestData] = useState<GetQueryResultsProps>(() => {
		if (widget.panelTypes !== PANEL_TYPES.LIST) {
			return {
				selectedTime: widget?.timePreferance,
				graphType: getGraphType(widget.panelTypes),
				query: updatedQuery,
				globalSelectedInterval,
				fillGaps: widget.fillSpans,
				formatForWeb: widget.panelTypes === PANEL_TYPES.TABLE,
				start: customTimeRange?.startTime || start,
				end: customTimeRange?.endTime || end,
				originalGraphType: widget.panelTypes,
			};
		}
		const initialDataSource = updatedQuery.builder.queryData[0].dataSource;
		return {
			query: updatedQuery,
			graphType: PANEL_TYPES.LIST,
			selectedTime: widget.timePreferance || 'GLOBAL_TIME',
			globalSelectedInterval,
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
			start: customTimeRange?.startTime || start,
			end: customTimeRange?.endTime || end,
		};
	});

	useEffect(() => {
		if (!isEqual(updatedQuery, requestData.query)) {
			setRequestData((prev) => ({
				...prev,
				query: updatedQuery,
			}));
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [updatedQuery]);

	const isLogsQuery = useMemo(
		() =>
			requestData?.query?.builder?.queryData?.length > 0 &&
			requestData?.query?.builder?.queryData?.every(
				(query) => query?.dataSource === DataSource.LOGS,
			),
		[requestData.query],
	);

	const queryResponse = useGetQueryRange(
		{
			...requestData,
			selectedTime: widget.timePreferance || 'GLOBAL_TIME',
			globalSelectedInterval:
				widget?.panelTypes === PANEL_TYPES.LIST && isLogsQuery
					? 'custom'
					: globalSelectedInterval,
			start: customTimeRange?.startTime || start,
			end: customTimeRange?.endTime || end,
			originalGraphType: widget?.panelTypes,
		},
		version || DEFAULT_ENTITY_VERSION,
		{
			queryKey: [
				REACT_QUERY_KEY.DASHBOARD_GRID_CARD_QUERY_RANGE,
				maxTime,
				minTime,
				isAutoRefreshDisabled,
				globalSelectedInterval,
				widget?.query,
				widget?.panelTypes,
				widget.timePreferance,
				widget.fillSpans,
				requestData,
				...(customTimeRange && customTimeRange.startTime && customTimeRange.endTime
					? [customTimeRange.startTime, customTimeRange.endTime]
					: []),
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
			cacheTime: isAutoRefreshDisabled
				? DASHBOARD_CACHE_TIME
				: DASHBOARD_CACHE_TIME_ON_REFRESH_ENABLED,
			enabled: queryEnabledCondition,
			refetchOnMount: false,
			onError: (error) => {
				const errorMessage =
					version === ENTITY_VERSION_V5
						? errorDetails(error as APIError)
						: error.message;

				setErrorMessage(errorMessage);
				if (customErrorMessage) {
					setIsInternalServerError(
						String(error.message).includes('API responded with 500'),
					);
					if (analyticsEvent) {
						logEvent(analyticsEvent, {
							error: error.message,
						});
					}
				}
			},
			onSettled: (data) => {
				dataAvailable?.(
					isDataAvailableByPanelType(data?.payload?.data, widget?.panelTypes),
				);
				getGraphData?.(data?.payload?.data);
			},
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

	const menuList =
		widget.panelTypes === PANEL_TYPES.TABLE ||
		widget.panelTypes === PANEL_TYPES.LIST ||
		widget.panelTypes === PANEL_TYPES.PIE
			? headerMenuList.filter((menu) => menu !== MenuItemKeys.CreateAlerts)
			: headerMenuList;

	return (
		<div style={{ height: '100%', width: '100%' }} ref={widgetContainerRef}>
			{isEmptyLayout ? (
				<EmptyWidget />
			) : (
				<WidgetGraphComponent
					widget={widget}
					queryResponse={queryResponse}
					errorMessage={errorMessage}
					isWarning={!isEmpty(queryResponse.data?.warning)}
					version={version}
					threshold={threshold}
					headerMenuList={menuList}
					isFetchingResponse={queryResponse.isFetching}
					setRequestData={setRequestData}
					onClickHandler={onClickHandler}
					onDragSelect={onDragSelect}
					customOnDragSelect={customOnDragSelect}
					customTooltipElement={customTooltipElement}
					openTracesButton={openTracesButton}
					onOpenTraceBtnClick={onOpenTraceBtnClick}
					customSeries={customSeries}
					customErrorMessage={isInternalServerError ? customErrorMessage : undefined}
					customOnRowClick={customOnRowClick}
					customTimeRangeWindowForCoRelation={customTimeRangeWindowForCoRelation}
					enableDrillDown={enableDrillDown}
				/>
			)}
		</div>
	);
}

GridCardGraph.defaultProps = {
	onDragSelect: undefined,
	onClickHandler: undefined,
	isQueryEnabled: true,
	threshold: undefined,
	headerMenuList: [MenuItemKeys.View],
	version: 'v3',
	analyticsEvent: undefined,
	customTimeRangeWindowForCoRelation: undefined,
	enableDrillDown: false,
};

export default memo(GridCardGraph);
