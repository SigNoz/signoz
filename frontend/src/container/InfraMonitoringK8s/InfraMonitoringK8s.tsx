import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Sentry from '@sentry/react';
import { Button, Tooltip } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import logEvent from 'api/common/logEvent';
import QuickFilters from 'components/QuickFilters/QuickFilters';
import { QuickFiltersSource } from 'components/QuickFilters/types';
import { InfraMonitoringEvents } from 'constants/events';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useQueryOperations } from 'hooks/queryBuilder/useQueryBuilderOperations';
import {
	ArrowUpDown,
	ArrowUpToLine,
	Bolt,
	Boxes,
	Computer,
	Container,
	FilePenLine,
	Filter,
	Group,
	HardDrive,
	Workflow,
} from '@signozhq/icons';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { FeatureKeys } from '../../constants/features';
import { useAppContext } from '../../providers/App/App';
import K8sClustersList from './Clusters/K8sClustersList';
import {
	GetClustersQuickFiltersConfig,
	GetDaemonsetsQuickFiltersConfig,
	GetDeploymentsQuickFiltersConfig,
	GetJobsQuickFiltersConfig,
	GetNamespaceQuickFiltersConfig,
	GetNodesQuickFiltersConfig,
	GetPodsQuickFiltersConfig,
	GetStatefulsetsQuickFiltersConfig,
	GetVolumesQuickFiltersConfig,
	K8sCategories,
} from './constants';
import K8sDaemonSetsList from './DaemonSets/K8sDaemonSetsList';
import K8sDeploymentsList from './Deployments/K8sDeploymentsList';
import {
	useInfraMonitoringCategory,
	useInfraMonitoringFiltersK8s,
	useInfraMonitoringGroupBy,
	useInfraMonitoringOrderBy,
} from './hooks';
import K8sJobsList from './Jobs/K8sJobsList';
import K8sNamespacesList from './Namespaces/K8sNamespacesList';
import K8sNodesList from './Nodes/K8sNodesList';
import K8sPodLists from './Pods/K8sPodLists';
import K8sStatefulSetsList from './StatefulSets/K8sStatefulSetsList';
import K8sVolumesList from './Volumes/K8sVolumesList';

import styles from './InfraMonitoringK8s.module.scss';

