import { Col, Row, TabsProps } from 'antd';
import axios from 'axios';
import { QueryParams } from 'constants/query';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { queryParamNamesMap } from 'constants/queryBuilderQueryNames';
import ROUTES from 'constants/routes';
import { ITEMS_PER_PAGE_OPTIONS } from 'container/Controls/config';
import ExportPanel from 'container/ExportPanel';
import LogsExplorerChart from 'container/LogsExplorerChart';
import LogsExplorerList from 'container/LogsExplorerList';
import LogsExplorerTable from 'container/LogsExplorerTable';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import TimeSeriesView from 'container/TimeSeriesView/TimeSeriesView';
import { useUpdateDashboard } from 'hooks/dashboard/useUpdateDashboard';
import { addEmptyWidgetInDashboardJSONWithQuery } from 'hooks/dashboard/utils';
import { useGetExplorerQueryRange } from 'hooks/queryBuilder/useGetExplorerQueryRange';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useNotifications } from 'hooks/useNotifications';
import useUrlQueryData from 'hooks/useUrlQueryData';
import { getPaginationQueryData } from 'lib/newQueryBuilder/getPaginationQueryData';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { generatePath, useHistory } from 'react-router-dom';
import { Dashboard } from 'types/api/dashboard/getAll';
import { ILog } from 'types/api/logs/log';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import { ContainerStyled, TabsStyled } from './LogsExplorerViews.styled';

function LogsExplorerViews(): JSX.Element {
	const history = useHistory();
	const { queryData: pageSize } = useUrlQueryData(
		queryParamNamesMap.pageSize,
		ITEMS_PER_PAGE_OPTIONS[0],
	);

	const { notifications } = useNotifications();

	// Context
	const {
		currentQuery,
		isQueryStaged,
		stagedQuery,
		panelType,
		updateAllQueriesOperators,
		handleSetQueryData,
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

	const exportDefaultQuery = useMemo(
		() =>
			updateAllQueriesOperators(
				stagedQuery || initialQueriesMap.traces,
				PANEL_TYPES.TIME_SERIES,
				DataSource.TRACES,
			),
		[stagedQuery, updateAllQueriesOperators],
	);

	const { mutate: updateDashboard, isLoading } = useUpdateDashboard();

	const handleError = useCallback(
		(error: unknown): void => {
			if (axios.isAxiosError(error)) {
				notifications.error({
					message: error.message,
				});
			}
		},
		[notifications],
	);

	const { data, isFetching, isError } = useGetExplorerQueryRange(requestData, {
		keepPreviousData: true,
		onError: handleError,
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

	const handleExport = useCallback(
		(dashboard: Dashboard | null): void => {
			if (!dashboard) return;

			const updatedDashboard = addEmptyWidgetInDashboardJSONWithQuery(
				dashboard,
				exportDefaultQuery,
			);

			updateDashboard(updatedDashboard, {
				onSuccess: (data) => {
					const dashboardEditView = `${generatePath(ROUTES.DASHBOARD, {
						dashboardId: data?.payload?.uuid,
					})}/new?${QueryParams.graphType}=graph&${QueryParams.widgetId}=empty&${
						queryParamNamesMap.compositeQuery
					}=${encodeURIComponent(JSON.stringify(exportDefaultQuery))}`;

					history.push(dashboardEditView);
				},
				onError: handleError,
			});
		},
		[exportDefaultQuery, handleError, history, updateDashboard],
	);

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

	useEffect(() => {
		if (!requestData) return;
		if (panelType !== PANEL_TYPES.LIST) return;

		const {
			offset,
			pageSize,
			...restQueryData
		} = requestData.builder.queryData[0];

		handleSetQueryData(0, restQueryData);
	}, [handleSetQueryData, panelType, requestData]);

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
						isLimit={isLimit}
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
			isLimit,
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

			<Row justify="end">
				<Col>
					<ContainerStyled>
						<ExportPanel
							query={stagedQuery}
							isLoading={isLoading}
							onExport={handleExport}
						/>
					</ContainerStyled>
				</Col>
			</Row>

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
