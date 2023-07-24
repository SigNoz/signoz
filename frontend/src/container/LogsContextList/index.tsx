import { Button, Typography } from 'antd';
import RawLogView from 'components/Logs/RawLogView';
import Spinner from 'components/Spinner';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { FILTERS } from 'container/QueryBuilder/filters/OrderByFilter/config';
import { useGetExplorerQueryRange } from 'hooks/queryBuilder/useGetExplorerQueryRange';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { getPaginationQueryData } from 'lib/newQueryBuilder/getPaginationQueryData';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { ILog } from 'types/api/logs/log';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { getOrderByTimestamp, PAGE_SIZE } from './configs';
import { EmptyText, ListContainer, ShowButtonWrapper } from './styles';

interface LogsContextListProps {
	log: ILog;
	order: string;
}

function LogsContextList({ log, order }: LogsContextListProps): JSX.Element {
	const isDarkMode = useIsDarkMode();
	const { currentQuery } = useQueryBuilder();

	const [page, setPage] = useState<number>(1);
	const [logs, setLogs] = useState<ILog[]>([]);

	const currentStagedQueryData = useMemo(() => {
		if (!currentQuery || currentQuery.builder.queryData.length !== 1) return null;

		return currentQuery.builder.queryData[0];
	}, [currentQuery]);

	const getRequestData = useCallback(
		(page: number): Query | null => {
			if (!currentQuery) return null;

			const paginateData = getPaginationQueryData({
				currentStagedQueryData,
				listItemId: log.id,
				orderByTimestamp: getOrderByTimestamp(order),
				pageSize: PAGE_SIZE,
				page,
			});

			const data: Query = {
				...currentQuery,
				builder: {
					...currentQuery.builder,
					queryData: currentQuery.builder.queryData.map((item) => ({
						...item,
						...paginateData,
						pageSize: PAGE_SIZE,
						orderBy: [getOrderByTimestamp(order)],
					})),
				},
			};

			return data;
		},
		[currentStagedQueryData, currentQuery, order, log.id],
	);

	const initialLogsRequest = useMemo(() => getRequestData(1), [getRequestData]);

	const [requestData, setRequestData] = useState<Query | null>(
		initialLogsRequest,
	);

	const { data: logsData, error, isFetching } = useGetExplorerQueryRange(
		requestData,
		PANEL_TYPES.LIST,
		{
			keepPreviousData: true,
		},
	);

	const handleShowNextLines = useCallback(() => {
		const newRequestData = getRequestData(page + 1);

		setPage((prevPage) => prevPage + 1);

		setRequestData(newRequestData);
	}, [page, getRequestData]);

	useEffect(() => {
		const currentData = logsData?.payload.data.newResult.data.result || [];
		if (currentData.length > 0 && currentData[0].list) {
			const currentLogs: ILog[] = currentData[0].list.map((item) => ({
				...item.data,
				timestamp: item.timestamp,
			}));

			setLogs((prevLogs) => [...prevLogs, ...currentLogs]);
		}
	}, [logsData]);

	useEffect(() => {
		const nextRequestData = getRequestData(1);

		setLogs([]);
		setPage(1);
		setRequestData(nextRequestData);
	}, [currentQuery, getRequestData]);

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

				{!error &&
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
