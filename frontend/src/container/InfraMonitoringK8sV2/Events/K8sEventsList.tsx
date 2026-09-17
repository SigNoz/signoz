import React, { useEffect } from 'react';
import { Table } from 'antd';
import {
	QuerySearchV2Provider,
	useExpression,
	useQuerySearchInitialExpressionProp,
	useQuerySearchOnChange,
	useUserExpression,
} from 'components/QueryBuilderV2';
import QuerySearch from 'components/QueryBuilderV2/QueryV2/QuerySearch/QuerySearch';
import Controls from 'container/Controls';
import RunQueryBtn from 'container/QueryBuilder/components/RunQueryBtn/RunQueryBtn';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import { useQueryState } from 'nuqs';
import { DataSource } from 'types/common/queryBuilder';
import { parseAsJsonNoValidate } from 'utils/nuqsParsers';

import EntityEmptyState from '../EntityDetailsUtils/EntityEmptyState/EntityEmptyState';
import EntityError from '../EntityDetailsUtils/EntityError/EntityError';
import EventsNotConfigured from '../EntityDetailsUtils/EntityEvents/EventsNotConfigured';
import {
	getEntityEventsQueryPayload,
	isEventsKeyNotFoundError,
} from '../EntityDetailsUtils/EntityEvents/utils';
import LoadingContainer from '../LoadingContainer';
import EventDetailsRow from './EventDetailsRow';
import EventsExpandIcon from './EventsExpandIcon';
import {
	K8S_EVENTS_BASE_EXPRESSION,
	K8S_EVENTS_EXPRESSION_KEY,
	K8S_EVENTS_FILTER_PLACEHOLDER,
	K8S_EVENTS_PAGE_SIZE_OPTIONS,
	K8S_EVENTS_PAGINATION_KEY,
} from './constants';
import { K8sEventRow } from './types';
import { useK8sEvents } from './useK8sEvents';
import { useK8sEventsCallbacks } from './useK8sEventsCallbacks';
import { useK8sEventsColumns } from './useK8sEventsColumns';
import { useK8sEventsTimeRange } from './useK8sEventsTimeRange';

import styles from './K8sEventsList.module.scss';

interface K8sEventsListProps {
	controlListPrefix?: React.ReactNode;
}

function K8sEventsListContent({
	controlListPrefix,
}: K8sEventsListProps): JSX.Element {
	const timeRange = useK8sEventsTimeRange();
	const expression = useExpression();
	const userExpression = useUserExpression();
	const querySearchOnChange = useQuerySearchOnChange();
	const querySearchInitialExpressionProp = useQuerySearchInitialExpressionProp();

	const [pagination, setPagination] = useQueryState(
		K8S_EVENTS_PAGINATION_KEY,
		parseAsJsonNoValidate<{ offset: number; limit: number }>(),
	);

	const pageSize = pagination?.limit || K8S_EVENTS_PAGE_SIZE_OPTIONS[0];
	const offset = pagination?.offset || 0;

	const {
		events,
		isLoading,
		isFetching,
		isError,
		error,
		currentCount,
		hasMore,
		refetch,
		cancel,
	} = useK8sEvents({ expression, offset, pageSize });

	const { handleRunQuery, handleDrillDown } = useK8sEventsCallbacks({
		pageSize,
		refetch,
		setPagination,
	});

	const columns = useK8sEventsColumns(handleDrillDown);

	useEffect(
		() => (): void => {
			void setPagination(null);
		},
		[setPagination],
	);

	const isDataEmpty =
		!isLoading && !isFetching && !isError && events.length === 0;
	const isKeyNotFound = isEventsKeyNotFoundError(error);

	return (
		<div className={styles.container} data-testid="k8s-events-list">
			<div className={styles.controlsRow}>
				{controlListPrefix}

				<div className={styles.dateTimeSelection}>
					<DateTimeSelectionV2
						showAutoRefresh
						showRefreshText={false}
						hideShareModal
						defaultRelativeTime="30m"
					/>
				</div>

				<RunQueryBtn
					isLoadingQueries={isFetching}
					onStageRunQuery={(): void => handleRunQuery()}
					handleCancelQuery={cancel}
				/>
			</div>

			<div className={styles.querySearch}>
				<QuerySearch
					onChange={querySearchOnChange}
					queryData={
						getEntityEventsQueryPayload({
							start: timeRange.startTime,
							end: timeRange.endTime,
							expression: userExpression || '',
						}).queryData
					}
					dataSource={DataSource.LOGS}
					onRun={handleRunQuery}
					initialExpression={querySearchInitialExpressionProp}
					placeholder={K8S_EVENTS_FILTER_PLACEHOLDER}
				/>
			</div>

			{isLoading && events.length === 0 && <LoadingContainer />}

			{isDataEmpty && <EntityEmptyState hasFilters={!!userExpression?.trim()} />}

			{isError && !isLoading && isKeyNotFound && <EventsNotConfigured />}

			{isError && !isLoading && !isKeyNotFound && <EntityError />}

			{!isLoading && !isError && events.length > 0 && (
				<div className={styles.eventsTable}>
					<div className={styles.controls}>
						<Controls
							totalCount={hasMore ? currentCount + 1 : currentCount}
							countPerPage={pageSize}
							offset={offset}
							perPageOptions={K8S_EVENTS_PAGE_SIZE_OPTIONS}
							isLoading={isFetching}
							handleNavigatePrevious={(): void => {
								void setPagination({
									offset: Math.max(0, offset - pageSize),
									limit: pageSize,
								});
							}}
							handleNavigateNext={(): void => {
								void setPagination({
									offset: offset + pageSize,
									limit: pageSize,
								});
							}}
							handleCountItemsPerPageChange={(value): void => {
								void setPagination({ offset: 0, limit: value });
							}}
						/>
					</div>

					<Table<K8sEventRow>
						loading={isFetching && events.length === 0}
						columns={columns}
						expandable={{
							expandedRowRender: (record): JSX.Element => (
								<EventDetailsRow record={record} />
							),
							expandIcon: ({ expanded, onExpand, record }): JSX.Element => (
								<EventsExpandIcon
									expanded={expanded}
									onExpand={onExpand}
									record={record}
								/>
							),
						}}
						dataSource={events}
						pagination={false}
						rowKey={(record): string => record.id}
					/>
				</div>
			)}
		</div>
	);
}

function K8sEventsList({ controlListPrefix }: K8sEventsListProps): JSX.Element {
	return (
		<QuerySearchV2Provider
			queryParamKey={K8S_EVENTS_EXPRESSION_KEY}
			initialExpression={K8S_EVENTS_BASE_EXPRESSION}
			persistOnUnmount
		>
			<K8sEventsListContent controlListPrefix={controlListPrefix} />
		</QuerySearchV2Provider>
	);
}

export default K8sEventsList;
