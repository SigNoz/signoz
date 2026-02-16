/* eslint-disable no-nested-ternary */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from 'react-query';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { Card } from 'antd';
import LogDetail from 'components/LogDetail';
import { VIEW_TYPES } from 'components/LogDetail/constants';
import RawLogView from 'components/Logs/RawLogView';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import { DEFAULT_ENTITY_VERSION } from 'constants/app';
import LogsError from 'container/LogsError/LogsError';
import { LogsLoading } from 'container/LogsLoading/LogsLoading';
import { FontSize } from 'container/OptionsMenu/types';
import { useHandleLogsPagination } from 'hooks/infraMonitoring/useHandleLogsPagination';
import { useActiveLog } from 'hooks/logs/useActiveLog';
import { GetMetricQueryRange } from 'lib/dashboard/getQueryResults';
import { ILog } from 'types/api/logs/log';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

import { getHostLogsQueryPayload } from './constants';
import NoLogsContainer from './NoLogsContainer';

import './HostMetricLogs.styles.scss';

interface Props {
	timeRange: {
		startTime: number;
		endTime: number;
	};
	filters: IBuilderQuery['filters'];
}

function HostMetricsLogs({ timeRange, filters }: Props): JSX.Element {
	const virtuosoRef = useRef<VirtuosoHandle>(null);
	const logRefsMap = useRef<Map<string, HTMLElement>>(new Map());
	const {
		activeLog,
		onSetActiveLog,
		onClearActiveLog,
		onAddToQuery,
	} = useActiveLog();
	const [selectedTab, setSelectedTab] = useState<
		typeof VIEW_TYPES[keyof typeof VIEW_TYPES] | undefined
	>();

	const basePayload = getHostLogsQueryPayload(
		timeRange.startTime,
		timeRange.endTime,
		filters,
	);
	const {
		logs,
		hasReachedEndOfLogs,
		isPaginating,
		currentPage,
		setIsPaginating,
		handleNewData,
		loadMoreLogs,
		queryPayload,
	} = useHandleLogsPagination({
		timeRange,
		filters,
		excludeFilterKeys: ['host.name'],
		basePayload,
	});

	const { data, isLoading, isFetching, isError } = useQuery({
		queryKey: [
			'hostMetricsLogs',
			timeRange.startTime,
			timeRange.endTime,
			filters,
			currentPage,
		],
		queryFn: () => GetMetricQueryRange(queryPayload, DEFAULT_ENTITY_VERSION),
		enabled: !!queryPayload,
		keepPreviousData: isPaginating,
	});

	useEffect(() => {
		if (data?.payload?.data?.newResult?.data?.result) {
			handleNewData(data.payload.data.newResult.data.result);
		}
	}, [data, handleNewData]);

	useEffect(() => {
		setIsPaginating(false);
	}, [data, setIsPaginating]);

	// Clean up stale refs when logs change
	useEffect(() => {
		const logIds = new Set(logs.map((log) => log.id));
		const refsToDelete: string[] = [];

		logRefsMap.current.forEach((_, logId) => {
			if (!logIds.has(logId)) {
				refsToDelete.push(logId);
			}
		});

		refsToDelete.forEach((logId) => {
			logRefsMap.current.delete(logId);
		});
	}, [logs]);

	const handleSetActiveLog = useCallback(
		(
			log: ILog,
			selectedTab: typeof VIEW_TYPES[keyof typeof VIEW_TYPES] = VIEW_TYPES.OVERVIEW,
		) => {
			if (activeLog?.id === log.id) {
				onClearActiveLog();
				setSelectedTab(undefined);
				return;
			}
			onSetActiveLog(log);
			setSelectedTab(selectedTab);
		},
		[activeLog?.id, onClearActiveLog, onSetActiveLog],
	);

	const handleCloseLogDetail = useCallback((): void => {
		onClearActiveLog();
		setSelectedTab(undefined);
	}, [onClearActiveLog]);

	const handleScrollToLog = useCallback(
		(logId: string): void => {
			const logIndex = logs.findIndex(({ id }) => id === logId);
			if (logIndex !== -1 && virtuosoRef.current) {
				virtuosoRef.current.scrollToIndex({
					index: logIndex,
					align: 'center',
					behavior: 'smooth',
				});
				return;
			}

			const logElement = logRefsMap.current.get(logId);
			if (logElement) {
				logElement.scrollIntoView({
					behavior: 'smooth',
					block: 'nearest',
				});
				return;
			}

			// If element is not in viewport, wait a bit for virtualization to render it
			setTimeout(() => {
				const element = logRefsMap.current.get(logId);
				if (element) {
					element.scrollIntoView({
						behavior: 'smooth',
						block: 'nearest',
					});
				}
			}, 100);
		},
		[logs],
	);

	const getItemContent = useCallback(
		(_: number, logToRender: ILog): JSX.Element => {
			const getItemRef = (element: HTMLElement | null): void => {
				if (element) {
					logRefsMap.current.set(logToRender.id, element);
				}
			};

			return (
				<div key={logToRender.id} ref={getItemRef}>
					<RawLogView
						isTextOverflowEllipsisDisabled
						data={logToRender}
						linesPerRow={5}
						fontSize={FontSize.MEDIUM}
						selectedFields={[
							{
								dataType: 'string',
								type: '',
								name: 'body',
							},
							{
								dataType: 'string',
								type: '',
								name: 'timestamp',
							},
						]}
						onSetActiveLog={handleSetActiveLog}
						onClearActiveLog={handleCloseLogDetail}
						isActiveLog={activeLog?.id === logToRender.id}
					/>
				</div>
			);
		},
		[activeLog, handleSetActiveLog, handleCloseLogDetail, logRefsMap],
	);

	const renderFooter = useCallback(
		(): JSX.Element | null => (
			// eslint-disable-next-line react/jsx-no-useless-fragment
			<>
				{isFetching ? (
					<div className="logs-loading-skeleton"> Loading more logs ... </div>
				) : hasReachedEndOfLogs ? (
					<div className="logs-loading-skeleton"> *** End *** </div>
				) : null}
			</>
		),
		[isFetching, hasReachedEndOfLogs],
	);

	const renderContent = useMemo(
		() => (
			<Card bordered={false} className="host-metrics-logs-list-card">
				<OverlayScrollbar isVirtuoso>
					<Virtuoso
						className="host-metrics-logs-virtuoso"
						key="host-metrics-logs-virtuoso"
						ref={virtuosoRef}
						data={logs}
						endReached={loadMoreLogs}
						totalCount={logs.length}
						itemContent={getItemContent}
						overscan={200}
						components={{
							Footer: renderFooter,
						}}
					/>
				</OverlayScrollbar>
			</Card>
		),
		[logs, loadMoreLogs, getItemContent, renderFooter],
	);

	return (
		<div className="host-metrics-logs">
			{isLoading && <LogsLoading />}
			{!isLoading && !isError && logs.length === 0 && <NoLogsContainer />}
			{isError && !isLoading && <LogsError />}
			{!isLoading && !isError && logs.length > 0 && (
				<div
					className="host-metrics-logs-list-container"
					data-log-detail-ignore="true"
				>
					{renderContent}
				</div>
			)}
			{selectedTab && activeLog && (
				<LogDetail
					log={activeLog}
					onClose={handleCloseLogDetail}
					logs={logs}
					onNavigateLog={handleSetActiveLog}
					selectedTab={selectedTab}
					onAddToQuery={onAddToQuery}
					onClickActionItem={onAddToQuery}
					onScrollToLog={handleScrollToLog}
				/>
			)}
		</div>
	);
}

export default HostMetricsLogs;
