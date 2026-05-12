import { useCallback, useEffect, useMemo } from 'react';
import logEvent from 'api/common/logEvent';
import {
	QuerySearchV2Provider,
	useQuerySearchV2Context,
} from 'components/QueryBuilderV2';
import QuerySearch from 'components/QueryBuilderV2/QueryV2/QuerySearch/QuerySearch';
import {
	combineInitialAndUserExpression,
	getUserExpressionFromCombined,
} from 'components/QueryBuilderV2/QueryV2/QuerySearch/utils';
import { ResizeTable } from 'components/ResizeTable';
import { InfraMonitoringEvents } from 'constants/events';
import Controls from 'container/Controls';
import { InfraMonitoringEntity } from 'container/InfraMonitoringK8s/constants';
import RunQueryBtn from 'container/QueryBuilder/components/RunQueryBtn/RunQueryBtn';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import {
	CustomTimeType,
	Time,
} from 'container/TopNav/DateTimeSelectionV2/types';
import { PER_PAGE_OPTIONS } from 'container/TracesExplorer/ListView/configs';
import { TracesLoading } from 'container/TracesExplorer/TraceLoading/TraceLoading';
import { useQueryState } from 'nuqs';
import { DataSource } from 'types/common/queryBuilder';
import { parseAsJsonNoValidate } from 'utils/nuqsParsers';
import { validateQuery } from 'utils/queryValidationUtils';

import EntityEmptyState from '../EntityEmptyState/EntityEmptyState';
import EntityError from '../EntityError/EntityError';
import { selectedEntityTracesColumns } from '../utils';
import { K8S_ENTITY_TRACES_EXPRESSION_KEY, useEntityTraces } from './hooks';
import { getTraceListColumns } from './traceListColumns';
import { getEntityTracesQueryPayload } from './utils';

import styles from './EntityTraces.module.scss';

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

function EntityTracesContent({
	timeRange,
	isModalTimeSelection,
	handleTimeChange,
	selectedInterval,
	queryKey,
	category,
}: Omit<Props, 'initialExpression'>): JSX.Element {
	const { expression, userExpression, initialExpression, querySearchProps } =
		useQuerySearchV2Context();

	const [pagination, setPagination] = useQueryState(
		'pagination',
		parseAsJsonNoValidate<{ offset: number; limit: number }>(),
	);

	const pageSize = pagination?.limit || PER_PAGE_OPTIONS[0];
	const offset = pagination?.offset || 0;

	const {
		traces,
		isLoading,
		isFetching,
		isError,
		currentCount,
		hasMore,
		refetch,
		cancel,
	} = useEntityTraces({
		queryKey,
		timeRange,
		expression,
		offset,
		pageSize,
	});

	const { onRun } = querySearchProps;

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
				onRun(newUserExpression || '');

				logEvent(InfraMonitoringEvents.FilterApplied, {
					entity: InfraMonitoringEvents.K8sEntity,
					page: InfraMonitoringEvents.DetailedPage,
					category,
					view: InfraMonitoringEvents.TracesView,
				});

				refetch();
			}
		},
		[userExpression, initialExpression, refetch, onRun, category],
	);

	const queryData = useMemo(
		() =>
			getEntityTracesQueryPayload({
				start: timeRange.startTime,
				end: timeRange.endTime,
				expression: userExpression || '',
			}).queryData,
		[timeRange.startTime, timeRange.endTime, userExpression],
	);

	const traceListColumns = getTraceListColumns(selectedEntityTracesColumns);

	const isDataEmpty =
		!isLoading && !isFetching && !isError && traces.length === 0;
	const hasAdditionalFilters = !!userExpression?.trim();

	const handleRowClick = useCallback(() => {
		logEvent(InfraMonitoringEvents.ItemClicked, {
			entity: InfraMonitoringEvents.K8sEntity,
			category,
			view: InfraMonitoringEvents.TracesView,
		});
	}, [category]);

	useEffect(() => {
		return (): void => {
			void setPagination(null);
		};
	}, [setPagination]);

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
						dataSource={DataSource.TRACES}
						onRun={handleRunQuery}
						initialExpression={querySearchProps.initialExpression}
					/>
				</div>
			</div>

			{isLoading && traces.length === 0 && <TracesLoading />}

			{isDataEmpty && <EntityEmptyState hasFilters={hasAdditionalFilters} />}

			{isError && !isLoading && <EntityError />}

			{!isError && traces.length > 0 && (
				<div className={styles.entityTracesTable}>
					<div className={styles.controls}>
						<Controls
							totalCount={hasMore ? currentCount + 1 : currentCount}
							countPerPage={pageSize}
							offset={offset}
							perPageOptions={PER_PAGE_OPTIONS}
							isLoading={false}
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

					<ResizeTable
						tableLayout="fixed"
						pagination={false}
						scroll={{ x: true }}
						loading={isFetching && traces.length === 0}
						dataSource={traces}
						columns={traceListColumns}
						onRow={(): Record<string, unknown> => ({
							onClick: (): void => handleRowClick(),
						})}
					/>
				</div>
			)}
		</div>
	);
}

function EntityTraces({ initialExpression, ...rest }: Props): JSX.Element {
	return (
		<QuerySearchV2Provider
			queryParamKey={K8S_ENTITY_TRACES_EXPRESSION_KEY}
			initialExpression={initialExpression}
			persistOnUnmount
		>
			<EntityTracesContent {...rest} />
		</QuerySearchV2Provider>
	);
}

export default EntityTraces;
