/* eslint-disable no-nested-ternary */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useQuery } from 'react-query';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { Card } from 'antd';
import LogDetail from 'components/LogDetail';
import RawLogView from 'components/Logs/RawLogView';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import { DEFAULT_ENTITY_VERSION } from 'constants/app';
import LogsError from 'container/LogsError/LogsError';
import { LogsLoading } from 'container/LogsLoading/LogsLoading';
import { FontSize } from 'container/OptionsMenu/types';
import { useHandleLogsPagination } from 'hooks/infraMonitoring/useHandleLogsPagination';
import useLogDetailHandlers from 'hooks/logs/useLogDetailHandlers';
import useScrollToLog from 'hooks/logs/useScrollToLog';
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
	const {
		activeLog,
		onAddToQuery,
		selectedTab,
		handleSetActiveLog,
		handleCloseLogDetail,
	} = useLogDetailHandlers();

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

	const handleScrollToLog = useScrollToLog({
		logs,
		virtuosoRef,
	});

	const getItemContent = useCallback(
		(_: number, logToRender: ILog): JSX.Element => {
			return (
				<div key={logToRender.id}>
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
		[activeLog, handleSetActiveLog, handleCloseLogDetail],
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
