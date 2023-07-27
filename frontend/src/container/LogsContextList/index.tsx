import { Button, Typography } from 'antd';
import RawLogView from 'components/Logs/RawLogView';
import Spinner from 'components/Spinner';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { FILTERS } from 'container/QueryBuilder/filters/OrderByFilter/config';
import { useGetExplorerQueryRange } from 'hooks/queryBuilder/useGetExplorerQueryRange';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { getPaginationQueryData } from 'lib/newQueryBuilder/getPaginationQueryData';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { ILog } from 'types/api/logs/log';
import { Query, TagFilter } from 'types/api/queryBuilder/queryBuilderData';

import {
	getOrderByTimestamp,
	INITIAL_PAGE_SIZE,
	LOGS_MORE_PAGE_SIZE,
} from './configs';
import { EmptyText, ListContainer, ShowButtonWrapper } from './styles';

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

	const firstLog = useMemo(() => logs[0], [logs]);
	const lastLog = useMemo(() => logs[logs.length - 1], [logs]);
	const orderByTimestamp = useMemo(() => getOrderByTimestamp(order), [order]);

	const currentStagedQueryData = useMemo(() => {
		if (!query || query.builder.queryData.length !== 1) return null;

		return query.builder.queryData[0];
	}, [query]);

	const getRequestData = useCallback(
		(
			query: Query | null,
			page: number,
			log: ILog,
			pageSize: number = INITIAL_PAGE_SIZE,
		): Query | null => {
			if (!query) return null;

			const paginateData = getPaginationQueryData({
				currentStagedQueryData,
				listItemId: log ? log.id : null,
				orderByTimestamp,
				page,
				pageSize,
			});

			const data: Query = {
				...query,
				builder: {
					...query.builder,
					queryData: query.builder.queryData.map((item) => ({
						...item,
						...paginateData,
						pageSize,
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
		const logsMorePageSize = (page - 1) * LOGS_MORE_PAGE_SIZE;
		const pageSize =
			page <= 1 ? INITIAL_PAGE_SIZE : logsMorePageSize + INITIAL_PAGE_SIZE;

		if (logs.length < pageSize) return;

		const log = order === FILTERS.ASC ? firstLog : lastLog;

		const newRequestData = getRequestData(
			query,
			page + 1,
			log,
			LOGS_MORE_PAGE_SIZE,
		);

		setPage((prevPage) => prevPage + 1);
		setRequestData(newRequestData);
	}, [query, logs, firstLog, lastLog, page, order, getRequestData]);

	useEffect(() => {
		const currentData = logsData?.payload.data.newResult.data.result || [];

		if (currentData.length > 0 && currentData[0].list) {
			const currentLogs: ILog[] = currentData[0].list.map((item) => ({
				...item.data,
				timestamp: item.timestamp,
			}));

			if (order === FILTERS.ASC) {
				const reversedCurrentLogs = currentLogs.reverse();
				setLogs((prevLogs) => [...reversedCurrentLogs, ...prevLogs]);
			} else {
				setLogs((prevLogs) => [...prevLogs, ...currentLogs]);
			}
		}
	}, [logsData, order]);

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

	const tableParams = useMemo(() => {
		if (order !== FILTERS.DESC) return null;
		return { followOutput: true };
	}, [order]);

	const getItemContent = useCallback(
		(_: number, log: ILog): JSX.Element => (
			<RawLogView isReadOnly key={log.id} data={log} linesPerRow={1} />
		),
		[],
	);

	return (
		<>
			{order === FILTERS.ASC && renderedShowButton}

			<ListContainer $isDarkMode={isDarkMode}>
				{((!logs.length && !isFetching) || isError) && (
					<EmptyText>No Data</EmptyText>
				)}
				{isFetching && <Spinner size="large" height="10rem" />}

				<Virtuoso
					initialTopMostItemIndex={0}
					data={logs}
					itemContent={getItemContent}
					// eslint-disable-next-line react/jsx-props-no-spreading
					{...tableParams}
				/>
			</ListContainer>

			{order === FILTERS.DESC && renderedShowButton}
		</>
	);
}

export default memo(LogsContextList);
