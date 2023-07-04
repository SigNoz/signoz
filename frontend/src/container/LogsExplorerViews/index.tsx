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

import { TabsStyled } from './LogsExplorerViews.styled';

function LogsExplorerViews(): JSX.Element {
	const { queryData: pageSize } = useUrlQueryData(
		queryParamNamesMap.pageSize,
		DEFAULT_PER_PAGE_VALUE,
	);

	// Context
	const {
		currentQuery,
		isQueryStaged,
		stagedQuery,
		panelType,
		updateAllQueriesOperators,
		redirectWithQueryBuilderData,
	} = useQueryBuilder();

	// State
	const [currentScrolledLog, setCurrentScrolledLog] = useState<ILog | null>(
		null,
	);
	const [page, setPage] = useState<number>(1);
	const [logs, setLogs] = useState<ILog[]>([]);

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

	const paginationQueryData = useMemo(() => {
		if (!stagedQuery) return null;

		return getPaginationQueryData({
			query: stagedQuery,
			listItemId: currentScrolledLog ? currentScrolledLog.id : null,
			isTimeStampPresent,
			page,
			pageSize,
		});
	}, [stagedQuery, currentScrolledLog, isTimeStampPresent, page, pageSize]);

	const requestData: Query | null = useMemo(() => {
		if (!stagedQuery) return null;
		if (stagedQuery && panelType !== PANEL_TYPES.LIST) return stagedQuery;

		if (!paginationQueryData) return null;

		const data: Query = {
			...stagedQuery,
			builder: {
				...stagedQuery.builder,
				queryData: stagedQuery.builder.queryData.map((item) => ({
					...item,
					...paginationQueryData,
					pageSize,
				})),
			},
		};

		return data;
	}, [stagedQuery, panelType, paginationQueryData, pageSize]);

	const isLimit: boolean = useMemo(() => {
		if (!paginationQueryData) return false;

		const limit = paginationQueryData.limit || 100;

		return logs.length >= limit;
	}, [logs.length, paginationQueryData]);

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

	const { data, isFetching, isError } = useGetExplorerQueryRange(requestData, {
		keepPreviousData: true,
		...(isLimit ? { enabled: !isLimit } : {}),
	});

	const handleEndReached = useCallback(
		(index: number) => {
			const lastLog = logs[index];
			if (isLimit) return;

			if (isTimeStampPresent) {
				setCurrentScrolledLog((prevLog) =>
					prevLog?.id === lastLog.id ? prevLog : lastLog,
				);
			}

			setPage((prevPage) => prevPage + 1);
		},
		[logs, isLimit, isTimeStampPresent],
	);

	const handleResetPagination = useCallback(() => {
		setPage(1);
		setCurrentScrolledLog(null);
		setLogs([]);
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
		if (isQueryStaged && panelType === PANEL_TYPES.LIST) {
			handleResetPagination();
		}
	}, [handleResetPagination, isQueryStaged, panelType]);

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
