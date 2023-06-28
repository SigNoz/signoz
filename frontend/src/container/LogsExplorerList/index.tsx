import { Card, Typography } from 'antd';
// components
import ListLogView from 'components/Logs/ListLogView';
import RawLogView from 'components/Logs/RawLogView';
import LogsTableView from 'components/Logs/TableView';
import Spinner from 'components/Spinner';
import { PAGE_SIZE } from 'constants/queryBuilderQueryNames';
import { LogViewMode } from 'container/LogsTable';
import { Container, Heading } from 'container/LogsTable/styles';
import { contentStyle } from 'container/Trace/Search/config';
import { useGetExplorerQueryRange } from 'hooks/queryBuilder/useGetExplorerQueryRange';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import useFontFaceObserver from 'hooks/useFontObserver';
import useUrlQuery from 'hooks/useUrlQuery';
import { getPaginationQueryData } from 'lib/newQueryBuilder/getPaginationQueryData';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Virtuoso } from 'react-virtuoso';
// interfaces
import { ILog } from 'types/api/logs/log';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

function Footer(): JSX.Element {
	return <Spinner height={20} tip="Getting Logs" />;
}

function LogsExplorerList(): JSX.Element {
	const urlQuery = useUrlQuery();
	const { stagedQuery, isQueryStaged, handleSetQueryData } = useQueryBuilder();
	const [currentLog, setCurrentLog] = useState<ILog | null>(null);
	const [viewMode] = useState<LogViewMode>('raw');

	const [linesPerRow] = useState<number>(20);
	const [page, setPage] = useState<number>(1);
	const [logs, setLogs] = useState<ILog[]>([]);

	const pageSizeParam = urlQuery.get(PAGE_SIZE);
	const pageSize = pageSizeParam ? JSON.parse(pageSizeParam) : 25;

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
			listItemId: currentLog ? currentLog.id : null,
			isTimeStampPresent,
			page,
			pageSize,
		});
	}, [stagedQuery, currentLog, isTimeStampPresent, page, pageSize]);

	const requestData: Query | null = useMemo(() => {
		if (!stagedQuery || !paginationQueryData) return null;

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
	}, [stagedQuery, paginationQueryData, pageSize]);

	const isLimit: boolean = useMemo(() => {
		if (!paginationQueryData) return false;

		const limit = paginationQueryData.limit || 100;
		const offset = paginationQueryData.offset || 1;

		return offset >= limit;
	}, [paginationQueryData]);

	useGetExplorerQueryRange(requestData, {
		onSuccess: (data) => {
			const currentData = data.payload.data.newResult.data.result;

			if (currentData.length > 0 && currentData[0].list) {
				const logs: ILog[] = currentData[0].list.map((item) => ({
					timestamp: +item.timestamp,
					...item.data,
				}));

				setLogs((prevLogs) => [...prevLogs, ...logs]);
			}
		},
		enabled: !isLimit,
	});

	const handleResetPagination = useCallback(() => {
		setPage(1);
		setCurrentLog(null);
		setLogs([]);
	}, []);

	useFontFaceObserver(
		[
			{
				family: 'Fira Code',
				weight: '300',
			},
		],
		viewMode === 'raw',
		{
			timeout: 5000,
		},
	);

	const handleEndReached = useCallback(
		(index: number) => {
			const lastLog = logs[index];
			if (isLimit) return;

			if (isTimeStampPresent) {
				setCurrentLog((prevLog) =>
					prevLog?.id === lastLog.id ? prevLog : lastLog,
				);
			}

			setPage((prevPage) => prevPage + 1);
		},
		[logs, isLimit, isTimeStampPresent],
	);

	const getItemContent = useCallback(
		(_: number, log: ILog): JSX.Element => {
			if (viewMode === 'raw') {
				return (
					<RawLogView
						key={log.id}
						data={log}
						linesPerRow={linesPerRow}
						// TODO: write new onClickExpanded logic
						onClickExpand={(): void => {}}
					/>
				);
			}

			return <ListLogView key={log.id} logData={log} />;
		},
		[linesPerRow, viewMode],
	);

	const renderContent = useMemo(() => {
		if (viewMode === 'table') {
			return (
				<LogsTableView
					logs={logs}
					// TODO: write new selected logic
					fields={[]}
					linesPerRow={linesPerRow}
					// TODO: write new onClickExpanded logic
					onClickExpand={(): void => {}}
				/>
			);
		}

		const components = isLimit
			? {}
			: {
					Footer,
			  };

		return (
			<Card bodyStyle={contentStyle}>
				<Virtuoso
					useWindowScroll
					data={logs}
					endReached={handleEndReached}
					totalCount={logs.length}
					itemContent={getItemContent}
					components={components}
				/>
			</Card>
		);
	}, [viewMode, logs, handleEndReached, getItemContent, isLimit, linesPerRow]);

	useEffect(() => {
		if (isQueryStaged) {
			handleResetPagination();
		}
	}, [isQueryStaged, handleResetPagination]);

	useEffect(() => {
		if (!requestData) return;
		const {
			offset,
			pageSize,
			...restQueryData
		} = requestData.builder.queryData[0];
		handleSetQueryData(0, restQueryData);
	}, [requestData, handleSetQueryData]);

	return (
		<Container>
			{viewMode !== 'table' && (
				<Heading>
					<Typography.Text>Event</Typography.Text>
				</Heading>
			)}

			{logs.length === 0 && <Typography>No logs lines found</Typography>}

			{renderContent}
		</Container>
	);
}

export default memo(LogsExplorerList);
