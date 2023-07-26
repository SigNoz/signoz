import { Button, Typography } from 'antd';
import RawLogView from 'components/Logs/RawLogView';
import Spinner from 'components/Spinner';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { FILTERS } from 'container/QueryBuilder/filters/OrderByFilter/config';
import { useGetExplorerQueryRange } from 'hooks/queryBuilder/useGetExplorerQueryRange';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { getPaginationQueryData } from 'lib/newQueryBuilder/getPaginationQueryData';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { ILog } from 'types/api/logs/log';
import {
	IBuilderQuery,
	Query,
	TagFilter,
} from 'types/api/queryBuilder/queryBuilderData';

import { getOrderByTimestamp, PAGE_SIZE } from './configs';
import { EmptyText, ListContainer, ShowButtonWrapper } from './styles';
import { getFiltersFromResources } from './utils';

interface LogsContextListProps {
	isEdit: boolean;
	query: Query;
	log: ILog;
	order: string;
	filters: TagFilter | null;
}

function LogsContextList({
	isEdit,
	query,
	log,
	order,
	filters,
}: LogsContextListProps): JSX.Element {
	const isDarkMode = useIsDarkMode();
	const [logs, setLogs] = useState<ILog[]>([]);
	const [page, setPage] = useState<number>(1);

	const lastLog = useMemo(() => logs[logs.length - 1], [logs]);
	const orderByTimestamp = useMemo(() => getOrderByTimestamp(order), [order]);

	const currentStagedQueryData = useMemo(() => {
		if (!query || query.builder.queryData.length !== 1) return null;

		return query.builder.queryData[0];
	}, [query]);

	const getRequestData = useCallback(
		(query: Query | null, page: number, log: ILog): Query | null => {
			if (!query) return null;

			const resourcesFilters = getFiltersFromResources(log.resources_string);

			const currentQuery: IBuilderQuery | null = currentStagedQueryData
				? {
						...currentStagedQueryData,
						filters: {
							...currentStagedQueryData.filters,
							items: [...currentStagedQueryData.filters.items, ...resourcesFilters],
						},
				  }
				: null;

			const paginateData = getPaginationQueryData({
				currentStagedQueryData: currentQuery,
				listItemId: log ? log.id : null,
				orderByTimestamp,
				page,
				pageSize: PAGE_SIZE,
			});

			const data: Query = {
				...query,
				builder: {
					...query.builder,
					queryData: query.builder.queryData.map((item) => ({
						...item,
						...paginateData,
						pageSize: PAGE_SIZE,
						orderBy: [orderByTimestamp],
					})),
				},
			};

			return data;
		},
		[currentStagedQueryData, orderByTimestamp],
	);

	const initialLogsRequest = useMemo(() => getRequestData(query, 1, log), [
		log,
		query,
		getRequestData,
	]);

	const [requestData, setRequestData] = useState<Query | null>(
		initialLogsRequest,
	);

	const { data: logsData, isError, isFetching } = useGetExplorerQueryRange(
		requestData,
		PANEL_TYPES.LIST,
		{
			keepPreviousData: true,
		},
	);

	const handleShowNextLines = useCallback(() => {
		if (logs.length < PAGE_SIZE || logs.length < page * PAGE_SIZE) return;

		const newRequestData = getRequestData(query, page + 1, lastLog);

		setPage((prevPage) => prevPage + 1);
		setRequestData(newRequestData);
	}, [query, logs, lastLog, page, getRequestData]);

	useEffect(() => {
		const currentData = logsData?.payload.data.newResult.data.result || [];
		if (currentData.length > 0 && currentData[0].list) {
			const currentLogs: ILog[] = currentData[0].list.map((item) => ({
				...item.data,
				timestamp: item.timestamp,
			}));
			const newLogs = [...logs, ...currentLogs];

			setLogs(newLogs);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [logsData]);

	useEffect(() => {
		if (!isEdit) return;

		const newRequestData = getRequestData(query, 1, log);

		setPage(1);
		setLogs([]);
		setRequestData(newRequestData);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filters]);

	const renderedShowButton = useMemo(
		() => (
			<ShowButtonWrapper>
				<Typography>
					Showing 10 lines {order === FILTERS.ASC ? 'after' : 'before'} match
				</Typography>
				<Button
					size="small"
					disabled={isFetching}
					loading={isFetching}
					onClick={handleShowNextLines}
				>
					Show 10 more lines
				</Button>
			</ShowButtonWrapper>
		),
		[isFetching, order, handleShowNextLines],
	);

	return (
		<>
			{order === FILTERS.ASC && renderedShowButton}

			<ListContainer $isDarkMode={isDarkMode}>
				{!logs.length && !isFetching && <EmptyText>No Data</EmptyText>}
				{isFetching && <Spinner size="large" height="10rem" />}

				{!isError &&
					!!logs.length &&
					!isFetching &&
					logs.map((log) => (
						<RawLogView isReadOnly key={log.id} data={log} linesPerRow={1} />
					))}
			</ListContainer>

			{order === FILTERS.DESC && renderedShowButton}
		</>
	);
}

export default memo(LogsContextList);
