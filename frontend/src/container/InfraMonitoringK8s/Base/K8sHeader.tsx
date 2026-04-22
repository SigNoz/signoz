import React, { useCallback, useMemo, useState } from 'react';
import { Button } from '@signozhq/ui';
import { Select } from 'antd';
import logEvent from 'api/common/logEvent';
import { InfraMonitoringEvents } from 'constants/events';
import { FeatureKeys } from 'constants/features';
import { initialQueriesMap } from 'constants/queryBuilder';
import QueryBuilderSearch from 'container/QueryBuilder/filters/QueryBuilderSearch';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import { useGetAggregateKeys } from 'hooks/queryBuilder/useGetAggregateKeys';
import { useQueryOperations } from 'hooks/queryBuilder/useQueryBuilderOperations';
import { SlidersHorizontal } from 'lucide-react';
import { useAppContext } from 'providers/App/App';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import {
	GetK8sEntityToAggregateAttribute,
	InfraMonitoringEntity,
} from '../constants';
import {
	useInfraMonitoringCurrentPage,
	useInfraMonitoringFilters,
	useInfraMonitoringGroupBy,
} from '../hooks';
import K8sFiltersSidePanel from './K8sFiltersSidePanel';

import styles from './K8sHeader.module.scss';

interface K8sHeaderProps {
	controlListPrefix?: React.ReactNode;
	entity: InfraMonitoringEntity;
	showAutoRefresh: boolean;
}

function K8sHeader({
	controlListPrefix,
	entity,
	showAutoRefresh,
}: K8sHeaderProps): JSX.Element {
	const [isFiltersSidePanelOpen, setIsFiltersSidePanelOpen] = useState(false);
	const [urlFilters, setUrlFilters] = useInfraMonitoringFilters();

	const currentQuery = initialQueriesMap[DataSource.METRICS];

	const updatedCurrentQuery = useMemo(() => {
		let { filters } = currentQuery.builder.queryData[0];
		if (urlFilters) {
			filters = urlFilters;
		}
		return {
			...currentQuery,
			builder: {
				...currentQuery.builder,
				queryData: [
					{
						...currentQuery.builder.queryData[0],
						aggregateOperator: 'noop',
						aggregateAttribute: {
							...currentQuery.builder.queryData[0].aggregateAttribute,
						},
						filters,
					},
				],
			},
		};
	}, [currentQuery, urlFilters]);

	const query = useMemo(
		() => updatedCurrentQuery?.builder?.queryData[0] || null,
		[updatedCurrentQuery],
	);

	const { handleChangeQueryData } = useQueryOperations({
		index: 0,
		query: currentQuery.builder.queryData[0],
		entityVersion: '',
	});

	const [, setCurrentPage] = useInfraMonitoringCurrentPage();
	const handleChangeTagFilters = useCallback(
		(value: IBuilderQuery['filters']) => {
			setUrlFilters(value || null);
			handleChangeQueryData('filters', value);
			setCurrentPage(1);

			if (value?.items && value?.items?.length > 0) {
				logEvent(InfraMonitoringEvents.FilterApplied, {
					entity: InfraMonitoringEvents.K8sEntity,
					page: InfraMonitoringEvents.ListPage,
					category: InfraMonitoringEvents.Pod,
				});
			}
		},
		[handleChangeQueryData, setCurrentPage, setUrlFilters],
	);

	const { featureFlags } = useAppContext();
	const dotMetricsEnabled =
		featureFlags?.find((flag) => flag.name === FeatureKeys.DOT_METRICS_ENABLED)
			?.active || false;

	const {
		data: groupByFiltersData,
		isLoading: isLoadingGroupByFilters,
	} = useGetAggregateKeys(
		{
			dataSource: currentQuery.builder.queryData[0].dataSource,
			aggregateAttribute: GetK8sEntityToAggregateAttribute(
				entity,
				dotMetricsEnabled,
			),
			aggregateOperator: 'noop',
			searchText: '',
			tagType: '',
		},
		{
			queryKey: [currentQuery.builder.queryData[0].dataSource, 'noop'],
		},
		true,
		entity,
	);

	const groupByOptions = useMemo(
		() =>
			groupByFiltersData?.payload?.attributeKeys?.map((filter) => ({
				value: filter.key,
				label: filter.key,
			})) || [],
		[groupByFiltersData],
	);

	const [groupBy, setGroupBy] = useInfraMonitoringGroupBy();

	const handleGroupByChange = useCallback(
		(value: IBuilderQuery['groupBy']) => {
			const newGroupBy = [];

			for (let index = 0; index < value.length; index++) {
				const element = (value[index] as unknown) as string;

				const key = groupByFiltersData?.payload?.attributeKeys?.find(
					(k) => k.key === element,
				);

				if (key) {
					newGroupBy.push(key);
				}
			}

			// Reset pagination on switching to groupBy
			setCurrentPage(1);
			setGroupBy(newGroupBy);

			logEvent(InfraMonitoringEvents.GroupByChanged, {
				entity: InfraMonitoringEvents.K8sEntity,
				page: InfraMonitoringEvents.ListPage,
				category: InfraMonitoringEvents.Pod,
			});
		},
		[groupByFiltersData, setCurrentPage, setGroupBy],
	);

	const onClickOutside = useCallback(() => {
		setIsFiltersSidePanelOpen(false);
	}, []);

	return (
		<div className={styles.k8SListControls}>
			<div className={styles.k8SListControlsLeft}>
				{controlListPrefix}

				<div className={styles.k8SQbSearchContainer}>
					<QueryBuilderSearch
						query={query as IBuilderQuery}
						onChange={handleChangeTagFilters}
						isInfraMonitoring
						disableNavigationShortcuts
						entity={entity}
					/>
				</div>

				<div className={styles.k8SAttributeSearchContainer}>
					<div className={styles.groupByLabel}> Group by </div>
					<Select
						className={styles.groupBySelect}
						loading={isLoadingGroupByFilters}
						mode="multiple"
						value={groupBy}
						allowClear
						maxTagCount="responsive"
						placeholder="Search for attribute"
						style={{ width: '100%' }}
						options={groupByOptions}
						onChange={handleGroupByChange}
					/>
				</div>
			</div>

			<div className={styles.k8SListControlsRight}>
				<DateTimeSelectionV2
					showAutoRefresh={showAutoRefresh}
					showRefreshText={false}
					hideShareModal
				/>

				<Button
					type="button"
					variant="ghost"
					size="icon"
					color="none"
					disabled={groupBy?.length > 0}
					data-testid="k8s-list-filters-button"
					onClick={(): void => setIsFiltersSidePanelOpen(true)}
				>
					<SlidersHorizontal size={14} />
				</Button>
			</div>

			<K8sFiltersSidePanel
				open={isFiltersSidePanelOpen}
				entity={entity}
				onClose={onClickOutside}
			/>
		</div>
	);
}

export default K8sHeader;
