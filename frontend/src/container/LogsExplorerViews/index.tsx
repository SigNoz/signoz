/* eslint-disable sonarjs/cognitive-complexity */
import './LogsExplorerViews.styles.scss';

import getFromLocalstorage from 'api/browser/localstorage/get';
import setToLocalstorage from 'api/browser/localstorage/set';
import logEvent from 'api/common/logEvent';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { LOCALSTORAGE } from 'constants/localStorage';
import { AVAILABLE_EXPORT_PANEL_TYPES } from 'constants/panelTypes';
import { QueryParams } from 'constants/query';
import { initialFilters, PANEL_TYPES } from 'constants/queryBuilder';
import { DEFAULT_PER_PAGE_VALUE } from 'container/Controls/config';
import ExplorerOptionWrapper from 'container/ExplorerOptions/ExplorerOptionWrapper';
import { ChangeViewFunctionType } from 'container/ExplorerOptions/types';
import GoToTop from 'container/GoToTop';
import LogsExplorerChart from 'container/LogsExplorerChart';
import LogsExplorerList from 'container/LogsExplorerList';
import LogsExplorerTable from 'container/LogsExplorerTable';
import {
	getExportQueryData,
	getFrequencyChartData,
	getListQuery,
	getQueryByPanelType,
} from 'container/LogsExplorerViews/explorerUtils';
import TimeSeriesView from 'container/TimeSeriesView/TimeSeriesView';
import { useCopyLogLink } from 'hooks/logs/useCopyLogLink';
import { useGetExplorerQueryRange } from 'hooks/queryBuilder/useGetExplorerQueryRange';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQueryData from 'hooks/useUrlQueryData';
import { isEmpty, isUndefined } from 'lodash-es';
import LiveLogs from 'pages/LiveLogs';
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
import { Query, TagFilter } from 'types/api/queryBuilder/queryBuilderData';
import { Filter } from 'types/api/v5/queryRange';
import { QueryDataV3 } from 'types/api/widgets/getQuery';
import { DataSource } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';
import { generateExportToDashboardLink } from 'utils/dashboard/generateExportToDashboardLink';
import { v4 } from 'uuid';

import LogsActionsContainer from './LogsActionsContainer';

function LogsExplorerViewsContainer({
	setIsLoadingQueries,
	listQueryKeyRef,
	chartQueryKeyRef,
	setWarning,
	showLiveLogs,
	handleChangeSelectedView,
}: {
	setIsLoadingQueries: React.Dispatch<React.SetStateAction<boolean>>;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	listQueryKeyRef: MutableRefObject<any>;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	chartQueryKeyRef: MutableRefObject<any>;
	setWarning: Dispatch<SetStateAction<Warning | undefined>>;
	showLiveLogs: boolean;
	handleChangeSelectedView: ChangeViewFunctionType;
}): JSX.Element {
	const { safeNavigate } = useSafeNavigate();
	const dispatch = useDispatch();

	const [showFrequencyChart, setShowFrequencyChart] = useState(
		() => getFromLocalstorage(LOCALSTORAGE.SHOW_FREQUENCY_CHART) === 'true',
	);

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
	const { stagedQuery, panelType } = useQueryBuilder();

	const selectedPanelType = panelType || PANEL_TYPES.LIST;

	// State
	const [page, setPage] = useState<number>(1);
	const [logs, setLogs] = useState<ILog[]>([]);
	const [requestData, setRequestData] = useState<Query | null>(null);
	const [queryId, setQueryId] = useState<string>(v4());
	const [listChartQuery, setListChartQuery] = useState<Query | null>(null);

	const [orderBy, setOrderBy] = useState<string>('timestamp:desc');

	const listQuery = useMemo(() => getListQuery(stagedQuery) || null, [
		stagedQuery,
	]);

	const isLimit: boolean = useMemo(() => {
		if (!listQuery) return false;
		if (!listQuery.limit) return false;

		return logs.length >= listQuery.limit;
	}, [logs.length, listQuery]);

	useEffect(() => {
		const modifiedQuery = getFrequencyChartData(stagedQuery, activeLogId);
		setListChartQuery(modifiedQuery);
	}, [stagedQuery, activeLogId]);

	const exportDefaultQuery = useMemo(
		() => getExportQueryData(requestData, selectedPanelType),
		[selectedPanelType, requestData],
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
				showFrequencyChart &&
				!!listChartQuery &&
				selectedPanelType === PANEL_TYPES.LIST,
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
		selectedPanelType,
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
		): Query | null =>
			getQueryByPanelType(query, selectedPanelType, {
				...params,
				activeLogId,
				orderBy,
			}),
		[activeLogId, orderBy, selectedPanelType],
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

	const logEventCalledRef = useRef(false);
	useEffect(() => {
		if (!logEventCalledRef.current && !isUndefined(data?.payload)) {
			const currentData = data?.payload?.data?.newResult?.data?.result || [];
			logEvent('Logs Explorer: Page visited', {
				panelType: selectedPanelType,
				isEmpty: !currentData?.[0]?.list,
			});
			logEventCalledRef.current = true;
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [data?.payload]);

	const handleExport = useCallback(
		(dashboard: Dashboard | null, isNewDashboard?: boolean): void => {
			if (!dashboard || !selectedPanelType) return;

			const panelTypeParam = AVAILABLE_EXPORT_PANEL_TYPES.includes(
				selectedPanelType,
			)
				? selectedPanelType
				: PANEL_TYPES.TIME_SERIES;

			const widgetId = v4();

			if (!exportDefaultQuery) return;

			logEvent('Logs Explorer: Add to dashboard successful', {
				panelType: selectedPanelType,
				isNewDashboard,
				dashboardName: dashboard?.data?.title,
			});

			const dashboardEditView = generateExportToDashboardLink({
				query: exportDefaultQuery,
				panelType: panelTypeParam,
				dashboardId: dashboard.id,
				widgetId,
			});

			safeNavigate(dashboardEditView);
		},
		[safeNavigate, exportDefaultQuery, selectedPanelType],
	);

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
		selectedPanelType,
		dispatch,
		selectedTime,
		maxTime,
		orderBy,
	]);

	const chartData = useMemo(() => {
		if (!stagedQuery) return [];

		if (selectedPanelType === PANEL_TYPES.LIST) {
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
	}, [stagedQuery, selectedPanelType, data, listChartData, listQuery]);

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
								isLogsExplorerViews={selectedPanelType === PANEL_TYPES.LIST}
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
				handleChangeSelectedView={handleChangeSelectedView}
			/>
		</div>
	);
}

export default memo(LogsExplorerViewsContainer);
