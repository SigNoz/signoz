/* eslint-disable sonarjs/cognitive-complexity */
import './LogsExplorerViews.styles.scss';

import getFromLocalstorage from 'api/browser/localstorage/get';
import setToLocalstorage from 'api/browser/localstorage/set';
import { getQueryStats, WsDataEvent } from 'api/common/getQueryStats';
import logEvent from 'api/common/logEvent';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { LOCALSTORAGE } from 'constants/localStorage';
import { AVAILABLE_EXPORT_PANEL_TYPES } from 'constants/panelTypes';
import { QueryParams } from 'constants/query';
import {
	initialFilters,
	initialQueriesMap,
	initialQueryBuilderFormValues,
	OPERATORS,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import { DEFAULT_PER_PAGE_VALUE } from 'container/Controls/config';
import ExplorerOptionWrapper from 'container/ExplorerOptions/ExplorerOptionWrapper';
import GoToTop from 'container/GoToTop';
import {} from 'container/LiveLogs/constants';
import LogsExplorerChart from 'container/LogsExplorerChart';
import LogsExplorerList from 'container/LogsExplorerList';
import LogsExplorerTable from 'container/LogsExplorerTable';
import TimeSeriesView from 'container/TimeSeriesView/TimeSeriesView';
import { useCopyLogLink } from 'hooks/logs/useCopyLogLink';
import { useGetExplorerQueryRange } from 'hooks/queryBuilder/useGetExplorerQueryRange';
import { useGetPanelTypesQueryParam } from 'hooks/queryBuilder/useGetPanelTypesQueryParam';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useHandleExplorerTabChange } from 'hooks/useHandleExplorerTabChange';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQueryData from 'hooks/useUrlQueryData';
import { getPaginationQueryDataV2 } from 'lib/newQueryBuilder/getPaginationQueryData';
import { cloneDeep, defaultTo, isEmpty, isUndefined, set } from 'lodash-es';
import LiveLogs from 'pages/LiveLogs';
import { ExplorerViews } from 'pages/LogsExplorer/utils';
import {
	Dispatch,
	memo,
	MutableRefObject,
	SetStateAction,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { UpdateTimeInterval } from 'store/actions';
import { AppState } from 'store/reducers';
import { Warning } from 'types/api';
import { Dashboard } from 'types/api/dashboard/getAll';
import APIError from 'types/api/error';
import { ILog } from 'types/api/logs/log';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import {
	IBuilderQuery,
	Query,
	TagFilter,
} from 'types/api/queryBuilder/queryBuilderData';
import { Filter } from 'types/api/v5/queryRange';
import { QueryDataV3 } from 'types/api/widgets/getQuery';
import { DataSource, LogsAggregatorOperator } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';
import { generateExportToDashboardLink } from 'utils/dashboard/generateExportToDashboardLink';
import { v4 } from 'uuid';

import LogsActionsContainer from './LogsActionsContainer';

function LogsExplorerViewsContainer({
	selectedView,
	setIsLoadingQueries,
	listQueryKeyRef,
	chartQueryKeyRef,
	setWarning,
	showLiveLogs,
}: {
	selectedView: ExplorerViews;
	setIsLoadingQueries: React.Dispatch<React.SetStateAction<boolean>>;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	listQueryKeyRef: MutableRefObject<any>;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	chartQueryKeyRef: MutableRefObject<any>;
	setWarning: Dispatch<SetStateAction<Warning | undefined>>;
	showLiveLogs: boolean;
}): JSX.Element {
	const { safeNavigate } = useSafeNavigate();
	const dispatch = useDispatch();

	const [showFrequencyChart, setShowFrequencyChart] = useState(false);

	useEffect(() => {
		const frequencyChart = getFromLocalstorage(LOCALSTORAGE.SHOW_FREQUENCY_CHART);
		setShowFrequencyChart(frequencyChart === 'true');
	}, []);

	// this is to respect the panel type present in the URL rather than defaulting it to list always.
	const panelTypes = useGetPanelTypesQueryParam(PANEL_TYPES.LIST);

	const { activeLogId } = useCopyLogLink();

	const { queryData: pageSize } = useUrlQueryData(
		QueryParams.pageSize,
		DEFAULT_PER_PAGE_VALUE,
	);

	const { minTime, maxTime, selectedTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const currentMinTimeRef = useRef<number>(minTime);

	// Context
	const {
		currentQuery,
		stagedQuery,
		panelType,
		updateAllQueriesOperators,
		handleSetConfig,
	} = useQueryBuilder();

	const [selectedPanelType, setSelectedPanelType] = useState<PANEL_TYPES>(
		panelType || PANEL_TYPES.LIST,
	);

	const { handleExplorerTabChange } = useHandleExplorerTabChange();

	// State
	const [page, setPage] = useState<number>(1);
	const [logs, setLogs] = useState<ILog[]>([]);
	const [requestData, setRequestData] = useState<Query | null>(null);
	const [queryId, setQueryId] = useState<string>(v4());
	const [queryStats, setQueryStats] = useState<WsDataEvent>();
	const [listChartQuery, setListChartQuery] = useState<Query | null>(null);

	const [orderBy, setOrderBy] = useState<string>('timestamp:desc');

	const listQuery = useMemo(() => {
		if (!stagedQuery || stagedQuery.builder.queryData.length < 1) return null;

		return stagedQuery.builder.queryData.find((item) => !item.disabled) || null;
	}, [stagedQuery]);

	const isMultipleQueries = useMemo(
		() =>
			currentQuery?.builder?.queryData?.length > 1 ||
			currentQuery?.builder?.queryFormulas?.length > 0,
		[currentQuery],
	);

	const isGroupByExist = useMemo(() => {
		const groupByCount: number = currentQuery?.builder?.queryData?.reduce<number>(
			(acc, query) => acc + query.groupBy.length,
			0,
		);

		return groupByCount > 0;
	}, [currentQuery]);

	const isLimit: boolean = useMemo(() => {
		if (!listQuery) return false;
		if (!listQuery.limit) return false;

		return logs.length >= listQuery.limit;
	}, [logs.length, listQuery]);

	useEffect(() => {
		if (!stagedQuery || !listQuery) {
			setListChartQuery(null);
			return;
		}

		let updatedFilterExpression = listQuery.filter?.expression || '';
		if (activeLogId) {
			updatedFilterExpression = `${updatedFilterExpression} id <= '${activeLogId}'`.trim();
		}

		const modifiedQueryData: IBuilderQuery = {
			...listQuery,
			aggregateOperator: LogsAggregatorOperator.COUNT,
			groupBy: [
				{
					key: 'severity_text',
					dataType: DataTypes.String,
					type: '',
					id: 'severity_text--string----true',
				},
			],
			legend: '{{severity_text}}',
			filter: {
				...listQuery?.filter,
				expression: updatedFilterExpression || '',
			},
			...(activeLogId && {
				filters: {
					...listQuery?.filters,
					items: [
						...(listQuery?.filters?.items || []),
						{
							id: v4(),
							key: {
								key: 'id',
								type: '',
								dataType: DataTypes.String,
							},
							op: OPERATORS['<='],
							value: activeLogId,
						},
					],
					op: 'AND',
				},
			}),
		};

		const modifiedQuery: Query = {
			...stagedQuery,
			builder: {
				...stagedQuery.builder,
				queryData: stagedQuery.builder.queryData.map((item) => ({
					...item,
					...modifiedQueryData,
				})),
			},
		};

		setListChartQuery(modifiedQuery);
	}, [stagedQuery, listQuery, activeLogId]);

	const exportDefaultQuery = useMemo(
		() =>
			updateAllQueriesOperators(
				currentQuery || initialQueriesMap.logs,
				selectedPanelType,
				DataSource.LOGS,
			),
		[currentQuery, selectedPanelType, updateAllQueriesOperators],
	);

	const {
		data: listChartData,
		isFetching: isFetchingListChartData,
		isLoading: isLoadingListChartData,
	} = useGetExplorerQueryRange(
		listChartQuery,
		PANEL_TYPES.TIME_SERIES,
		ENTITY_VERSION_V5,
		{
			enabled:
				showFrequencyChart && !!listChartQuery && panelType === PANEL_TYPES.LIST,
		},
		{},
		undefined,
		chartQueryKeyRef,
		undefined,
		'custom',
	);

	const {
		data,
		isLoading,
		isFetching,
		isError,
		isSuccess,
		error,
	} = useGetExplorerQueryRange(
		requestData,
		panelType,
		ENTITY_VERSION_V5,
		{
			keepPreviousData: true,
			enabled: !isLimit && !!requestData,
		},
		{
			...(activeLogId &&
				!logs.length && {
					start: minTime,
					end: maxTime,
				}),
		},
		undefined,
		listQueryKeyRef,
		{
			...(!isEmpty(queryId) &&
				selectedPanelType !== PANEL_TYPES.LIST && { 'X-SIGNOZ-QUERY-ID': queryId }),
		},
		// custom selected time interval to prevent recalculating the start and end timestamps before fetching next pages
		'custom',
	);

	const getRequestData = useCallback(
		(
			query: Query | null,
			params: {
				page: number;
				pageSize: number;
				filters: TagFilter;
				filter: Filter;
			},
		): Query | null => {
			if (!query) return null;

			const paginateData = getPaginationQueryDataV2({
				page: params.page,
				pageSize: params.pageSize,
			});

			// Add filter for activeLogId if present
			let updatedFilters = params.filters;
			let updatedFilterExpression = params.filter?.expression || '';
			if (activeLogId) {
				updatedFilters = {
					...params.filters,
					items: [
						...(params.filters?.items || []),
						{
							id: v4(),
							key: {
								key: 'id',
								type: '',
								dataType: DataTypes.String,
							},
							op: OPERATORS['<='],
							value: activeLogId,
						},
					],
					op: 'AND',
				};
				updatedFilterExpression = `${updatedFilterExpression} id <= '${activeLogId}'`.trim();
			}

			// Create orderBy array based on orderDirection
			const [columnName, order] = orderBy.split(':');

			const newOrderBy = [
				{ columnName: columnName || 'timestamp', order: order || 'desc' },
				{ columnName: 'id', order: order || 'desc' },
			];

			const queryData: IBuilderQuery[] =
				query.builder.queryData.length > 1
					? query.builder.queryData.map((item) => ({
							...item,
							...(selectedView !== ExplorerViews.LIST ? { order: [] } : {}),
					  }))
					: [
							{
								...(listQuery || initialQueryBuilderFormValues),
								...paginateData,
								...(updatedFilters ? { filters: updatedFilters } : {}),
								filter: {
									expression: updatedFilterExpression || '',
								},
								...(selectedView === ExplorerViews.LIST
									? { order: newOrderBy, orderBy: newOrderBy }
									: { order: [] }),
							},
					  ];

			const data: Query = {
				...query,
				builder: {
					...query.builder,
					queryData,
				},
			};

			return data;
		},
		[activeLogId, orderBy, listQuery, selectedView],
	);

	useEffect(() => {
		if (data?.payload) {
			setWarning(data?.warning);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [data?.payload, data?.warning]);

	const handleEndReached = useCallback(() => {
		if (!listQuery) return;

		if (isLimit) return;
		if (logs.length < pageSize) return;

		const { limit, filters, filter } = listQuery;

		const nextLogsLength = logs.length + pageSize;

		const nextPageSize =
			limit && nextLogsLength >= limit ? limit - logs.length : pageSize;

		if (!stagedQuery) return;

		const newRequestData = getRequestData(stagedQuery, {
			filters: filters || { items: [], op: 'AND' },
			filter: filter || { expression: '' },
			page: page + 1,
			pageSize: nextPageSize,
		});

		setPage((prevPage) => prevPage + 1);

		setRequestData(newRequestData);
	}, [isLimit, logs, listQuery, pageSize, stagedQuery, getRequestData, page]);

	useEffect(() => {
		setQueryId(v4());
	}, [data]);

	useEffect(() => {
		if (
			!isEmpty(queryId) &&
			(isLoading || isFetching) &&
			selectedPanelType !== PANEL_TYPES.LIST
		) {
			setQueryStats(undefined);
			setTimeout(() => {
				getQueryStats({ queryId, setData: setQueryStats });
			}, 500);
		}
	}, [queryId, isLoading, isFetching, selectedPanelType]);

	const logEventCalledRef = useRef(false);
	useEffect(() => {
		if (!logEventCalledRef.current && !isUndefined(data?.payload)) {
			const currentData = data?.payload?.data?.newResult?.data?.result || [];
			logEvent('Logs Explorer: Page visited', {
				panelType,
				isEmpty: !currentData?.[0]?.list,
			});
			logEventCalledRef.current = true;
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [data?.payload]);

	const getUpdatedQueryForExport = useCallback((): Query => {
		const updatedQuery = cloneDeep(currentQuery);

		set(updatedQuery, 'builder.queryData[0].pageSize', 10);

		return updatedQuery;
	}, [currentQuery]);

	const handleExport = useCallback(
		(dashboard: Dashboard | null, isNewDashboard?: boolean): void => {
			if (!dashboard || !panelType) return;

			const panelTypeParam = AVAILABLE_EXPORT_PANEL_TYPES.includes(panelType)
				? panelType
				: PANEL_TYPES.TIME_SERIES;

			const widgetId = v4();

			const query =
				panelType === PANEL_TYPES.LIST
					? getUpdatedQueryForExport()
					: exportDefaultQuery;

			logEvent('Logs Explorer: Add to dashboard successful', {
				panelType,
				isNewDashboard,
				dashboardName: dashboard?.data?.title,
			});

			const dashboardEditView = generateExportToDashboardLink({
				query,
				panelType: panelTypeParam,
				dashboardId: dashboard.id,
				widgetId,
			});

			safeNavigate(dashboardEditView);
		},
		[getUpdatedQueryForExport, exportDefaultQuery, safeNavigate, panelType],
	);

	useEffect(() => {
		const shouldChangeView = isMultipleQueries || isGroupByExist;

		if (selectedPanelType === PANEL_TYPES.LIST && shouldChangeView) {
			handleExplorerTabChange(PANEL_TYPES.TIME_SERIES);
			setSelectedPanelType(PANEL_TYPES.TIME_SERIES);
		}

		if (panelType) {
			setSelectedPanelType(panelType);
		}
	}, [
		isMultipleQueries,
		isGroupByExist,
		selectedPanelType,
		selectedView,
		handleExplorerTabChange,
		panelType,
	]);

	useEffect(() => {
		if (selectedView && selectedView === ExplorerViews.LIST && handleSetConfig) {
			handleSetConfig(defaultTo(panelTypes, PANEL_TYPES.LIST), DataSource.LOGS);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [handleSetConfig, panelTypes]);

	useEffect(() => {
		const currentData = data?.payload?.data?.newResult?.data?.result || [];
		if (currentData.length > 0 && currentData[0].list) {
			const currentLogs: ILog[] = currentData[0].list.map((item) => ({
				...item.data,
				timestamp: item.timestamp,
			}));
			const newLogs = [...logs, ...currentLogs];

			setLogs(newLogs);
		}

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [data]);

	// Store previous orderDirection to detect changes
	const prevOrderByRef = useRef(orderBy);

	useEffect(() => {
		const orderByChanged =
			prevOrderByRef.current !== orderBy && selectedPanelType === PANEL_TYPES.LIST;
		prevOrderByRef.current = orderBy;

		if (
			requestData?.id !== stagedQuery?.id ||
			currentMinTimeRef.current !== minTime ||
			orderByChanged
		) {
			// Recalculate global time when query changes i.e. stage and run query clicked
			if (
				!!requestData?.id &&
				stagedQuery?.id &&
				requestData?.id !== stagedQuery?.id &&
				selectedTime !== 'custom'
			) {
				dispatch(UpdateTimeInterval(selectedTime));
			}

			const newRequestData = getRequestData(stagedQuery, {
				filters: listQuery?.filters || initialFilters,
				filter: listQuery?.filter || { expression: '' },
				page: 1,
				pageSize,
			});

			setLogs([]);
			setPage(1);
			setRequestData(newRequestData);
			currentMinTimeRef.current = minTime;
		}
	}, [
		stagedQuery,
		requestData,
		getRequestData,
		listQuery,
		pageSize,
		minTime,
		activeLogId,
		panelType,
		selectedView,
		dispatch,
		selectedTime,
		maxTime,
		orderBy,
		selectedPanelType,
	]);

	const chartData = useMemo(() => {
		if (!stagedQuery) return [];

		if (panelType === PANEL_TYPES.LIST) {
			if (listChartData && listChartData.payload.data?.result.length > 0) {
				return listChartData.payload.data.result;
			}
			return [];
		}

		if (!data || data.payload.data?.result.length === 0) return [];

		const isGroupByExist = stagedQuery.builder.queryData.some(
			(queryData) => queryData.groupBy.length > 0,
		);

		const firstPayloadQuery = data.payload.data?.result.find(
			(item) => item.queryName === listQuery?.queryName,
		);

		const firstPayloadQueryArray = firstPayloadQuery ? [firstPayloadQuery] : [];

		return isGroupByExist ? data.payload.data.result : firstPayloadQueryArray;
	}, [stagedQuery, panelType, data, listChartData, listQuery]);

	useEffect(() => {
		if (
			isLoading ||
			isFetching ||
			isLoadingListChartData ||
			isFetchingListChartData
		) {
			setIsLoadingQueries(true);
		} else {
			setIsLoadingQueries(false);
		}
	}, [
		isLoading,
		isFetching,
		isFetchingListChartData,
		isLoadingListChartData,
		setIsLoadingQueries,
	]);

	const handleToggleFrequencyChart = useCallback(() => {
		const newShowFrequencyChart = !showFrequencyChart;

		// store the value in local storage
		setToLocalstorage(
			LOCALSTORAGE.SHOW_FREQUENCY_CHART,
			newShowFrequencyChart?.toString() || 'false',
		);

		setShowFrequencyChart(newShowFrequencyChart);
	}, [showFrequencyChart]);

	return (
		<div className="logs-explorer-views-container">
			<div className="logs-explorer-views-types">
				{!showLiveLogs && (
					<LogsActionsContainer
						listQuery={listQuery}
						queryStats={queryStats}
						selectedPanelType={selectedPanelType}
						showFrequencyChart={showFrequencyChart}
						handleToggleFrequencyChart={handleToggleFrequencyChart}
						orderBy={orderBy}
						setOrderBy={setOrderBy}
						isFetching={isFetching}
						isLoading={isLoading}
						isError={isError}
						isSuccess={isSuccess}
						minTime={minTime}
						maxTime={maxTime}
					/>
				)}

				{selectedPanelType === PANEL_TYPES.LIST &&
					showFrequencyChart &&
					!showLiveLogs && (
						<div className="logs-frequency-chart-container">
							<LogsExplorerChart
								className="logs-frequency-chart"
								isLoading={isFetchingListChartData || isLoadingListChartData}
								data={chartData}
								isLogsExplorerViews={panelType === PANEL_TYPES.LIST}
							/>
						</div>
					)}

				<div className="logs-explorer-views-type-content">
					{showLiveLogs && <LiveLogs />}

					{selectedPanelType === PANEL_TYPES.LIST && !showLiveLogs && (
						<LogsExplorerList
							isLoading={isLoading}
							isFetching={isFetching}
							currentStagedQueryData={listQuery}
							logs={logs}
							onEndReached={handleEndReached}
							isFrequencyChartVisible={showFrequencyChart}
							isError={isError}
							error={error as APIError}
							isFilterApplied={!isEmpty(listQuery?.filters?.items)}
						/>
					)}

					{selectedPanelType === PANEL_TYPES.TIME_SERIES && !showLiveLogs && (
						<TimeSeriesView
							isLoading={isLoading || isFetching}
							data={data}
							isError={isError}
							error={error as APIError}
							isFilterApplied={!isEmpty(listQuery?.filters?.items)}
							dataSource={DataSource.LOGS}
							setWarning={setWarning}
						/>
					)}

					{selectedPanelType === PANEL_TYPES.TABLE && !showLiveLogs && (
						<LogsExplorerTable
							data={
								(data?.payload?.data?.newResult?.data?.result ||
									data?.payload?.data?.result ||
									[]) as QueryDataV3[]
							}
							isLoading={isLoading || isFetching}
							isError={isError}
							error={error as APIError}
						/>
					)}
				</div>
			</div>

			<GoToTop />

			<ExplorerOptionWrapper
				disabled={!stagedQuery}
				query={exportDefaultQuery}
				onExport={handleExport}
				sourcepage={DataSource.LOGS}
			/>
		</div>
	);
}

export default memo(LogsExplorerViewsContainer);
