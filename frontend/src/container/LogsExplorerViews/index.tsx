import { TabsProps } from 'antd';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { queryParamNamesMap } from 'constants/queryBuilderQueryNames';
import { DEFAULT_PER_PAGE_VALUE } from 'container/Controls/config';
import LogExplorerDetailedView from 'container/LogExplorerDetailedView';
import LogsExplorerChart from 'container/LogsExplorerChart';
import LogsExplorerList from 'container/LogsExplorerList';
// TODO: temporary hide table view
// import LogsExplorerTable from 'container/LogsExplorerTable';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import TimeSeriesView from 'container/TimeSeriesView/TimeSeriesView';
import { useGetExplorerQueryRange } from 'hooks/queryBuilder/useGetExplorerQueryRange';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import useUrlQueryData from 'hooks/useUrlQueryData';
import { getPaginationQueryData } from 'lib/newQueryBuilder/getPaginationQueryData';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { ILog } from 'types/api/logs/log';
import {
	IBuilderQuery,
	OrderByPayload,
	Query,
} from 'types/api/queryBuilder/queryBuilderData';
import { DataSource, StringOperators } from 'types/common/queryBuilder';

import { TabsStyled } from './LogsExplorerViews.styled';

function LogsExplorerViews(): JSX.Element {
	const { queryData: pageSize } = useUrlQueryData(
		queryParamNamesMap.pageSize,
		DEFAULT_PER_PAGE_VALUE,
	);

	// Context
	const {
		currentQuery,
		stagedQuery,
		panelType,
		updateAllQueriesOperators,
		redirectWithQueryBuilderData,
	} = useQueryBuilder();

	// State
	const [activeLog, setActiveLog] = useState<ILog | null>(null);
	const [page, setPage] = useState<number>(1);
	const [logs, setLogs] = useState<ILog[]>([]);
	const [requestData, setRequestData] = useState<Query | null>(null);

	const currentStagedQueryData = useMemo(() => {
		if (!stagedQuery || stagedQuery.builder.queryData.length !== 1) return null;

		return stagedQuery.builder.queryData[0];
	}, [stagedQuery]);

	const orderByTimestamp: OrderByPayload | null = useMemo(() => {
		const timestampOrderBy = currentStagedQueryData?.orderBy.find(
			(item) => item.columnName === 'timestamp',
		);

		return timestampOrderBy || null;
	}, [currentStagedQueryData]);

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
		if (!currentStagedQueryData) return false;
		if (!currentStagedQueryData.limit) return false;

		return logs.length >= currentStagedQueryData.limit;
	}, [logs.length, currentStagedQueryData]);

	const listChartQuery = useMemo(() => {
		if (!stagedQuery || !currentStagedQueryData) return null;

		const modifiedQueryData: IBuilderQuery = {
			...currentStagedQueryData,
			aggregateOperator: StringOperators.COUNT,
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
	}, [stagedQuery, currentStagedQueryData]);

	const listChartData = useGetExplorerQueryRange(
		listChartQuery,
		PANEL_TYPES.TIME_SERIES,
	);

	const { data, isFetching, isError } = useGetExplorerQueryRange(
		requestData,
		panelType,
		{
			keepPreviousData: true,
			enabled: !isLimit,
		},
	);

	const handleSetActiveLog = useCallback((nextActiveLog: ILog) => {
		setActiveLog(nextActiveLog);
	}, []);

	const handleClearActiveLog = useCallback(() => {
		setActiveLog(null);
	}, []);

	const handleChangeView = useCallback(
		(newPanelType: string) => {
			if (newPanelType === panelType) return;

			const query = updateAllQueriesOperators(
				currentQuery,
				newPanelType as GRAPH_TYPES,
				DataSource.LOGS,
			);

			redirectWithQueryBuilderData(query, {
				[queryParamNamesMap.panelTypes]: newPanelType,
			});
		},
		[
			currentQuery,
			panelType,
			updateAllQueriesOperators,
			redirectWithQueryBuilderData,
		],
	);

	const getRequestData = useCallback(
		(
			query: Query | null,
			params: { page: number; log: ILog | null; pageSize: number },
		): Query | null => {
			if (!query) return null;

			const paginateData = getPaginationQueryData({
				currentStagedQueryData,
				listItemId: params.log ? params.log.id : null,
				orderByTimestamp,
				page: params.page,
				pageSize: params.pageSize,
			});

			const data: Query = {
				...query,
				builder: {
					...query.builder,
					queryData: query.builder.queryData.map((item) => ({
						...item,
						...paginateData,
						pageSize: params.pageSize,
					})),
				},
			};

			return data;
		},
		[currentStagedQueryData, orderByTimestamp],
	);

	const handleEndReached = useCallback(
		(index: number) => {
			if (isLimit) return;

			const lastLog = logs[index];

			const limit = currentStagedQueryData?.limit;

			const nextLogsLenth = logs.length + pageSize;

			const nextPageSize =
				limit && nextLogsLenth >= limit ? limit - logs.length : pageSize;

			if (!stagedQuery) return;

			const newRequestData = getRequestData(stagedQuery, {
				page: page + 1,
				log: orderByTimestamp ? lastLog : null,
				pageSize: nextPageSize,
			});

			setPage((prevPage) => prevPage + 1);

			setRequestData(newRequestData);
		},
		[
			isLimit,
			logs,
			currentStagedQueryData?.limit,
			pageSize,
			stagedQuery,
			getRequestData,
			page,
			orderByTimestamp,
		],
	);

	useEffect(() => {
		const shouldChangeView = isMultipleQueries || isGroupByExist;

		if (panelType === 'list' && shouldChangeView) {
			handleChangeView(PANEL_TYPES.TIME_SERIES);
		}
	}, [panelType, isMultipleQueries, isGroupByExist, handleChangeView]);

	useEffect(() => {
		const currentData = data?.payload.data.newResult.data.result || [];
		if (currentData.length > 0 && currentData[0].list) {
			const currentLogs: ILog[] = currentData[0].list.map((item) => ({
				...item.data,
				timestamp: item.timestamp,
			}));
			setLogs((prevLogs) => [...prevLogs, ...currentLogs]);
		}
	}, [data]);

	useEffect(() => {
		if (requestData?.id !== stagedQuery?.id) {
			const newRequestData = getRequestData(stagedQuery, {
				page: 1,
				log: null,
				pageSize,
			});
			setLogs([]);
			setPage(1);
			setRequestData(newRequestData);
		}
	}, [stagedQuery, requestData, getRequestData, pageSize]);

	const tabsItems: TabsProps['items'] = useMemo(
		() => [
			{
				label: 'List View',
				key: PANEL_TYPES.LIST,
				disabled: isMultipleQueries || isGroupByExist,
				children: (
					<LogsExplorerList
						isLoading={isFetching}
						currentStagedQueryData={currentStagedQueryData}
						logs={logs}
						onOpenDetailedView={handleSetActiveLog}
						onEndReached={handleEndReached}
						onExpand={handleSetActiveLog}
					/>
				),
			},
			{
				label: 'TimeSeries',
				key: PANEL_TYPES.TIME_SERIES,
				children: (
					<TimeSeriesView isLoading={isFetching} data={data} isError={isError} />
				),
			},
			// TODO: temporary hide table view
			// {
			// 	label: 'Table',
			// 	key: PANEL_TYPES.TABLE,
			// 	children: (
			// 		<LogsExplorerTable
			// 			data={data?.payload.data.newResult.data.result || []}
			// 			isLoading={isFetching}
			// 		/>
			// 	),
			// },
		],
		[
			isMultipleQueries,
			isGroupByExist,
			isFetching,
			currentStagedQueryData,
			logs,
			handleSetActiveLog,
			handleEndReached,
			data,
			isError,
		],
	);

	const chartData = useMemo(() => {
		if (!stagedQuery) return [];

		if (panelType === PANEL_TYPES.LIST) {
			if (
				listChartData &&
				listChartData.data &&
				listChartData.data.payload.data.result.length > 0
			) {
				return listChartData.data.payload.data.result;
			}
			return [];
		}

		if (!data || data.payload.data.result.length === 0) return [];

		const isGroupByExist = stagedQuery.builder.queryData.some(
			(queryData) => queryData.groupBy.length > 0,
		);

		return isGroupByExist
			? data.payload.data.result
			: [data.payload.data.result[0]];
	}, [stagedQuery, data, panelType, listChartData]);

	return (
		<>
			<LogsExplorerChart isLoading={isFetching} data={chartData} />
			<TabsStyled
				items={tabsItems}
				defaultActiveKey={panelType || PANEL_TYPES.LIST}
				activeKey={panelType || PANEL_TYPES.LIST}
				onChange={handleChangeView}
				destroyInactiveTabPane
			/>
			<LogExplorerDetailedView log={activeLog} onClose={handleClearActiveLog} />
		</>
	);
}

export default memo(LogsExplorerViews);
