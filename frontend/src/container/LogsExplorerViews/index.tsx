import { TabsProps } from 'antd';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { queryParamNamesMap } from 'constants/queryBuilderQueryNames';
import { DEFAULT_PER_PAGE_VALUE } from 'container/Controls/config';
import LogsExplorerChart from 'container/LogsExplorerChart';
import LogsExplorerList from 'container/LogsExplorerList';
import LogsExplorerTable from 'container/LogsExplorerTable';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import TimeSeriesView from 'container/TimeSeriesView/TimeSeriesView';
import { useGetExplorerQueryRange } from 'hooks/queryBuilder/useGetExplorerQueryRange';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import useUrlQueryData from 'hooks/useUrlQueryData';
import { getPaginationQueryData } from 'lib/newQueryBuilder/getPaginationQueryData';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { ILog } from 'types/api/logs/log';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import { DEFAULT_QUERY_LIMIT } from './constants';
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

	const [page, setPage] = useState<number>(1);
	const [logs, setLogs] = useState<ILog[]>([]);
	const [requestData, setRequestData] = useState<Query | null>(null);

	const currentStagedQueryData = useMemo(() => {
		if (!stagedQuery || stagedQuery.builder.queryData.length !== 1) return null;

		return stagedQuery.builder.queryData[0];
	}, [stagedQuery]);

	const isTimeStampPresent: boolean = useMemo(() => {
		const timestampOrderBy = currentStagedQueryData?.orderBy.find(
			(item) => item.columnName === 'timestamp',
		);

		return !!timestampOrderBy;
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
		const limit = currentStagedQueryData.limit || DEFAULT_QUERY_LIMIT;

		return logs.length >= limit;
	}, [logs.length, currentStagedQueryData]);

	const { data, isFetching, isError } = useGetExplorerQueryRange(requestData, {
		keepPreviousData: true,
		enabled: !isLimit,
	});

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
				isTimeStampPresent,
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
						limit: item.limit || DEFAULT_QUERY_LIMIT,
						pageSize: params.pageSize,
					})),
				},
			};

			return data;
		},
		[currentStagedQueryData, isTimeStampPresent],
	);

	const handleEndReached = useCallback(
		(index: number) => {
			if (isLimit) return;

			const lastLog = logs[index];

			const limit = currentStagedQueryData?.limit || DEFAULT_QUERY_LIMIT;

			const nextLogsLenth = logs.length + pageSize;

			const nextPageSize = nextLogsLenth >= limit ? limit - logs.length : pageSize;

			if (!stagedQuery) return;

			const newRequestData = getRequestData(stagedQuery, {
				page: page + 1,
				log: isTimeStampPresent ? lastLog : null,
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
			isTimeStampPresent,
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
				timestamp: +item.timestamp,
				...item.data,
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
						onEndReached={handleEndReached}
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
			{
				label: 'Table',
				key: PANEL_TYPES.TABLE,
				children: (
					<LogsExplorerTable
						data={data?.payload.data.newResult.data.result || []}
						isLoading={isFetching}
					/>
				),
			},
		],
		[
			isMultipleQueries,
			isGroupByExist,
			isFetching,
			currentStagedQueryData,
			logs,
			handleEndReached,
			data,
			isError,
		],
	);

	return (
		<>
			<LogsExplorerChart
				isLoading={isFetching}
				data={data?.payload.data.result[0] ? [data?.payload.data.result[0]] : []}
			/>
			<TabsStyled
				items={tabsItems}
				defaultActiveKey={panelType || PANEL_TYPES.LIST}
				activeKey={panelType || PANEL_TYPES.LIST}
				onChange={handleChangeView}
				destroyInactiveTabPane
			/>
		</>
	);
}

export default memo(LogsExplorerViews);
