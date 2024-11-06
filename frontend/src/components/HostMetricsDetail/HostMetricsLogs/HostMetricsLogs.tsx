import './HostMetricLogs.styles.scss';

import { Skeleton } from 'antd';
import RawLogView from 'components/Logs/RawLogView';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
// import { TimeRange } from 'components/TimeSelection/TimeSelection';
import { DEFAULT_ENTITY_VERSION } from 'constants/app';
import ShowButton from 'container/LogsContextList/ShowButton';
import { FontSize } from 'container/OptionsMenu/types';
import { ORDERBY_FILTERS } from 'container/QueryBuilder/filters/OrderByFilter/config';
import useDebounce from 'hooks/useDebounce';
import { GetMetricQueryRange } from 'lib/dashboard/getQueryResults';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { Virtuoso } from 'react-virtuoso';
import { ILog } from 'types/api/logs/log';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

import { getHostLogsQueryPayload } from './constants';

interface Props {
	timeRange: {
		startTime: number;
		endTime: number;
	};
	filters: IBuilderQuery['filters'];
}

function HostMetricsLogs({ timeRange, filters }: Props): JSX.Element {
	const [logs, setLogs] = useState<ILog[]>([]);
	// const { initialDataSource, stagedQuery } = useQueryBuilder();
	const [prevOffset, setPrevOffset] = useState<number>(0);
	const [afterOffset, setAfterOffset] = useState<number>(0);
	const debouncedFilters = useDebounce(filters, 800);

	// const listQuery = useMemo(() => {
	//     if (!stagedQuery || stagedQuery.builder.queryData.length < 1) return null;
	//     return stagedQuery.builder.queryData.find((item) => !item.disabled) || null;
	// }, [stagedQuery]);

	// const { options } = useOptionsMenu({
	//     storageKey: LOCALSTORAGE.LOGS_LIST_OPTIONS,
	//     dataSource: initialDataSource || DataSource.LOGS,
	//     aggregateOperator: listQuery?.aggregateOperator || StringOperators.NOOP,
	// });

	const prevQueryPayload = useMemo(() => {
		const basePayload = getHostLogsQueryPayload(
			timeRange.startTime,
			timeRange.endTime,
			debouncedFilters,
		);

		basePayload.query.builder.queryData[0].offset = prevOffset;
		basePayload.query.builder.queryData[0].pageSize = 10;
		basePayload.query.builder.queryData[0].orderBy = [
			{ columnName: 'timestamp', order: ORDERBY_FILTERS.ASC },
		];

		return basePayload;
	}, [timeRange.startTime, timeRange.endTime, debouncedFilters, prevOffset]);

	const afterQueryPayload = useMemo(() => {
		const basePayload = getHostLogsQueryPayload(
			timeRange.startTime,
			timeRange.endTime,
			debouncedFilters,
		);

		basePayload.query.builder.queryData[0].offset = afterOffset;
		basePayload.query.builder.queryData[0].pageSize = 10;
		basePayload.query.builder.queryData[0].orderBy = [
			{ columnName: 'timestamp', order: ORDERBY_FILTERS.DESC },
		];

		return basePayload;
	}, [timeRange.startTime, timeRange.endTime, debouncedFilters, afterOffset]);

	const { data: prevData, isLoading: isPrevLoading } = useQuery({
		queryKey: [
			'hostMetricsLogs-prev',
			prevOffset,
			debouncedFilters,
			timeRange.startTime,
			timeRange.endTime,
		],
		queryFn: () => GetMetricQueryRange(prevQueryPayload, DEFAULT_ENTITY_VERSION),
		enabled: !!prevQueryPayload,
	});

	const { data: afterData, isLoading: isAfterLoading } = useQuery({
		queryKey: [
			'hostMetricsLogs-after',
			afterOffset,
			debouncedFilters,
			timeRange.startTime,
			timeRange.endTime,
		],
		queryFn: () => GetMetricQueryRange(afterQueryPayload, DEFAULT_ENTITY_VERSION),
		enabled: !!afterQueryPayload,
	});

	useEffect(() => {
		if (prevData?.payload?.data?.newResult?.data?.result) {
			const currentData = prevData.payload.data.newResult.data.result;
			if (currentData.length > 0 && currentData[0].list) {
				const currentLogs: ILog[] = currentData[0].list.map((item) => ({
					...item.data,
					timestamp: item.timestamp,
				}));
				setLogs((prev) => [...currentLogs, ...prev]);
			}
		}
	}, [prevData]);

	useEffect(() => {
		if (afterData?.payload?.data?.newResult?.data?.result) {
			const currentData = afterData.payload.data.newResult.data.result;
			if (currentData.length > 0 && currentData[0].list) {
				const currentLogs: ILog[] = currentData[0].list.map((item) => ({
					...item.data,
					timestamp: item.timestamp,
				}));
				setLogs((prev) => [...prev, ...currentLogs]);
			}
		}
	}, [afterData]);

	const getItemContent = useCallback(
		(_: number, logToRender: ILog): JSX.Element => (
			<RawLogView
				isReadOnly
				isTextOverflowEllipsisDisabled
				key={logToRender.id}
				data={logToRender}
				linesPerRow={1}
				fontSize={FontSize.MEDIUM}
			/>
		),
		[],
	);

	const handlePreviousLogsShowNextLine = useCallback(() => {
		setPrevOffset((prev) => prev + 10);
	}, []);

	const handleAfterLogsShowNextLine = useCallback(() => {
		setAfterOffset((prev) => prev + 10);
	}, []);

	if (isPrevLoading && isAfterLoading && logs.length === 0) {
		return <Skeleton active />;
	}

	return (
		<div className="host-metrics-logs">
			<ShowButton
				isLoading={isPrevLoading}
				isDisabled={false}
				order={ORDERBY_FILTERS.ASC}
				onClick={handlePreviousLogsShowNextLine}
			/>
			{isPrevLoading && <Skeleton className="skeleton-container" />}
			<OverlayScrollbar isVirtuoso>
				<Virtuoso
					className="virtuoso-list"
					initialTopMostItemIndex={0}
					data={logs}
					itemContent={getItemContent}
					style={{ height: '400px' }}
				/>
			</OverlayScrollbar>
			{isAfterLoading && <Skeleton className="skeleton-container" />}
			<ShowButton
				isLoading={isAfterLoading}
				isDisabled={false}
				order={ORDERBY_FILTERS.DESC}
				onClick={handleAfterLogsShowNextLine}
			/>
		</div>
	);
}

export default HostMetricsLogs;
