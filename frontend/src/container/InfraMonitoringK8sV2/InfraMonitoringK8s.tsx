import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Sentry from '@sentry/react';
import { Button, Tooltip } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import QuickFilters from 'components/QuickFilters/QuickFilters';
import { QuickFiltersSource } from 'components/QuickFilters/types';
import { initialQueriesMap } from 'constants/queryBuilder';
import { useGetCompositeQueryParam } from 'hooks/queryBuilder/useGetCompositeQueryParam';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
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
import { DataSource } from 'types/common/queryBuilder';

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
	useInfraMonitoringGroupBy,
	useInfraMonitoringOrderBy,
	useInfraMonitoringSelectedItemParams,
} from './hooks';
import K8sJobsList from './Jobs/K8sJobsList';
import K8sNamespacesList from './Namespaces/K8sNamespacesList';
import K8sNodesList from './Nodes/K8sNodesList';
import K8sPodLists from './Pods/K8sPodLists';
import K8sStatefulSetsList from './StatefulSets/K8sStatefulSetsList';
import K8sVolumesList from './Volumes/K8sVolumesList';

import styles from './InfraMonitoringK8s.module.scss';
import { InfraMonitoringEvents } from 'constants/events';
import logEvent from 'api/common/logEvent';

export default function InfraMonitoringK8s(): JSX.Element {
	const [showFilters, setShowFilters] = useState(true);

	const [selectedCategory, setSelectedCategory] = useInfraMonitoringCategory();
	const [, setGroupBy] = useInfraMonitoringGroupBy();
	const [, setOrderBy] = useInfraMonitoringOrderBy();
	const [, setSelectedItemParams] = useInfraMonitoringSelectedItemParams();

	const compositeQuery = useGetCompositeQueryParam();
	const { currentQuery, redirectWithQueryBuilderData } = useQueryBuilder();
	const isInitialized = useRef(false);

	useEffect(() => {
		if (isInitialized.current) {
			return;
		}
		isInitialized.current = true;

		if (!compositeQuery) {
			const defaultQuery = initialQueriesMap[DataSource.METRICS];
			redirectWithQueryBuilderData({
				...defaultQuery,
				builder: {
					...defaultQuery.builder,
					queryData: defaultQuery.builder.queryData.map((query) => ({
						...query,
						filter: { expression: '' },
						filters: { items: [], op: 'AND' as const },
					})),
				},
			});
		}
	}, [compositeQuery, redirectWithQueryBuilderData]);

	useEffect(() => {
		void logEvent(InfraMonitoringEvents.FilterApplied, {
			entity: InfraMonitoringEvents.K8sEntity,
			page: InfraMonitoringEvents.ListPage,
			category: selectedCategory,
			view: InfraMonitoringEvents.QuickFiltersView,
		});
	}, [selectedCategory]);

	const handleFilterVisibilityChange = useCallback((): void => {
		setShowFilters((show) => !show);
	}, []);

	const { featureFlags } = useAppContext();
	const dotMetricsEnabled =
		featureFlags?.find((flag) => flag.name === FeatureKeys.DOT_METRICS_ENABLED)
			?.active || false;

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
			void setSelectedCategory(key as string);
			void setOrderBy(null);
			void setGroupBy(null);
			setSelectedItemParams(null);
			redirectWithQueryBuilderData({
				...currentQuery,
				builder: {
					...currentQuery.builder,
					queryData: [
						{
							...(currentQuery.builder.queryData[0] || {}),
							filter: { expression: '' },
							filters: { items: [], op: 'AND' as const },
						},
					],
				},
			});
		}
	};

	const showFiltersComp = useMemo(() => {
		return (
			<>
				{!showFilters && (
					<div className={styles.k8SOpenQuickFilters}>
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
