import logEvent from 'api/common/logEvent';
import { DEFAULT_ENTITY_VERSION, ENTITY_VERSION_V5 } from 'constants/app';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { populateMultipleResults } from 'container/NewWidget/LeftContainer/WidgetGraph/util';
import { CustomTimeType } from 'container/TopNav/DateTimeSelectionV2/config';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { useIntersectionObserver } from 'hooks/useIntersectionObserver';
import { getDashboardVariables } from 'lib/dashbaordVariables/getDashboardVariables';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import getTimeString from 'lib/getTimeString';
import { isEqual } from 'lodash-es';
import isEmpty from 'lodash-es/isEmpty';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { UpdateTimeInterval } from 'store/actions';
import { AppState } from 'store/reducers';
import APIError from 'types/api/error';
import { DataSource } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';
import { getGraphType } from 'utils/getGraphType';
import { getSortedSeriesData } from 'utils/getSortedSeriesData';

import EmptyWidget from '../EmptyWidget';
import { MenuItemKeys } from '../WidgetHeader/contants';
import { GridCardGraphProps } from './types';
import { errorDetails, isDataAvailableByPanelType } from './utils';
import WidgetGraphComponent from './WidgetGraphComponent';

// eslint-disable-next-line sonarjs/cognitive-complexity
function GridCardGraph({
	widget,
	headerMenuList = [MenuItemKeys.View],
	isQueryEnabled,
	threshold,
	variables,
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
	widgetsHavingDynamicVariables,
}: GridCardGraphProps): JSX.Element {
	const dispatch = useDispatch();
	const [errorMessage, setErrorMessage] = useState<string>();
	const [isInternalServerError, setIsInternalServerError] = useState<boolean>(
		false,
	);
	const {
		toScrollWidgetId,
		setToScrollWidgetId,
		setDashboardQueryRangeCalled,
		variablesToGetUpdated,
	} = useDashboard();
	const { minTime, maxTime, selectedTime: globalSelectedInterval } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

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

	const graphRef = useRef<HTMLDivElement>(null);

	const isVisible = useIntersectionObserver(graphRef, undefined, true);

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
				variables: getDashboardVariables(variables),
				fillGaps: widget.fillSpans,
				formatForWeb: widget.panelTypes === PANEL_TYPES.TABLE,
				start: customTimeRange?.startTime || start,
				end: customTimeRange?.endTime || end,
				originalGraphType: widget.panelTypes,
			};
		}
		updatedQuery.builder.queryData[0].pageSize = 10;
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

	// Bring back dependency on variable chaining for panels to refetch,
	// but only for non-dynamic variables. We derive a stable token from
	// the head of the variablesToGetUpdated queue when it's non-dynamic.
	const nonDynamicVariableChainToken = useMemo(() => {
		if (!variablesToGetUpdated || variablesToGetUpdated.length === 0) {
			return undefined;
		}
		if (!variables) {
			return undefined;
		}
		const headName = variablesToGetUpdated[0];
		const variableObj = Object.values(variables).find(
			(variable) => variable?.name === headName,
		);
		if (variableObj && variableObj.type !== 'DYNAMIC') {
			return headName;
		}
		return undefined;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [variablesToGetUpdated, variables]);

	const queryResponse = useGetQueryRange(
		{
			...requestData,
			variables: getDashboardVariables(variables),
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
				maxTime,
				minTime,
				globalSelectedInterval,
				widget?.query,
				widget?.panelTypes,
				widget.timePreferance,
				widget.fillSpans,
				requestData,
				variables
					? Object.entries(variables).reduce((acc, [id, variable]) => {
							if (
								variable.type !== 'DYNAMIC' ||
								(widgetsHavingDynamicVariables?.[variable.id] &&
									widgetsHavingDynamicVariables?.[variable.id].includes(widget.id))
							) {
								return { ...acc, [id]: variable.selectedValue };
							}
							return acc;
					  }, {})
					: {},
				...(customTimeRange && customTimeRange.startTime && customTimeRange.endTime
					? [customTimeRange.startTime, customTimeRange.endTime]
					: []),
				// Include non-dynamic variable chaining token to drive refetches
				// only when a non-dynamic variable is at the head of the queue
				...(nonDynamicVariableChainToken ? [nonDynamicVariableChainToken] : []),
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
			enabled: queryEnabledCondition && !nonDynamicVariableChainToken,
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
				setDashboardQueryRangeCalled(true);
			},
			onSettled: (data) => {
				dataAvailable?.(
					isDataAvailableByPanelType(data?.payload?.data, widget?.panelTypes),
				);
				getGraphData?.(data?.payload?.data);
				setDashboardQueryRangeCalled(true);
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
		// eslint-disable-next-line no-param-reassign
		queryResponse.data = transformedData;
	}

	const menuList =
		widget.panelTypes === PANEL_TYPES.TABLE ||
		widget.panelTypes === PANEL_TYPES.LIST ||
		widget.panelTypes === PANEL_TYPES.PIE
			? headerMenuList.filter((menu) => menu !== MenuItemKeys.CreateAlerts)
			: headerMenuList;

	return (
		<div style={{ height: '100%', width: '100%' }} ref={graphRef}>
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
