import './LogsContextList.styles.scss';

import RawLogView from 'components/Logs/RawLogView';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import Spinner from 'components/Spinner';
import { DEFAULT_ENTITY_VERSION } from 'constants/app';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { FontSize } from 'container/OptionsMenu/types';
import { ORDERBY_FILTERS } from 'container/QueryBuilder/filters/OrderByFilter/config';
import { useGetExplorerQueryRange } from 'hooks/queryBuilder/useGetExplorerQueryRange';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { SuccessResponse } from 'types/api';
import { ILog } from 'types/api/logs/log';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { Query, TagFilter } from 'types/api/queryBuilder/queryBuilderData';

import {
	getOrderByTimestamp,
	INITIAL_PAGE_SIZE,
	LOGS_MORE_PAGE_SIZE,
} from './configs';
import ShowButton from './ShowButton';
import { EmptyText, ListContainer } from './styles';
import { getRequestData } from './utils';

interface LogsContextListProps {
	className?: string;
	isEdit: boolean;
	query: Query;
	log: ILog;
	order: string;
	filters: TagFilter | null;
}

function LogsContextList({
	className,
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

	const logsMorePageSize = useMemo(() => (page - 1) * LOGS_MORE_PAGE_SIZE, [
		page,
	]);
	const pageSize = useMemo(
		() => (page <= 1 ? INITIAL_PAGE_SIZE : logsMorePageSize + INITIAL_PAGE_SIZE),
		[page, logsMorePageSize],
	);
	const isDisabledFetch = useMemo(() => logs.length < pageSize, [
		logs.length,
		pageSize,
	]);

	const currentStagedQueryData = useMemo(() => {
		if (!query || query.builder.queryData.length !== 1) return null;

		return query.builder.queryData[0];
	}, [query]);

	const initialLogsRequest = useMemo(
		() =>
			getRequestData({
				stagedQueryData: currentStagedQueryData,
				query,
				log,
				orderByTimestamp,
				page,
			}),
		[currentStagedQueryData, page, log, query, orderByTimestamp],
	);

	const [requestData, setRequestData] = useState<Query | null>(
		initialLogsRequest,
	);

	const handleSuccess = useCallback(
		(data: SuccessResponse<MetricRangePayloadProps, unknown>) => {
			const currentData = data?.payload?.data?.newResult?.data?.result || [];

			if (currentData.length > 0 && currentData[0].list) {
				const currentLogs: ILog[] = currentData[0].list.map((item) => ({
					...item.data,
					timestamp: item.timestamp,
				}));

				if (order === ORDERBY_FILTERS.ASC) {
					const reversedCurrentLogs = currentLogs.reverse();
					setLogs((prevLogs) => [...reversedCurrentLogs, ...prevLogs]);
				} else {
					setLogs((prevLogs) => [...prevLogs, ...currentLogs]);
				}
			}
		},
		[order],
	);

	const { isError, isFetching } = useGetExplorerQueryRange(
		requestData,
		PANEL_TYPES.LIST,
		DEFAULT_ENTITY_VERSION,
		{
			keepPreviousData: true,
			enabled: !!requestData,
			onSuccess: handleSuccess,
		},
	);

	const handleShowNextLines = useCallback(() => {
		if (isDisabledFetch) return;

		const log = order === ORDERBY_FILTERS.ASC ? firstLog : lastLog;

		const newRequestData = getRequestData({
			stagedQueryData: currentStagedQueryData,
			query,
			log,
			orderByTimestamp,
			page: page + 1,
			pageSize: LOGS_MORE_PAGE_SIZE,
		});

		setPage((prevPage) => prevPage + 1);
		setRequestData(newRequestData);
	}, [
		query,
		firstLog,
		lastLog,
		page,
		order,
		currentStagedQueryData,
		isDisabledFetch,
		orderByTimestamp,
	]);

	useEffect(() => {
		if (!isEdit) return;

		const newRequestData = getRequestData({
			stagedQueryData: currentStagedQueryData,
			query,
			log,
			orderByTimestamp,
			page: 1,
		});

		setPage(1);
		setLogs([]);
		setRequestData(newRequestData);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filters]);

	const getItemContent = useCallback(
		(_: number, log: ILog): JSX.Element => (
			<RawLogView
				isReadOnly
				isTextOverflowEllipsisDisabled
				key={log.id}
				data={log}
				linesPerRow={1}
				fontSize={FontSize.SMALL}
			/>
		),
		[],
	);

	return (
		<div className={`context-logs-list ${className}`}>
			{order === ORDERBY_FILTERS.ASC && (
				<ShowButton
					isLoading={isFetching}
					isDisabled={isDisabledFetch}
					order={order}
					onClick={handleShowNextLines}
				/>
			)}

			<ListContainer $isDarkMode={isDarkMode}>
				{((!logs.length && !isFetching) || isError) && (
					<EmptyText>No Data</EmptyText>
				)}
				{isFetching && <Spinner size="large" height="10rem" />}
				<OverlayScrollbar isVirtuoso>
					<Virtuoso
						className="virtuoso-list"
						initialTopMostItemIndex={0}
						data={logs}
						itemContent={getItemContent}
						followOutput={order === ORDERBY_FILTERS.DESC}
					/>
				</OverlayScrollbar>
			</ListContainer>

			{order === ORDERBY_FILTERS.DESC && (
				<ShowButton
					isLoading={isFetching}
					isDisabled={isDisabledFetch}
					order={order}
					onClick={handleShowNextLines}
				/>
			)}
		</div>
	);
}

LogsContextList.defaultProps = {
	className: '',
};

export default memo(LogsContextList);
