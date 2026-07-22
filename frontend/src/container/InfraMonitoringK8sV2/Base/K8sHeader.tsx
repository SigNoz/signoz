import React, { useCallback, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import logEvent from 'api/common/logEvent';
import QuerySearch from 'components/QueryBuilderV2/QueryV2/QuerySearch/QuerySearch';
import { InfraMonitoringEvents } from 'constants/events';
import { QueryParams } from 'constants/query';
import RunQueryBtn from 'container/QueryBuilder/components/RunQueryBtn/RunQueryBtn';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { v4 as uuid } from 'uuid';
import { useGlobalTimeQueryInvalidate } from 'store/globalTime';
import { DataSource } from 'types/common/queryBuilder';

import {
	ENTITY_FILTER_PLACEHOLDERS,
	InfraMonitoringEntity,
	METRIC_NAMESPACE_BY_ENTITY,
} from '../constants';
import { useInfraMonitoringPageListing } from '../hooks';

import styles from './K8sHeader.module.scss';

interface K8sHeaderProps {
	controlListPrefix?: React.ReactNode;
	entity: InfraMonitoringEntity;
	showAutoRefresh: boolean;
	isFetching?: boolean;
	cancelQuery: () => void;
}

function K8sHeader({
	controlListPrefix,
	entity,
	showAutoRefresh,
	isFetching = false,
	cancelQuery,
}: K8sHeaderProps): JSX.Element {
	// null = user never touched the search box; fall back to the current
	// query expression on Run so an untouched search doesn't wipe filters
	const stagedExpressionRef = useRef<string | null>(null);

	const { currentQuery } = useQueryBuilder();
	const { safeNavigate } = useSafeNavigate();
	const location = useLocation();
	const invalidateQueries = useGlobalTimeQueryInvalidate();

	const queryData = useMemo(
		(): IBuilderQuery => ({
			...currentQuery.builder.queryData[0],
			aggregateOperator: 'noop',
		}),
		[currentQuery],
	);

	const [, setCurrentPage] = useInfraMonitoringPageListing();

	const handleRunQuery = useCallback(
		(newExpression?: string): void => {
			const currentExpression =
				currentQuery.builder.queryData[0]?.filter?.expression || '';
			const finalExpression = newExpression ?? currentExpression;
			void setCurrentPage(1);

			const updatedQuery = {
				...currentQuery,
				id: uuid(),
				builder: {
					...currentQuery.builder,
					queryData: currentQuery.builder.queryData.map((query, idx) =>
						idx === 0
							? {
									...query,
									filter: { expression: finalExpression || '' },
									filters: { items: [], op: 'AND' as const },
								}
							: query,
					),
				},
			};

			// Use window.location.search to get fresh URL params (avoids stale hook state)
			const newUrlQuery = new URLSearchParams(window.location.search);
			newUrlQuery.set(
				QueryParams.compositeQuery,
				encodeURIComponent(JSON.stringify(updatedQuery)),
			);

			safeNavigate(`${location.pathname}?${newUrlQuery.toString()}`);
			void invalidateQueries();

			if (finalExpression?.trim()) {
				void logEvent(InfraMonitoringEvents.FilterApplied, {
					entity: InfraMonitoringEvents.K8sEntity,
					page: InfraMonitoringEvents.ListPage,
					category: entity,
				});
			}
		},
		[
			currentQuery,
			safeNavigate,
			location.pathname,
			setCurrentPage,
			entity,
			invalidateQueries,
		],
	);

	const handleStageRunQuery = useCallback((): void => {
		handleRunQuery(stagedExpressionRef.current ?? undefined);
	}, [handleRunQuery]);

	const handleExpressionChange = useCallback((value: string): void => {
		stagedExpressionRef.current = value;
	}, []);

	const handleCancelQuery = useCallback((): void => {
		cancelQuery();
	}, [cancelQuery]);

	return (
		<div className={styles.k8SListControls}>
			<div className={styles.k8SListControlsRow}>
				{controlListPrefix}

				<div className={styles.k8SDateTimeSelection}>
					<DateTimeSelectionV2
						showAutoRefresh={showAutoRefresh}
						showRefreshText={false}
						hideShareModal
						defaultRelativeTime="30m"
					/>
				</div>

				<RunQueryBtn
					isLoadingQueries={isFetching}
					onStageRunQuery={handleStageRunQuery}
					handleCancelQuery={handleCancelQuery}
					className={styles.k8SRunButton}
				/>
			</div>

			<div className={styles.k8SQbSearchContainer}>
				<QuerySearch
					queryData={queryData}
					dataSource={DataSource.METRICS}
					onChange={handleExpressionChange}
					onRun={handleRunQuery}
					signalSource=""
					showFilterSuggestionsWithoutMetric
					placeholder={ENTITY_FILTER_PLACEHOLDERS[entity]}
					metricNamespace={METRIC_NAMESPACE_BY_ENTITY[entity]}
				/>
			</div>
		</div>
	);
}

export default K8sHeader;
