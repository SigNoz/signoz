import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@signozhq/ui/button';
import { Select } from 'antd';
import logEvent from 'api/common/logEvent';
import { useGetFieldsKeys } from 'api/generated/services/fields';
import {
	TelemetrytypesFieldContextDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';
import { TableColumnDef } from 'components/TanStackTableView';
import QuerySearch from 'components/QueryBuilderV2/QueryV2/QuerySearch/QuerySearch';
import { InfraMonitoringEvents } from 'constants/events';
import { QueryParams } from 'constants/query';
import RunQueryBtn from 'container/QueryBuilder/components/RunQueryBtn/RunQueryBtn';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { SlidersHorizontal } from '@signozhq/icons';
import { v4 as uuid } from 'uuid';
import {
	useGlobalTimeQueryInvalidate,
	useGlobalTimeStore,
} from 'store/globalTime';
import { NANO_SECOND_MULTIPLIER } from 'store/globalTime/utils';
import { DataSource } from 'types/common/queryBuilder';

import {
	ENTITY_FILTER_PLACEHOLDERS,
	InfraMonitoringEntity,
	METRIC_NAMESPACE_BY_ENTITY,
} from '../constants';
import {
	useInfraMonitoringGroupBy,
	useInfraMonitoringPageListing,
} from '../hooks';
import K8sFiltersSidePanel from './K8sFiltersSidePanel';

import styles from './K8sHeader.module.scss';
import { TooltipSimple } from '@signozhq/ui/tooltip';

interface K8sHeaderProps<TData> {
	controlListPrefix?: React.ReactNode;
	leftFilters?: React.ReactNode;
	entity: InfraMonitoringEntity;
	showAutoRefresh: boolean;
	columns: TableColumnDef<TData>[];
	columnStorageKey: string;
	isFetching?: boolean;
	cancelQuery: () => void;
}

function K8sHeader<TData>({
	controlListPrefix,
	leftFilters,
	entity,
	showAutoRefresh,
	columns,
	columnStorageKey,
	isFetching = false,
	cancelQuery,
}: K8sHeaderProps<TData>): JSX.Element {
	const [isFiltersSidePanelOpen, setIsFiltersSidePanelOpen] = useState(false);
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

	const getMinMaxTime = useGlobalTimeStore((s) => s.getMinMaxTime);
	const { minTime, maxTime } = getMinMaxTime();
	const startUnixMilli = Math.floor(minTime / NANO_SECOND_MULTIPLIER);
	const endUnixMilli = Math.floor(maxTime / NANO_SECOND_MULTIPLIER);

	const { data: groupByFiltersData, isLoading: isLoadingGroupByFilters } =
		useGetFieldsKeys(
			{
				signal: TelemetrytypesSignalDTO.metrics,
				metricNamespace: METRIC_NAMESPACE_BY_ENTITY[entity],
				limit: 100,
				startUnixMilli,
				endUnixMilli,
				fieldContext: TelemetrytypesFieldContextDTO.resource,
				// the search text is intentionally not included
				// searchText: expression,
			},
			{
				query: {
					queryKey: ['getFieldsKeys', entity, startUnixMilli, endUnixMilli],
				},
			},
		);

	const flatFieldKeys = useMemo(() => {
		const keys = groupByFiltersData?.data?.keys;
		if (!keys) {
			return [];
		}

		const allKeys = Object.values(keys).flat();
		const seen = new Set<string>();

		return allKeys.filter((field) => {
			if (seen.has(field.name)) {
				return false;
			}
			seen.add(field.name);
			return true;
		});
	}, [groupByFiltersData]);

	const groupByOptions = useMemo(
		() =>
			flatFieldKeys.map((field) => ({
				value: field.name,
				label: field.name,
			})),
		[flatFieldKeys],
	);

	const [groupBy, setGroupBy] = useInfraMonitoringGroupBy();

	const handleGroupByChange = useCallback(
		(value: string[]) => {
			void setCurrentPage(1);
			void setGroupBy(value);

			void logEvent(InfraMonitoringEvents.GroupByChanged, {
				entity: InfraMonitoringEvents.K8sEntity,
				page: InfraMonitoringEvents.ListPage,
				category: InfraMonitoringEvents.Pod,
			});
		},
		[setCurrentPage, setGroupBy],
	);

	const onClickOutside = useCallback(() => {
		setIsFiltersSidePanelOpen(false);
	}, []);

	return (
		<div className={styles.k8SListControls}>
			<div className={styles.k8SListControlsRow}>
				{controlListPrefix}

				<div className={styles.k8SFiltersGroupByRow}>
					{leftFilters}

					<div className={styles.k8SAttributeSearchContainer}>
						<div className={styles.groupByLabel}>Group by</div>
						<Select
							className={styles.groupBySelect}
							loading={isLoadingGroupByFilters}
							mode="multiple"
							value={groupBy}
							allowClear
							maxTagCount="responsive"
							placeholder="Search for attribute"
							options={groupByOptions}
							onChange={handleGroupByChange}
						/>
					</div>
				</div>

				<div className={styles.k8SDateTimeSelection}>
					<DateTimeSelectionV2
						showAutoRefresh={showAutoRefresh}
						showRefreshText={false}
						hideShareModal
					/>
				</div>

				<RunQueryBtn
					isLoadingQueries={isFetching}
					onStageRunQuery={handleStageRunQuery}
					handleCancelQuery={handleCancelQuery}
					className={styles.k8SRunButton}
				/>

				<TooltipSimple title="Click to add more columns to this table">
					<Button
						type="button"
						variant="outlined"
						size="icon"
						color="secondary"
						data-testid="k8s-list-filters-button"
						onClick={(): void => setIsFiltersSidePanelOpen(true)}
						className={styles.k8SFiltersButton}
					>
						<SlidersHorizontal size={14} />
					</Button>
				</TooltipSimple>
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

			<K8sFiltersSidePanel
				open={isFiltersSidePanelOpen}
				columns={columns}
				storageKey={columnStorageKey}
				onClose={onClickOutside}
			/>
		</div>
	);
}

export default K8sHeader;
