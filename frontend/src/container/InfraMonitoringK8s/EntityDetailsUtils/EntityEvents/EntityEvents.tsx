import { useCallback, useEffect, useMemo } from 'react';
import { Table, TableColumnsType } from 'antd';
import logEvent from 'api/common/logEvent';
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
import Controls from 'container/Controls';
import { InfraMonitoringEntity } from 'container/InfraMonitoringK8s/constants';
import LoadingContainer from 'container/InfraMonitoringK8s/LoadingContainer';
import RunQueryBtn from 'container/QueryBuilder/components/RunQueryBtn/RunQueryBtn';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import {
	CustomTimeType,
	Time,
} from 'container/TopNav/DateTimeSelectionV2/types';
import { ChevronDown, ChevronRight } from '@signozhq/icons';
import { useQueryState } from 'nuqs';
import { DataSource } from 'types/common/queryBuilder';
import { parseAsJsonNoValidate } from 'utils/nuqsParsers';
import { validateQuery } from 'utils/queryValidationUtils';

import EntityEmptyState from '../EntityEmptyState/EntityEmptyState';
import EntityError from '../EntityError/EntityError';
import { EventContents } from './EventsContent';
import EventsNotConfigured from './EventsNotConfigured';
import { K8S_ENTITY_EVENTS_EXPRESSION_KEY, useEntityEvents } from './hooks';
import { getEntityEventsQueryPayload, isEventsKeyNotFoundError } from './utils';

import styles from './EntityEvents.module.scss';

interface EventDataType {
	key: string;
	timestamp: string;
	body: string;
	id: string;
	severity: string;
	attributes_string?: Record<string, string>;
	resources_string?: Record<string, string>;
}

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

const PAGE_SIZE_OPTIONS = [10, 20, 50];

const handleExpandRow = (record: EventDataType): JSX.Element => (
	<EventContents
		data={{ ...record.attributes_string, ...record.resources_string }}
	/>
);

function EntityEventsContent({
	timeRange,
	isModalTimeSelection,
	handleTimeChange,
	selectedInterval,
	queryKey,
	category,
}: Omit<Props, 'initialExpression'>): JSX.Element {
	const expression = useExpression();
	const inputExpression = useInputExpression();
	const userExpression = useUserExpression();
	const initialExpression = useInitialExpression();
	const querySearchOnChange = useQuerySearchOnChange();
	const querySearchOnRun = useQuerySearchOnRun();
	const querySearchInitialExpressionProp = useQuerySearchInitialExpressionProp();

	const [pagination, setPagination] = useQueryState(
		'eventsPagination',
		parseAsJsonNoValidate<{ offset: number; limit: number }>(),
	);

	const pageSize = pagination?.limit || PAGE_SIZE_OPTIONS[0];
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
	} = useEntityEvents({
		queryKey,
		timeRange,
		expression,
		offset,
		pageSize,
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
				querySearchOnRun(newUserExpression || '');

				logEvent(InfraMonitoringEvents.FilterApplied, {
					entity: InfraMonitoringEvents.K8sEntity,
					page: InfraMonitoringEvents.DetailedPage,
					category,
					view: InfraMonitoringEvents.EventsView,
				});

				refetch();
			}
		},
		[inputExpression, initialExpression, refetch, querySearchOnRun, category],
	);

	const queryData = useMemo(
		() =>
			getEntityEventsQueryPayload({
				start: timeRange.startTime,
				end: timeRange.endTime,
				expression: userExpression || '',
			}).queryData,
		[timeRange.startTime, timeRange.endTime, userExpression],
	);

	const formattedEvents = useMemo<EventDataType[]>(
		() =>
			events.map((event) => ({
				key: event.data.id,
				id: event.data.id,
				timestamp: event.timestamp,
				body: event.data.body,
				severity: event.data.severity_text,
				attributes_string: event.data.attributes_string,
				resources_string: event.data.resources_string,
			})),
		[events],
	);

	const columns: TableColumnsType<EventDataType> = [
		{ title: 'Severity', dataIndex: 'severity', key: 'severity', width: 100 },
		{
			title: 'Timestamp',
			dataIndex: 'timestamp',
			width: 240,
			ellipsis: true,
			key: 'timestamp',
		},
		{ title: 'Body', dataIndex: 'body', key: 'body' },
	];

	const handleExpandRowIcon = ({
		expanded,
		onExpand,
		record,
	}: {
		expanded: boolean;
		onExpand: (
			record: EventDataType,
			e: React.MouseEvent<HTMLElement, MouseEvent>,
		) => void;
		record: EventDataType;
	}): JSX.Element => {
		const handleClick = (e: React.MouseEvent<SVGSVGElement>): void => {
			onExpand(record, e as unknown as React.MouseEvent<HTMLElement, MouseEvent>);
		};

		return expanded ? (
			<ChevronDown className={styles.expandIcon} size={14} onClick={handleClick} />
		) : (
			<ChevronRight
				className={styles.expandIcon}
				size={14}
				onClick={handleClick}
			/>
		);
	};

	useEffect(() => {
		return (): void => {
			void setPagination(null);
		};
	}, [setPagination]);

	const isDataEmpty =
		!isLoading && !isFetching && !isError && formattedEvents.length === 0;
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
						onChange={querySearchOnChange}
						queryData={queryData}
						dataSource={DataSource.LOGS}
						onRun={handleRunQuery}
						initialExpression={querySearchInitialExpressionProp}
					/>
				</div>
			</div>

			{isLoading && formattedEvents.length === 0 && <LoadingContainer />}

			{isDataEmpty && <EntityEmptyState hasFilters={hasAdditionalFilters} />}

			{isError && !isLoading && isEventsKeyNotFoundError(error) && (
				<EventsNotConfigured />
			)}

			{isError && !isLoading && !isEventsKeyNotFoundError(error) && (
				<EntityError />
			)}

			{!isLoading && !isError && formattedEvents.length > 0 && (
				<div className={styles.eventsTable}>
					<div className={styles.controls}>
						<Controls
							totalCount={hasMore ? currentCount + 1 : currentCount}
							countPerPage={pageSize}
							offset={offset}
							perPageOptions={PAGE_SIZE_OPTIONS}
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
								void setPagination({
									offset: 0,
									limit: value,
								});
							}}
						/>
					</div>

					<Table<EventDataType>
						loading={isFetching && formattedEvents.length === 0}
						columns={columns}
						expandable={{
							expandedRowRender: handleExpandRow,
							rowExpandable: (record): boolean => record.body !== 'Not Expandable',
							expandIcon: handleExpandRowIcon,
						}}
						dataSource={formattedEvents}
						pagination={false}
						rowKey={(record): string => record.id}
					/>
				</div>
			)}
		</div>
	);
}

function EntityEvents({ initialExpression, ...rest }: Props): JSX.Element {
	return (
		<QuerySearchV2Provider
			queryParamKey={K8S_ENTITY_EVENTS_EXPRESSION_KEY}
			initialExpression={initialExpression}
			persistOnUnmount
		>
			<EntityEventsContent {...rest} />
		</QuerySearchV2Provider>
	);
}

export default EntityEvents;
