import React, { useCallback, useMemo, useRef } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { Card } from 'antd';
import logEvent from 'api/common/logEvent';
import LogDetail from 'components/LogDetail';
import RawLogView from 'components/Logs/RawLogView';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import {
	QuerySearchV2Provider,
	useExpression,
	useInitialExpression,
	useInputExpression,
	useQuerySearchInitialExpressionProp,
	useQuerySearchOnChange,
	useQuerySearchOnRun,
	useUserExpression,
} from 'components/QueryBuilderV2';
import QuerySearch from 'components/QueryBuilderV2/QueryV2/QuerySearch/QuerySearch';
import {
	combineInitialAndUserExpression,
	getUserExpressionFromCombined,
} from 'components/QueryBuilderV2/QueryV2/QuerySearch/utils';
import { InfraMonitoringEvents } from 'constants/events';
import { InfraMonitoringEntity } from 'container/InfraMonitoringK8sV2/constants';
import { LogsLoading } from 'container/LogsLoading/LogsLoading';
import { FontSize } from 'container/OptionsMenu/types';
import RunQueryBtn from 'container/QueryBuilder/components/RunQueryBtn/RunQueryBtn';
import { getOldLogsOperatorFromNew } from 'hooks/logs/useActiveLog';
import useLogDetailHandlers from 'hooks/logs/useLogDetailHandlers';
import useScrollToLog from 'hooks/logs/useScrollToLog';
import { generateFilterQuery } from 'lib/logs/generateFilterQuery';
import { ILog } from 'types/api/logs/log';
import { DataSource } from 'types/common/queryBuilder';
import { validateQuery } from 'utils/queryValidationUtils';

import EntityDateTimeSelector from '../EntityDateTimeSelector/EntityDateTimeSelector';
import { useEntityDetailsTime } from '../EntityDateTimeSelector/useEntityDetailsTime';
import EntityEmptyState from '../EntityEmptyState/EntityEmptyState';
import EntityError from '../EntityError/EntityError';
import { isKeyNotFoundError } from '../utils';
import { K8S_ENTITY_LOGS_EXPRESSION_KEY, useInfiniteEntityLogs } from './hooks';
import { getEntityLogsQueryPayload } from './utils';

import styles from './EntityLogs.module.scss';
import { QueryParams } from 'constants/query';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import createQueryParams from 'lib/createQueryParams';
import { isModifierKeyPressed } from 'utils/app';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

interface Props {
	eventEntity: string;
	queryKey: string;
	category: InfraMonitoringEntity;
	initialExpression: string;
}

function EntityLogsContent({
	eventEntity,
	queryKey,
	category,
}: Omit<Props, 'initialExpression'>): JSX.Element {
	const { timeRange } = useEntityDetailsTime();
	const virtuosoRef = useRef<VirtuosoHandle>(null);
	const logDetailContainerRef = useRef<HTMLDivElement>(null);

	const { safeNavigate } = useSafeNavigate();

	const expression = useExpression();
	const inputExpression = useInputExpression();
	const userExpression = useUserExpression();
	const initialExpression = useInitialExpression();
	const querySearchOnChange = useQuerySearchOnChange();
	const querySearchOnRun = useQuerySearchOnRun();
	const querySearchInitialExpressionProp = useQuerySearchInitialExpressionProp();

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

			querySearchOnRun(newUser);
		},
		[userExpression, querySearchOnRun, handleCloseLogDetail],
	);

	const {
		logs,
		loadMoreLogs,
		hasNextPage,
		isFetchingNextPage,
		isLoading,
		isFetching,
		isError,
		error,
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
				: inputExpression;
			const validation = validateQuery(
				initialExpression
					? combineInitialAndUserExpression(initialExpression, newUserExpression)
					: newUserExpression || '',
			);

			if (validation.isValid) {
				querySearchOnRun(newUserExpression);

				void logEvent(InfraMonitoringEvents.FilterApplied, {
					entity: InfraMonitoringEvents.K8sEntity,
					page: InfraMonitoringEvents.DetailedPage,
					category,
					view: InfraMonitoringEvents.LogsView,
				});

				refetch();
			}
		},
		[inputExpression, initialExpression, refetch, querySearchOnRun, category],
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

	const { updateAllQueriesOperators } = useQueryBuilder();

	const handleOpenInExplorer = useCallback(
		(e: React.MouseEvent<Element, MouseEvent>, log: ILog) => {
			const baseQuery = updateAllQueriesOperators(
				initialQueriesMap[DataSource.LOGS],
				PANEL_TYPES.LIST,
				DataSource.LOGS,
			);

			const queryParams = {
				[QueryParams.activeLogId]: `"${log?.id}"`,
				[QueryParams.startTime]: timeRange.startTime.toString(),
				[QueryParams.endTime]: timeRange.endTime.toString(),
				[QueryParams.compositeQuery]: JSON.stringify({
					...baseQuery,
					builder: {
						...baseQuery.builder,
						queryData: baseQuery.builder.queryData.map((item) => ({
							...item,
							filter: { expression },
						})),
					},
				} satisfies Query),
			};
			safeNavigate(`${ROUTES.LOGS_EXPLORER}?${createQueryParams(queryParams)}`, {
				newTab: !!e && isModifierKeyPressed(e),
			});
		},
		[
			timeRange.startTime,
			timeRange.endTime,
			expression,
			safeNavigate,
			updateAllQueriesOperators,
		],
	);

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

	const isKeyNotFound = isKeyNotFoundError(error);
	const isDataEmpty =
		!showInitialLoading && (!isError || isKeyNotFound) && logs.length === 0;
	const hasAdditionalFilters = !!userExpression?.trim();

	return (
		<div className={styles.container}>
			<div className={styles.filterContainer}>
				<div className={styles.filterContainerTime}>
					<EntityDateTimeSelector
						eventEntity={eventEntity}
						category={category}
						view={InfraMonitoringEvents.LogsView}
					/>

					<RunQueryBtn
						isLoadingQueries={isFetching}
						onStageRunQuery={(): void => handleRunQuery()}
						handleCancelQuery={cancel}
					/>
				</div>

				<div className={styles.filterQuerySearch}>
					<QuerySearch
						onChange={querySearchOnChange}
						queryData={queryData}
						dataSource={DataSource.LOGS}
						onRun={handleRunQuery}
						initialExpression={querySearchInitialExpressionProp}
					/>
				</div>
			</div>
			<div className={styles.logs}>
				{showInitialLoading && <LogsLoading />}
				{isDataEmpty && <EntityEmptyState hasFilters={hasAdditionalFilters} />}
				{isError && !isKeyNotFound && !showInitialLoading && <EntityError />}
				{!showInitialLoading && (!isError || isKeyNotFound) && logs.length > 0 && (
					<div className={styles.listContainer} data-log-detail-ignore="true">
						{renderContent}
					</div>
				)}
				<div ref={logDetailContainerRef} data-log-detail-ignore="true" />
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
						handleOpenInExplorer={(e) => handleOpenInExplorer(e, activeLog)}
						getContainer={(): HTMLElement =>
							logDetailContainerRef.current || document.body
						}
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
