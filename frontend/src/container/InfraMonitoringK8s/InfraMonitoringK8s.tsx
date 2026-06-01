import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Sentry from '@sentry/react';
import { Button, CollapseProps } from 'antd';
import { Collapse, Tooltip } from 'antd';
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
	useInfraMonitoringSelectedItem,
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
	const [, setGroupBy] = useInfraMonitoringGroupBy();
	const [, setOrderBy] = useInfraMonitoringOrderBy();
	const [, setSelectedItem] = useInfraMonitoringSelectedItem();

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

	const handleFilterVisibilityChange = useCallback((): void => {
		setShowFilters((show) => !show);
	}, []);

	const { featureFlags } = useAppContext();
	const dotMetricsEnabled =
		featureFlags?.find((flag) => flag.name === FeatureKeys.DOT_METRICS_ENABLED)
			?.active || false;

	const renderCategoryLabel = (
		icon: JSX.Element,
		label: string,
	): JSX.Element => (
		<div className={styles.quickFiltersCategoryLabel}>
			<div className={styles.quickFiltersCategoryLabelContainer}>
				{icon}
				<Typography.Text>{label}</Typography.Text>
			</div>
		</div>
	);

	const items: CollapseProps['items'] = [
		{
			label: renderCategoryLabel(
				<Container size={14} className={styles.quickFiltersCategoryLabelIcon} />,
				'Pods',
			),
			key: K8sCategories.PODS,
			showArrow: false,
			children: (
				<QuickFilters
					source={QuickFiltersSource.INFRA_MONITORING}
					config={GetPodsQuickFiltersConfig(dotMetricsEnabled)}
					handleFilterVisibilityChange={handleFilterVisibilityChange}
				/>
			),
		},
		{
			label: renderCategoryLabel(
				<Workflow size={14} className={styles.quickFiltersCategoryLabelIcon} />,
				'Nodes',
			),
			key: K8sCategories.NODES,
			showArrow: false,
			children: (
				<QuickFilters
					source={QuickFiltersSource.INFRA_MONITORING}
					config={GetNodesQuickFiltersConfig(dotMetricsEnabled)}
					handleFilterVisibilityChange={handleFilterVisibilityChange}
				/>
			),
		},
		{
			label: renderCategoryLabel(
				<FilePenLine size={14} className={styles.quickFiltersCategoryLabelIcon} />,
				'Namespaces',
			),
			key: K8sCategories.NAMESPACES,
			showArrow: false,
			children: (
				<QuickFilters
					source={QuickFiltersSource.INFRA_MONITORING}
					config={GetNamespaceQuickFiltersConfig(dotMetricsEnabled)}
					handleFilterVisibilityChange={handleFilterVisibilityChange}
				/>
			),
		},
		{
			label: renderCategoryLabel(
				<Boxes size={14} className={styles.quickFiltersCategoryLabelIcon} />,
				'Clusters',
			),
			key: K8sCategories.CLUSTERS,
			showArrow: false,
			children: (
				<QuickFilters
					source={QuickFiltersSource.INFRA_MONITORING}
					config={GetClustersQuickFiltersConfig(dotMetricsEnabled)}
					handleFilterVisibilityChange={handleFilterVisibilityChange}
				/>
			),
		},
		{
			label: renderCategoryLabel(
				<Computer size={14} className={styles.quickFiltersCategoryLabelIcon} />,
				'Deployments',
			),
			key: K8sCategories.DEPLOYMENTS,
			showArrow: false,
			children: (
				<QuickFilters
					source={QuickFiltersSource.INFRA_MONITORING}
					config={GetDeploymentsQuickFiltersConfig(dotMetricsEnabled)}
					handleFilterVisibilityChange={handleFilterVisibilityChange}
				/>
			),
		},
		{
			label: renderCategoryLabel(
				<Bolt size={14} className={styles.quickFiltersCategoryLabelIcon} />,
				'Jobs',
			),
			key: K8sCategories.JOBS,
			showArrow: false,
			children: (
				<QuickFilters
					source={QuickFiltersSource.INFRA_MONITORING}
					config={GetJobsQuickFiltersConfig(dotMetricsEnabled)}
					handleFilterVisibilityChange={handleFilterVisibilityChange}
				/>
			),
		},
		{
			label: renderCategoryLabel(
				<Group size={14} className={styles.quickFiltersCategoryLabelIcon} />,
				'DaemonSets',
			),
			key: K8sCategories.DAEMONSETS,
			showArrow: false,
			children: (
				<QuickFilters
					source={QuickFiltersSource.INFRA_MONITORING}
					config={GetDaemonsetsQuickFiltersConfig(dotMetricsEnabled)}
					handleFilterVisibilityChange={handleFilterVisibilityChange}
				/>
			),
		},
		{
			label: renderCategoryLabel(
				<ArrowUpDown size={14} className={styles.quickFiltersCategoryLabelIcon} />,
				'StatefulSets',
			),
			key: K8sCategories.STATEFULSETS,
			showArrow: false,
			children: (
				<QuickFilters
					source={QuickFiltersSource.INFRA_MONITORING}
					config={GetStatefulsetsQuickFiltersConfig(dotMetricsEnabled)}
					handleFilterVisibilityChange={handleFilterVisibilityChange}
				/>
			),
		},
		{
			label: renderCategoryLabel(
				<HardDrive size={14} className={styles.quickFiltersCategoryLabelIcon} />,
				'Volumes',
			),
			key: K8sCategories.VOLUMES,
			showArrow: false,
			children: (
				<QuickFilters
					source={QuickFiltersSource.INFRA_MONITORING}
					config={GetVolumesQuickFiltersConfig(dotMetricsEnabled)}
					handleFilterVisibilityChange={handleFilterVisibilityChange}
				/>
			),
		},
		// TODO: Enable once we have implemented containers.
		// {
		// 	label: (
		// 		<div className="k8s-quick-filters-category-label">
		// 			<div className="k8s-quick-filters-category-label-container">
		// 				<PackageOpen
		// 					size={14}
		// 					className="k8s-quick-filters-category-label-icon"
		// 				/>
		// 				<Typography.Text>Containers</Typography.Text>
		// 			</div>
		// 		</div>
		// 	),
		// 	key: K8sCategories.CONTAINERS,
		// 	showArrow: false,
		// 	children: (
		// 		<QuickFilters
		// 			source={QuickFiltersSource.INFRA_MONITORING}
		// 			config={ContainersQuickFiltersConfig}
		// 			handleFilterVisibilityChange={handleFilterVisibilityChange}
		// 			onFilterChange={handleFilterChange}
		// 		/>
		// 	),
		// },
	];

	const handleCategoryChange = (key: string | string[]): void => {
		if (Array.isArray(key) && key.length > 0) {
			void setSelectedCategory(key[0] as string);
			void setOrderBy(null);
			void setGroupBy(null);
			void setSelectedItem(null);
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
							<div className={styles.quickFiltersContainerHeader}>
								<Typography.Text>Filters</Typography.Text>

								<Tooltip title="Collapse Filters">
									<ArrowUpToLine
										style={{ transform: 'rotate(270deg)' }}
										onClick={handleFilterVisibilityChange}
										size="md"
									/>
								</Tooltip>
							</div>
							<Collapse
								onChange={handleCategoryChange}
								items={items}
								defaultActiveKey={[selectedCategory]}
								activeKey={[selectedCategory]}
								accordion
								bordered={false}
								ghost
							/>
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
