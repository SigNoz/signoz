import { Card, Typography } from 'antd';
// components
import ListLogView from 'components/Logs/ListLogView';
import RawLogView from 'components/Logs/RawLogView';
import Spinner from 'components/Spinner';
import { queryParamNamesMap } from 'constants/queryBuilderQueryNames';
import { ITEMS_PER_PAGE_OPTIONS } from 'container/Controls/config';
import ExplorerControlPanel from 'container/ExplorerControlPanel';
import { Container, Heading } from 'container/LogsTable/styles';
import { useOptionsMenu } from 'container/OptionsMenu';
import { contentStyle } from 'container/Trace/Search/config';
import { useGetExplorerQueryRange } from 'hooks/queryBuilder/useGetExplorerQueryRange';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import useFontFaceObserver from 'hooks/useFontObserver';
import useUrlQueryData from 'hooks/useUrlQueryData';
import { getPaginationQueryData } from 'lib/newQueryBuilder/getPaginationQueryData';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Virtuoso } from 'react-virtuoso';
// interfaces
import { ILog } from 'types/api/logs/log';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource, StringOperators } from 'types/common/queryBuilder';

import InfinityTableView from './InfinityTableView';
import { InfinityWrapperStyled } from './styles';

function Footer(): JSX.Element {
	return <Spinner height={20} tip="Getting Logs" />;
}

function LogsExplorerList(): JSX.Element {
	const { queryData: pageSize } = useUrlQueryData(
		queryParamNamesMap.pageSize,
		ITEMS_PER_PAGE_OPTIONS[0],
	);
	const {
		stagedQuery,
		isQueryStaged,
		handleSetQueryData,
		initialDataSource,
	} = useQueryBuilder();
	const [currentLog, setCurrentLog] = useState<ILog | null>(null);

	const [page, setPage] = useState<number>(1);
	const [logs, setLogs] = useState<ILog[]>([]);

	const currentStagedQueryData = useMemo(() => {
		if (!stagedQuery || stagedQuery.builder.queryData.length !== 1) return null;

		return stagedQuery.builder.queryData[0];
	}, [stagedQuery]);

	const { options, config } = useOptionsMenu({
		dataSource: initialDataSource || DataSource.METRICS,
		aggregateOperator:
			currentStagedQueryData?.aggregateOperator || StringOperators.NOOP,
	});

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

	const { isLoading } = useGetExplorerQueryRange(requestData, {
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
		options.format === 'raw',
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
			if (options.format === 'raw') {
				return (
					<RawLogView
						key={log.id}
						data={log}
						linesPerRow={options.maxLines}
						// TODO: write new onClickExpanded logic
						onClickExpand={(): void => {}}
					/>
				);
			}

			return <ListLogView key={log.id} logData={log} />;
		},
		[options],
	);

	const renderContent = useMemo(() => {
		const components = isLimit
			? {}
			: {
					Footer,
			  };

		if (options.format === 'table') {
			return (
				<InfinityTableView
					tableViewProps={{
						logs,
						fields: options.selectColumns.map((item) => ({
							dataType: item.dataType as string,
							name: item.key,
							type: item.type as string,
						})),
						linesPerRow: options.maxLines,
						onClickExpand: (): void => {},
					}}
					infitiyTableProps={{ onEndReached: handleEndReached }}
				/>
			);
		}

		return (
			<Card style={{ width: '100%' }} bodyStyle={{ ...contentStyle }}>
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
	}, [
		isLimit,
		options.format,
		options.selectColumns,
		options.maxLines,
		logs,
		handleEndReached,
		getItemContent,
	]);

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
			<ExplorerControlPanel
				isLoading={isLoading}
				isShowPageSize
				optionsMenuConfig={config}
			/>
			{options.format !== 'table' && (
				<Heading>
					<Typography.Text>Event</Typography.Text>
				</Heading>
			)}
			{logs.length === 0 && <Typography>No logs lines found</Typography>}
			<InfinityWrapperStyled>{renderContent}</InfinityWrapperStyled>
		</Container>
	);
}

export default memo(LogsExplorerList);
