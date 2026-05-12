import { useCallback, useMemo, useRef } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { Card } from 'antd';
import logEvent from 'api/common/logEvent';
import LogDetail from 'components/LogDetail';
import RawLogView from 'components/Logs/RawLogView';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import {
	QuerySearchV2Provider,
	useQuerySearchV2Context,
} from 'components/QueryBuilderV2';
import QuerySearch from 'components/QueryBuilderV2/QueryV2/QuerySearch/QuerySearch';
import {
	combineInitialAndUserExpression,
	getUserExpressionFromCombined,
} from 'components/QueryBuilderV2/QueryV2/QuerySearch/utils';
import { InfraMonitoringEvents } from 'constants/events';
import { InfraMonitoringEntity } from 'container/InfraMonitoringK8s/constants';
import { LogsLoading } from 'container/LogsLoading/LogsLoading';
import { FontSize } from 'container/OptionsMenu/types';
import RunQueryBtn from 'container/QueryBuilder/components/RunQueryBtn/RunQueryBtn';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import {
	CustomTimeType,
	Time,
} from 'container/TopNav/DateTimeSelectionV2/types';
import { getOldLogsOperatorFromNew } from 'hooks/logs/useActiveLog';
import useLogDetailHandlers from 'hooks/logs/useLogDetailHandlers';
import useScrollToLog from 'hooks/logs/useScrollToLog';
import { generateFilterQuery } from 'lib/logs/generateFilterQuery';
import { ILog } from 'types/api/logs/log';
import { DataSource } from 'types/common/queryBuilder';
import { validateQuery } from 'utils/queryValidationUtils';

import EntityEmptyState from '../EntityEmptyState/EntityEmptyState';
import EntityError from '../EntityError/EntityError';
import { K8S_ENTITY_LOGS_EXPRESSION_KEY, useInfiniteEntityLogs } from './hooks';
import { getEntityLogsQueryPayload } from './utils';

import styles from './EntityLogs.module.scss';

interface Props {
	timeRange: {
		startTime: number;
		endTime: number;
	};
	isModalTimeSelection: boolean;
	handleTimeChange: (
		interval: Time | CustomTimeType,
		dateTimeRange?: [number, number],
	) => void;
	selectedInterval: Time;
	queryKey: string;
	category: InfraMonitoringEntity;
	initialExpression: string;
}

function EntityLogsContent({
	timeRange,
	isModalTimeSelection,
	handleTimeChange,
	selectedInterval,
	queryKey,
	category,
}: Omit<Props, 'initialExpression'>): JSX.Element {
	const virtuosoRef = useRef<VirtuosoHandle>(null);

	const { expression, userExpression, initialExpression, querySearchProps } =
		useQuerySearchV2Context();

	const { activeLog, selectedTab, handleSetActiveLog, handleCloseLogDetail } =
		useLogDetailHandlers();

	const onAddToQuery = useCallback(
		(fieldKey: string, fieldValue: string, operator: string): void => {
			handleCloseLogDetail();

			const partExpression = generateFilterQuery({
				fieldKey,
				fieldValue,
				type: getOldLogsOperatorFromNew(operator),
			});

			const currentUser = userExpression;
			const newUser = currentUser.trim()
				? `${currentUser} AND ${partExpression}`
				: partExpression;

			querySearchProps.onRun(newUser);
		},
		[userExpression, querySearchProps, handleCloseLogDetail],
	);

	const {
		logs,
		loadMoreLogs,
		hasNextPage,
		isFetchingNextPage,
		isLoading,
		isFetching,
		isError,
		refetch,
		cancel,
	} = useInfiniteEntityLogs({
		queryKey,
		timeRange,
		expression,
	});

	const handleRunQuery = useCallback(
		(updatedExpression?: string): void => {
			const newUserExpression = updatedExpression
				? getUserExpressionFromCombined(initialExpression, updatedExpression)
				: userExpression;
			const validation = validateQuery(
				initialExpression
					? combineInitialAndUserExpression(initialExpression, newUserExpression)
					: newUserExpression || '',
			);

			if (validation.isValid) {
				querySearchProps.onRun(newUserExpression);

				logEvent(InfraMonitoringEvents.FilterApplied, {
					entity: InfraMonitoringEvents.K8sEntity,
					page: InfraMonitoringEvents.DetailedPage,
					category,
					view: InfraMonitoringEvents.LogsView,
				});

				refetch();
			}
		},
		[userExpression, initialExpression, refetch, querySearchProps, category],
	);

	const queryData = useMemo(
		() =>
			getEntityLogsQueryPayload({
				start: timeRange.startTime,
				end: timeRange.endTime,
				expression: userExpression,
			}).queryData,
		[timeRange.startTime, timeRange.endTime, userExpression],
	);

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
			<>
				{isFetchingNextPage ? (
					<div className={styles.logsLoadingSkeleton}> Loading more logs ... </div>
				) : !hasNextPage && logs.length > 0 ? (
					<div className={styles.logsLoadingSkeleton}> *** End *** </div>
				) : null}
			</>
		),
		[isFetchingNextPage, hasNextPage, logs.length],
	);

	const renderContent = useMemo(
		() => (
			<Card bordered={false} className={styles.listCard}>
				<OverlayScrollbar isVirtuoso>
					<Virtuoso
						key="entity-logs-virtuoso"
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

	const showInitialLoading = isLoading || (isFetching && logs.length === 0);

	const isDataEmpty = !showInitialLoading && !isError && logs.length === 0;
	const hasAdditionalFilters = !!userExpression?.trim();

	return (
		<div className={styles.container}>
			<div className={styles.filterContainer}>
				<div className={styles.filterContainerTime}>
					<DateTimeSelectionV2
						showAutoRefresh
						showRefreshText={false}
						hideShareModal
						isModalTimeSelection={isModalTimeSelection}
						onTimeChange={handleTimeChange}
						defaultRelativeTime="5m"
						modalSelectedInterval={selectedInterval}
						modalInitialStartTime={timeRange.startTime * 1000}
						modalInitialEndTime={timeRange.endTime * 1000}
					/>

					<RunQueryBtn
						isLoadingQueries={isFetching}
						onStageRunQuery={(): void => handleRunQuery()}
						handleCancelQuery={cancel}
					/>
				</div>

				<div className={styles.filterQuerySearch}>
					<QuerySearch
						onChange={querySearchProps.onChange}
						queryData={queryData}
						dataSource={DataSource.LOGS}
						onRun={handleRunQuery}
						initialExpression={querySearchProps.initialExpression}
					/>
				</div>
			</div>
			<div className={styles.logs}>
				{showInitialLoading && <LogsLoading />}
				{isDataEmpty && <EntityEmptyState hasFilters={hasAdditionalFilters} />}
				{isError && !showInitialLoading && <EntityError />}
				{!showInitialLoading && !isError && logs.length > 0 && (
					<div className={styles.listContainer} data-log-detail-ignore="true">
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
		</div>
	);
}

function EntityLogs({ initialExpression, ...rest }: Props): JSX.Element {
	return (
		<QuerySearchV2Provider
			queryParamKey={K8S_ENTITY_LOGS_EXPRESSION_KEY}
			initialExpression={initialExpression}
			persistOnUnmount
		>
			<EntityLogsContent {...rest} />
		</QuerySearchV2Provider>
	);
}

export default EntityLogs;
