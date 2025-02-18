/* eslint-disable sonarjs/cognitive-complexity */
import './LogsExplorerViews.styles.scss';

import { Button, Typography } from 'antd';
import { getQueryStats, WsDataEvent } from 'api/common/getQueryStats';
import logEvent from 'api/common/logEvent';
import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';
import LogsFormatOptionsMenu from 'components/LogsFormatOptionsMenu/LogsFormatOptionsMenu';
import { DEFAULT_ENTITY_VERSION } from 'constants/app';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { LOCALSTORAGE } from 'constants/localStorage';
import { AVAILABLE_EXPORT_PANEL_TYPES } from 'constants/panelTypes';
import { QueryParams } from 'constants/query';
import {
	initialFilters,
	initialQueriesMap,
	initialQueryBuilderFormValues,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import { DEFAULT_PER_PAGE_VALUE } from 'container/Controls/config';
import Download from 'container/DownloadV2/DownloadV2';
import ExplorerOptionWrapper from 'container/ExplorerOptions/ExplorerOptionWrapper';
import GoToTop from 'container/GoToTop';
import LogsExplorerChart from 'container/LogsExplorerChart';
import LogsExplorerList from 'container/LogsExplorerList';
import LogsExplorerTable from 'container/LogsExplorerTable';
import { useOptionsMenu } from 'container/OptionsMenu';
import TimeSeriesView from 'container/TimeSeriesView/TimeSeriesView';
import dayjs from 'dayjs';
import { useUpdateDashboard } from 'hooks/dashboard/useUpdateDashboard';
import { addEmptyWidgetInDashboardJSONWithQuery } from 'hooks/dashboard/utils';
import { LogTimeRange } from 'hooks/logs/types';
import { useCopyLogLink } from 'hooks/logs/useCopyLogLink';
import { useGetExplorerQueryRange } from 'hooks/queryBuilder/useGetExplorerQueryRange';
import { useGetPanelTypesQueryParam } from 'hooks/queryBuilder/useGetPanelTypesQueryParam';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import useAxiosError from 'hooks/useAxiosError';
import useClickOutside from 'hooks/useClickOutside';
import { useHandleExplorerTabChange } from 'hooks/useHandleExplorerTabChange';
import { useNotifications } from 'hooks/useNotifications';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQueryData from 'hooks/useUrlQueryData';
import { FlatLogData } from 'lib/logs/flatLogData';
import { getPaginationQueryData } from 'lib/newQueryBuilder/getPaginationQueryData';
import {
	cloneDeep,
	defaultTo,
	isEmpty,
	isUndefined,
	omit,
	set,
} from 'lodash-es';
import { Sliders } from 'lucide-react';
import { SELECTED_VIEWS } from 'pages/LogsExplorer/utils';
import { useTimezone } from 'providers/Timezone';
import {
	memo,
	MutableRefObject,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { Dashboard } from 'types/api/dashboard/getAll';
import { ILog } from 'types/api/logs/log';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import {
	IBuilderQuery,
	OrderByPayload,
	Query,
	TagFilter,
} from 'types/api/queryBuilder/queryBuilderData';
import {
	DataSource,
	LogsAggregatorOperator,
	StringOperators,
} from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';
import { generateExportToDashboardLink } from 'utils/dashboard/generateExportToDashboardLink';
import { v4 } from 'uuid';

import QueryStatus from './QueryStatus';

function LogsExplorerViews({
	selectedView,
	showFrequencyChart,
	setIsLoadingQueries,
	listQueryKeyRef,
	chartQueryKeyRef,
}: {
	selectedView: SELECTED_VIEWS;
	showFrequencyChart: boolean;
	setIsLoadingQueries: React.Dispatch<React.SetStateAction<boolean>>;
	listQueryKeyRef: MutableRefObject<any>;
	chartQueryKeyRef: MutableRefObject<any>;
}): JSX.Element {
	const { notifications } = useNotifications();
	const { safeNavigate } = useSafeNavigate();

	// this is to respect the panel type present in the URL rather than defaulting it to list always.
	const panelTypes = useGetPanelTypesQueryParam(PANEL_TYPES.LIST);

	const { activeLogId, onTimeRangeChange } = useCopyLogLink();

	const { queryData: pageSize } = useUrlQueryData(
		QueryParams.pageSize,
		DEFAULT_PER_PAGE_VALUE,
	);

	const { minTime, maxTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const currentMinTimeRef = useRef<number>(minTime);

	// Context
	const {
		initialDataSource,
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
	const [lastLogLineTimestamp, setLastLogLineTimestamp] = useState<
		number | string | null
	>();
	const [requestData, setRequestData] = useState<Query | null>(null);
	const [showFormatMenuItems, setShowFormatMenuItems] = useState(false);
	const [queryId, setQueryId] = useState<string>(v4());
	const [queryStats, setQueryStats] = useState<WsDataEvent>();

	const handleAxisError = useAxiosError();

	const listQuery = useMemo(() => {
		if (!stagedQuery || stagedQuery.builder.queryData.length < 1) return null;

		return stagedQuery.builder.queryData.find((item) => !item.disabled) || null;
	}, [stagedQuery]);

	const { options, config } = useOptionsMenu({
		storageKey: LOCALSTORAGE.LOGS_LIST_OPTIONS,
		dataSource: initialDataSource || DataSource.LOGS,
		aggregateOperator: listQuery?.aggregateOperator || StringOperators.NOOP,
	});

	const orderByTimestamp: OrderByPayload | null = useMemo(() => {
		const timestampOrderBy = listQuery?.orderBy.find(
			(item) => item.columnName === 'timestamp',
		);

		return timestampOrderBy || null;
	}, [listQuery]);

	const isMultipleQueries = useMemo(
		() =>
			currentQuery.builder.queryData.length > 1 ||
			currentQuery.builder.queryFormulas.length > 0,
		[currentQuery],
	);

	const isGroupByExist = useMemo(() => {
		const groupByCount: number = currentQuery.builder.queryData.reduce<number>(
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

	const listChartQuery = useMemo(() => {
		if (!stagedQuery || !listQuery) return null;

		const modifiedQueryData: IBuilderQuery = {
			...listQuery,
			aggregateOperator: LogsAggregatorOperator.COUNT,
			groupBy: [
				{
					key: 'severity_text',
					dataType: DataTypes.String,
					type: '',
					isColumn: true,
					isJSON: false,
					id: 'severity_text--string----true',
				},
			],
			legend: '{{severity_text}}',
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

		return modifiedQuery;
	}, [stagedQuery, listQuery]);

	const exportDefaultQuery = useMemo(
		() =>
			updateAllQueriesOperators(
				currentQuery || initialQueriesMap.logs,
				selectedPanelType,
				DataSource.LOGS,
			),
		[currentQuery, selectedPanelType, updateAllQueriesOperators],
	);

	const handleModeChange = (panelType: PANEL_TYPES): void => {
		if (selectedView === SELECTED_VIEWS.SEARCH) {
			handleSetConfig(panelType, DataSource.LOGS);
		}

		setShowFormatMenuItems(false);
		handleExplorerTabChange(panelType);
	};

	const {
		data: listChartData,
		isFetching: isFetchingListChartData,
		isLoading: isLoadingListChartData,
	} = useGetExplorerQueryRange(
		listChartQuery,
		PANEL_TYPES.TIME_SERIES,
		DEFAULT_ENTITY_VERSION,
		{
			enabled: !!listChartQuery && panelType === PANEL_TYPES.LIST,
		},
		{},
		undefined,
		chartQueryKeyRef,
	);

	const {
		data,
		isLoading,
		isFetching,
		isError,
		isSuccess,
	} = useGetExplorerQueryRange(
		requestData,
		panelType,
		DEFAULT_ENTITY_VERSION,
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
			// send the lastLogTimeStamp only when the panel type is list and the orderBy is timestamp and the order is desc
			lastLogLineTimestamp:
				panelType === PANEL_TYPES.LIST &&
				requestData?.builder?.queryData?.[0]?.orderBy?.[0]?.columnName ===
					'timestamp' &&
				requestData?.builder?.queryData?.[0]?.orderBy?.[0]?.order === 'desc'
					? lastLogLineTimestamp
					: undefined,
		},
		undefined,
		listQueryKeyRef,
		{
			...(!isEmpty(queryId) &&
				selectedPanelType !== PANEL_TYPES.LIST && { 'X-SIGNOZ-QUERY-ID': queryId }),
		},
	);

	const getRequestData = useCallback(
		(
			query: Query | null,
			params: {
				page: number;
				log: ILog | null;
				pageSize: number;
				filters: TagFilter;
			},
		): Query | null => {
			if (!query) return null;

			const paginateData = getPaginationQueryData({
				filters: params.filters,
				listItemId: params.log ? params.log.id : null,
				orderByTimestamp,
				page: params.page,
				pageSize: params.pageSize,
			});

			const queryData: IBuilderQuery[] =
				query.builder.queryData.length > 1
					? query.builder.queryData
					: [
							{
								...(listQuery || initialQueryBuilderFormValues),
								...paginateData,
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
		[orderByTimestamp, listQuery],
	);

	const handleEndReached = useCallback(
		(index: number) => {
			if (!listQuery) return;

			if (isLimit) return;
			if (logs.length < pageSize) return;

			const { limit, filters } = listQuery;

			const lastLog = logs[index];

			const nextLogsLength = logs.length + pageSize;

			const nextPageSize =
				limit && nextLogsLength >= limit ? limit - logs.length : pageSize;

			if (!stagedQuery) return;

			const newRequestData = getRequestData(stagedQuery, {
				filters,
				page: page + 1,
				log: orderByTimestamp ? lastLog : null,
				pageSize: nextPageSize,
			});

			// initialise the last log timestamp to null as we don't have the logs.
			// as soon as we scroll to the end of the logs we set the lastLogLineTimestamp to the last log timestamp.
			setLastLogLineTimestamp(lastLog.timestamp);

			setPage((prevPage) => prevPage + 1);

			setRequestData(newRequestData);
		},
		[
			isLimit,
			logs,
			listQuery,
			pageSize,
			stagedQuery,
			getRequestData,
			page,
			orderByTimestamp,
		],
	);

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

	const {
		mutate: updateDashboard,
		isLoading: isUpdateDashboardLoading,
	} = useUpdateDashboard();

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

			const updatedDashboard = addEmptyWidgetInDashboardJSONWithQuery(
				dashboard,
				query,
				widgetId,
				panelTypeParam,
				options.selectColumns,
			);

			logEvent('Logs Explorer: Add to dashboard successful', {
				panelType,
				isNewDashboard,
				dashboardName: dashboard?.data?.title,
			});

			updateDashboard(updatedDashboard, {
				onSuccess: (data) => {
					if (data.error) {
						const message =
							data.error === 'feature usage exceeded' ? (
								<span>
									Panel limit exceeded for {DataSource.LOGS} in community edition. Please
									checkout our paid plans{' '}
									<a
										href="https://signoz.io/pricing/?utm_source=product&utm_medium=dashboard-limit"
										rel="noreferrer noopener"
										target="_blank"
									>
										here
									</a>
								</span>
							) : (
								data.error
							);
						notifications.error({
							message,
						});

						return;
					}

					const dashboardEditView = generateExportToDashboardLink({
						query,
						panelType: panelTypeParam,
						dashboardId: data.payload?.uuid || '',
						widgetId,
					});

					safeNavigate(dashboardEditView);
				},
				onError: handleAxisError,
			});
		},
		[
			getUpdatedQueryForExport,
			exportDefaultQuery,
			options.selectColumns,
			safeNavigate,
			notifications,
			panelType,
			updateDashboard,
			handleAxisError,
		],
	);

	useEffect(() => {
		const shouldChangeView =
			(isMultipleQueries || isGroupByExist) &&
			selectedView !== SELECTED_VIEWS.SEARCH;

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
		if (
			selectedView &&
			selectedView === SELECTED_VIEWS.SEARCH &&
			handleSetConfig
		) {
			handleSetConfig(defaultTo(panelTypes, PANEL_TYPES.LIST), DataSource.LOGS);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [handleSetConfig, panelTypes]);

	useEffect(() => {
		const currentParams = data?.params as Omit<LogTimeRange, 'pageSize'>;
		const currentData = data?.payload?.data?.newResult?.data?.result || [];
		if (currentData.length > 0 && currentData[0].list) {
			const currentLogs: ILog[] = currentData[0].list.map((item) => ({
				...item.data,
				timestamp: item.timestamp,
			}));
			const newLogs = [...logs, ...currentLogs];

			setLogs(newLogs);
			onTimeRangeChange({
				start: currentParams?.start,
				end: currentParams?.end,
				pageSize: newLogs.length,
			});
		}

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [data]);

	useEffect(() => {
		// clear the lastLogLineTimestamp when the data changes
		setLastLogLineTimestamp(null);
	}, [data]);

	useEffect(() => {
		if (
			requestData?.id !== stagedQuery?.id ||
			currentMinTimeRef.current !== minTime
		) {
			const newRequestData = getRequestData(stagedQuery, {
				filters: listQuery?.filters || initialFilters,
				page: 1,
				log: null,
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
		onTimeRangeChange,
		panelType,
		selectedView,
	]);

	const chartData = useMemo(() => {
		if (!stagedQuery) return [];

		if (panelType === PANEL_TYPES.LIST) {
			if (listChartData && listChartData.payload.data.result.length > 0) {
				return listChartData.payload.data.result;
			}
			return [];
		}

		if (!data || data.payload.data.result.length === 0) return [];

		const isGroupByExist = stagedQuery.builder.queryData.some(
			(queryData) => queryData.groupBy.length > 0,
		);

		const firstPayloadQuery = data.payload.data.result.find(
			(item) => item.queryName === listQuery?.queryName,
		);

		const firstPayloadQueryArray = firstPayloadQuery ? [firstPayloadQuery] : [];

		return isGroupByExist ? data.payload.data.result : firstPayloadQueryArray;
	}, [stagedQuery, panelType, data, listChartData, listQuery]);

	const formatItems = [
		{
			key: 'raw',
			label: 'Raw',
			data: {
				title: 'max lines per row',
			},
		},
		{
			key: 'list',
			label: 'Default',
		},
		{
			key: 'table',
			label: 'Column',
			data: {
				title: 'columns',
			},
		},
	];

	const handleToggleShowFormatOptions = (): void =>
		setShowFormatMenuItems(!showFormatMenuItems);

	const menuRef = useRef<HTMLDivElement>(null);

	useClickOutside({
		ref: menuRef,
		onClickOutside: () => {
			if (showFormatMenuItems) {
				setShowFormatMenuItems(false);
			}
		},
	});

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

	const { timezone } = useTimezone();

	const flattenLogData = useMemo(
		() =>
			logs.map((log) => {
				const timestamp =
					typeof log.timestamp === 'string'
						? dayjs(log.timestamp)
								.tz(timezone.value)
								.format(DATE_TIME_FORMATS.ISO_DATETIME_MS)
						: dayjs(log.timestamp / 1e6)
								.tz(timezone.value)
								.format(DATE_TIME_FORMATS.ISO_DATETIME_MS);

				return FlatLogData({
					timestamp,
					body: log.body,
					...omit(log, 'timestamp', 'body'),
				});
			}),
		[logs, timezone.value],
	);

	return (
		<div className="logs-explorer-views-container">
			{showFrequencyChart && (
				<LogsExplorerChart
					className="logs-histogram"
					isLoading={isFetchingListChartData || isLoadingListChartData}
					data={chartData}
					isLogsExplorerViews={panelType === PANEL_TYPES.LIST}
				/>
			)}

			<div className="logs-explorer-views-types">
				<div className="views-tabs-container">
					<Button.Group className="views-tabs">
						<Button
							value={PANEL_TYPES.LIST}
							className={
								// eslint-disable-next-line sonarjs/no-duplicate-string
								selectedPanelType === PANEL_TYPES.LIST ? 'selected_view tab' : 'tab'
							}
							disabled={
								(isMultipleQueries || isGroupByExist) && selectedView !== 'search'
							}
							onClick={(): void => handleModeChange(PANEL_TYPES.LIST)}
							data-testid="logs-list-view"
						>
							List view
						</Button>
						<Button
							value={PANEL_TYPES.TIME_SERIES}
							className={
								// eslint-disable-next-line sonarjs/no-duplicate-string
								selectedPanelType === PANEL_TYPES.TIME_SERIES
									? 'selected_view tab'
									: 'tab'
							}
							onClick={(): void => handleModeChange(PANEL_TYPES.TIME_SERIES)}
							data-testid="time-series-view"
						>
							Time series
						</Button>
						<Button
							value={PANEL_TYPES.TABLE}
							className={
								// eslint-disable-next-line sonarjs/no-duplicate-string
								selectedPanelType === PANEL_TYPES.TABLE ? 'selected_view tab' : 'tab'
							}
							onClick={(): void => handleModeChange(PANEL_TYPES.TABLE)}
							data-testid="table-view"
						>
							Table
						</Button>
					</Button.Group>
					<div className="logs-actions-container">
						{selectedPanelType === PANEL_TYPES.LIST && (
							<div className="tab-options">
								<Download
									data={flattenLogData}
									isLoading={isFetching}
									fileName="log_data"
								/>
								<div className="format-options-container" ref={menuRef}>
									<Button
										className="periscope-btn"
										onClick={handleToggleShowFormatOptions}
										icon={<Sliders size={14} />}
										data-testid="periscope-btn"
									/>

									{showFormatMenuItems && (
										<LogsFormatOptionsMenu
											title="FORMAT"
											items={formatItems}
											selectedOptionFormat={options.format}
											config={config}
										/>
									)}
								</div>
							</div>
						)}
						{(selectedPanelType === PANEL_TYPES.TIME_SERIES ||
							selectedPanelType === PANEL_TYPES.TABLE) && (
							<div className="query-stats">
								<QueryStatus
									loading={isLoading || isFetching}
									error={isError}
									success={isSuccess}
								/>
								{queryStats?.read_rows && (
									<Typography.Text className="rows">
										{getYAxisFormattedValue(queryStats.read_rows?.toString(), 'short')}{' '}
										rows
									</Typography.Text>
								)}
								{queryStats?.elapsed_ms && (
									<>
										<div className="divider" />
										<Typography.Text className="time">
											{getYAxisFormattedValue(queryStats?.elapsed_ms?.toString(), 'ms')}
										</Typography.Text>
									</>
								)}
							</div>
						)}
					</div>
				</div>

				<div className="logs-explorer-views-type-content">
					{selectedPanelType === PANEL_TYPES.LIST && (
						<LogsExplorerList
							isLoading={isLoading}
							isFetching={isFetching}
							currentStagedQueryData={listQuery}
							logs={logs}
							onEndReached={handleEndReached}
							isError={isError}
							isFilterApplied={!isEmpty(listQuery?.filters.items)}
						/>
					)}

					{selectedPanelType === PANEL_TYPES.TIME_SERIES && (
						<TimeSeriesView
							isLoading={isLoading || isFetching}
							data={data}
							isError={isError}
							isFilterApplied={!isEmpty(listQuery?.filters.items)}
							dataSource={DataSource.LOGS}
						/>
					)}

					{selectedPanelType === PANEL_TYPES.TABLE && (
						<LogsExplorerTable
							data={data?.payload?.data?.newResult?.data?.result || []}
							isLoading={isLoading || isFetching}
							isError={isError}
						/>
					)}
				</div>
			</div>

			<GoToTop />

			<ExplorerOptionWrapper
				disabled={!stagedQuery}
				query={exportDefaultQuery}
				isLoading={isUpdateDashboardLoading}
				onExport={handleExport}
				sourcepage={DataSource.LOGS}
			/>
		</div>
	);
}

export default memo(LogsExplorerViews);