export default function InfraMonitoringK8s(): JSX.Element {
	const [showFilters, setShowFilters] = useState(true);

	const [selectedCategory, setSelectedCategory] = useInfraMonitoringCategory();
	const [urlFilters, setUrlFilters] = useInfraMonitoringFiltersK8s();
	const [, setGroupBy] = useInfraMonitoringGroupBy();
	const [, setOrderBy] = useInfraMonitoringOrderBy();

	const { currentQuery } = useQueryBuilder();

	const handleFilterVisibilityChange = useCallback((): void => {
		setShowFilters((show) => !show);
	}, []);

	const { handleChangeQueryData } = useQueryOperations({
		index: 0,
		query: currentQuery.builder.queryData[0],
		entityVersion: '',
	});

	// Track previous urlFilters to only sync when the value actually changes
	// (not when handleChangeQueryData changes due to query updates)
	const prevUrlFiltersRef = useRef<string | null>(null);

	useEffect(() => {
		const currentFiltersJson = urlFilters ? JSON.stringify(urlFilters) : null;

		// Only sync if urlFilters value has actually changed
		if (prevUrlFiltersRef.current !== currentFiltersJson) {
			prevUrlFiltersRef.current = currentFiltersJson;
			// Sync filters to query builder, using empty filter when urlFilters is null
			handleChangeQueryData('filters', urlFilters || { items: [], op: 'and' });
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [urlFilters]); // handleChangeQueryData intentionally omitted - we call the current version but don't re-run when it changes

	const { featureFlags } = useAppContext();
	const dotMetricsEnabled =
		featureFlags?.find((flag) => flag.name === FeatureKeys.DOT_METRICS_ENABLED)
			?.active || false;

	const handleFilterChange = (query: Query): void => {
		// update the current query with the new filters
		// in infra monitoring k8s, we are using only one query, hence updating the 0th index of queryData
		const filters = query.builder.queryData[0].filters;
		// The useEffect will sync filters to query builder, avoiding double state updates
		setUrlFilters(filters || null);

		logEvent(InfraMonitoringEvents.FilterApplied, {
			entity: InfraMonitoringEvents.K8sEntity,
			page: InfraMonitoringEvents.ListPage,
			category: selectedCategory,
			view: InfraMonitoringEvents.QuickFiltersView,
		});
	};

	const categories = useMemo(
		() => [
			{
				key: K8sCategories.PODS,
				label: 'Pods',
				icon: <Container size={14} />,
				config: GetPodsQuickFiltersConfig(dotMetricsEnabled),
			},
			{
				key: K8sCategories.NODES,
				label: 'Nodes',
				icon: <Workflow size={14} />,
				config: GetNodesQuickFiltersConfig(dotMetricsEnabled),
			},
			{
				key: K8sCategories.NAMESPACES,
				label: 'Namespaces',
				icon: <FilePenLine size={14} />,
				config: GetNamespaceQuickFiltersConfig(dotMetricsEnabled),
			},
			{
				key: K8sCategories.CLUSTERS,
				label: 'Clusters',
				icon: <Boxes size={14} />,
				config: GetClustersQuickFiltersConfig(dotMetricsEnabled),
			},
			{
				key: K8sCategories.DEPLOYMENTS,
				label: 'Deployments',
				icon: <Computer size={14} />,
				config: GetDeploymentsQuickFiltersConfig(dotMetricsEnabled),
			},
			{
				key: K8sCategories.JOBS,
				label: 'Jobs',
				icon: <Bolt size={14} />,
				config: GetJobsQuickFiltersConfig(dotMetricsEnabled),
			},
			{
				key: K8sCategories.DAEMONSETS,
				label: 'DaemonSets',
				icon: <Group size={14} />,
				config: GetDaemonsetsQuickFiltersConfig(dotMetricsEnabled),
			},
			{
				key: K8sCategories.STATEFULSETS,
				label: 'StatefulSets',
				icon: <ArrowUpDown size={14} />,
				config: GetStatefulsetsQuickFiltersConfig(dotMetricsEnabled),
			},
			{
				key: K8sCategories.VOLUMES,
				label: 'Volumes',
				icon: <HardDrive size={14} />,
				config: GetVolumesQuickFiltersConfig(dotMetricsEnabled),
			},
		],
		[dotMetricsEnabled],
	);

	const selectedCategoryConfig = useMemo(
		() => categories.find((cat) => cat.key === selectedCategory)?.config,
		[categories, selectedCategory],
	);

	const handleCategorySelect = (key: string): void => {
		if (key !== selectedCategory) {
			setSelectedCategory(key);
			// Reset filters
			setUrlFilters(null);
			setOrderBy(null);
			setGroupBy(null);
			handleChangeQueryData('filters', { items: [], op: 'and' });
		}
	};

	const showFiltersComp = useMemo(() => {
		return (
			<>
				{!showFilters && (
					<div>
						<Button
							className="periscope-btn ghost"
							type="text"
							size="small"
							onClick={handleFilterVisibilityChange}
						>
							<Filter size={14} />
						</Button>
					</div>
				)}
			</>
		);
	}, [handleFilterVisibilityChange, showFilters]);

	return (
		<Sentry.ErrorBoundary fallback={<ErrorBoundaryFallback />}>
			<div className={styles.infraMonitoringContainer}>
				<div className={styles.infraContentRow}>
					{showFilters && (
						<div className={styles.quickFiltersContainer}>
							<div className={styles.categorySelectorSection}>
								<div className={styles.sectionHeader} data-type="resource">
									<Typography.Text className={styles.sectionLabel}>
										Viewing · Resource
									</Typography.Text>
									<div className={styles.sectionLine} />
									<Tooltip title="Collapse Filters">
										<ArrowUpToLine
											style={{ transform: 'rotate(270deg)' }}
											onClick={handleFilterVisibilityChange}
											size="md"
										/>
									</Tooltip>
								</div>
								<div className={styles.categoryCard}>
									<div className={styles.categoryList}>
										{categories.map((category) => (
											<button
												key={category.key}
												type="button"
												className={`${styles.categoryItem} ${
													selectedCategory === category.key
														? styles.categoryItemSelected
														: ''
												}`}
												onClick={(): void => handleCategorySelect(category.key)}
												data-testid={`category-${category.key}`}
											>
												{category.icon}
												<Typography.Text>{category.label}</Typography.Text>
											</button>
										))}
									</div>
								</div>
							</div>

							<div className={styles.quickFiltersSection}>
								<div className={styles.sectionHeader} data-type="filter">
									<Typography.Text className={styles.sectionLabel}>
										Filter by
									</Typography.Text>
									<div className={styles.sectionLine} />
								</div>
								{selectedCategoryConfig && (
									<QuickFilters
										source={QuickFiltersSource.INFRA_MONITORING}
										config={selectedCategoryConfig}
										handleFilterVisibilityChange={handleFilterVisibilityChange}
										onFilterChange={handleFilterChange}
									/>
								)}
							</div>
						</div>
					)}

					<div
						className={`${styles.listContainer} ${
							showFilters ? styles.listContainerFiltersVisible : ''
						}`}
					>
						{selectedCategory === K8sCategories.PODS && (
							<K8sPodLists controlListPrefix={showFiltersComp} />
						)}

						{selectedCategory === K8sCategories.NODES && (
							<K8sNodesList controlListPrefix={showFiltersComp} />
						)}

						{selectedCategory === K8sCategories.CLUSTERS && (
							<K8sClustersList controlListPrefix={showFiltersComp} />
						)}

						{selectedCategory === K8sCategories.DEPLOYMENTS && (
							<K8sDeploymentsList controlListPrefix={showFiltersComp} />
						)}

						{selectedCategory === K8sCategories.NAMESPACES && (
							<K8sNamespacesList controlListPrefix={showFiltersComp} />
						)}

						{selectedCategory === K8sCategories.STATEFULSETS && (
							<K8sStatefulSetsList controlListPrefix={showFiltersComp} />
						)}

						{selectedCategory === K8sCategories.JOBS && (
							<K8sJobsList controlListPrefix={showFiltersComp} />
						)}

						{selectedCategory === K8sCategories.DAEMONSETS && (
							<K8sDaemonSetsList controlListPrefix={showFiltersComp} />
						)}

						{selectedCategory === K8sCategories.VOLUMES && (
							<K8sVolumesList controlListPrefix={showFiltersComp} />
						)}
					</div>
				</div>
			</div>
		</Sentry.ErrorBoundary>
	);
}
