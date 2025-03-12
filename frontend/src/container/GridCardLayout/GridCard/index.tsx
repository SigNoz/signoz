import logEvent from 'api/common/logEvent';
import { DEFAULT_ENTITY_VERSION } from 'constants/app';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { CustomTimeType } from 'container/TopNav/DateTimeSelectionV2/config';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { useIntersectionObserver } from 'hooks/useIntersectionObserver';
import { getDashboardVariables } from 'lib/dashbaordVariables/getDashboardVariables';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import getTimeString from 'lib/getTimeString';
import { isEqual } from 'lodash-es';
import isEmpty from 'lodash-es/isEmpty';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { memo, useEffect, useRef, useState } from 'react';
import { useQueryClient } from 'react-query';
import { useDispatch, useSelector } from 'react-redux';
import { UpdateTimeInterval } from 'store/actions';
import { AppState } from 'store/reducers';
import { DataSource } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';
import { getGraphType } from 'utils/getGraphType';
import { getSortedSeriesData } from 'utils/getSortedSeriesData';

import EmptyWidget from '../EmptyWidget';
import { MenuItemKeys } from '../WidgetHeader/contants';
import { GridCardGraphProps } from './types';
import { isDataAvailableByPanelType } from './utils';
import WidgetGraphComponent from './WidgetGraphComponent';

function GridCardGraph({
	widget,
	headerMenuList = [MenuItemKeys.View],
	isQueryEnabled,
	threshold,
	variables,
	version,
	onClickHandler,
	onDragSelect,
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
}: GridCardGraphProps): JSX.Element {
	const dispatch = useDispatch();
	const [errorMessage, setErrorMessage] = useState<string>();
	const [isInternalServerError, setIsInternalServerError] = useState<boolean>(
		false,
	);
	const {
		toScrollWidgetId,
		setToScrollWidgetId,
		variablesToGetUpdated,
		setDashboardQueryRangeCalled,
	} = useDashboard();
	const { minTime, maxTime, selectedTime: globalSelectedInterval } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);
	const queryClient = useQueryClient();

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

	const queryEnabledCondition =
		isVisible &&
		!isEmptyWidget &&
		isQueryEnabled &&
		isEmpty(variablesToGetUpdated);

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
		};
	});

	// TODO [vikrantgupta25] remove this useEffect with refactor as this is prone to race condition
	// this is added to tackle the case of async communication between VariableItem.tsx and GridCard.tsx
	useEffect(() => {
		if (variablesToGetUpdated.length > 0) {
			queryClient.cancelQueries([
				maxTime,
				minTime,
				globalSelectedInterval,
				variables,
				widget?.query,
				widget?.panelTypes,
				widget.timePreferance,
				widget.fillSpans,
				requestData,
			]);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [variablesToGetUpdated]);

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
			variables: getDashboardVariables(variables),
			selectedTime: widget.timePreferance || 'GLOBAL_TIME',
			globalSelectedInterval,
			start,
			end,
		},
		version || DEFAULT_ENTITY_VERSION,
		{
			queryKey: [
				maxTime,
				minTime,
				globalSelectedInterval,
				variables,
				widget?.query,
				widget?.panelTypes,
				widget.timePreferance,
				widget.fillSpans,
				requestData,
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
			enabled: queryEnabledCondition,
			refetchOnMount: false,
			onError: (error) => {
				setErrorMessage(error.message);
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
					isWarning={false}
					version={version}
					threshold={threshold}
					headerMenuList={menuList}
					isFetchingResponse={queryResponse.isFetching}
					setRequestData={setRequestData}
					onClickHandler={onClickHandler}
					onDragSelect={onDragSelect}
					customTooltipElement={customTooltipElement}
					openTracesButton={openTracesButton}
					onOpenTraceBtnClick={onOpenTraceBtnClick}
					customSeries={customSeries}
					customErrorMessage={isInternalServerError ? customErrorMessage : undefined}
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
};

export default memo(GridCardGraph);
