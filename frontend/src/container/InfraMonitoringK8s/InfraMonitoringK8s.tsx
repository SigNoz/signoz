import './InfraMonitoringK8s.styles.scss';

import { VerticalAlignTopOutlined } from '@ant-design/icons';
import * as Sentry from '@sentry/react';
import type { CollapseProps } from 'antd';
import { Collapse, Tooltip, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import QuickFilters from 'components/QuickFilters/QuickFilters';
import { QuickFiltersSource } from 'components/QuickFilters/types';
import { InfraMonitoringEvents } from 'constants/events';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useQueryOperations } from 'hooks/queryBuilder/useQueryBuilderOperations';
import {
	ArrowUpDown,
	Bolt,
	Boxes,
	Computer,
	Container,
	FilePenLine,
	Group,
	HardDrive,
	Workflow,
} from 'lucide-react';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom-v5-compat';
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
	INFRA_MONITORING_K8S_PARAMS_KEYS,
	K8sCategories,
} from './constants';
import K8sDaemonSetsList from './DaemonSets/K8sDaemonSetsList';
import K8sDeploymentsList from './Deployments/K8sDeploymentsList';
import K8sJobsList from './Jobs/K8sJobsList';
import K8sNamespacesList from './Namespaces/K8sNamespacesList';
import K8sNodesList from './Nodes/K8sNodesList';
import K8sPodLists from './Pods/K8sPodLists';
import K8sStatefulSetsList from './StatefulSets/K8sStatefulSetsList';
import K8sVolumesList from './Volumes/K8sVolumesList';

export default function InfraMonitoringK8s(): JSX.Element {
	const [showFilters, setShowFilters] = useState(true);

	const [searchParams, setSearchParams] = useSearchParams();
	const [selectedCategory, setSelectedCategory] = useState(() => {
		const category = searchParams.get(INFRA_MONITORING_K8S_PARAMS_KEYS.CATEGORY);
		if (category) {
			return category as keyof typeof K8sCategories;
		}
		return K8sCategories.PODS;
	});
	const [quickFiltersLastUpdated, setQuickFiltersLastUpdated] = useState(-1);

	const { currentQuery } = useQueryBuilder();

	const handleFilterVisibilityChange = (): void => {
		setShowFilters(!showFilters);
	};

	const { handleChangeQueryData } = useQueryOperations({
		index: 0,
		query: currentQuery.builder.queryData[0],
		entityVersion: '',
	});

	const { featureFlags } = useAppContext();
	const dotMetricsEnabled =
		featureFlags?.find((flag) => flag.name === FeatureKeys.DOT_METRICS_ENABLED)
			?.active || false;

	const handleFilterChange = (query: Query): void => {
		// update the current query with the new filters
		// in infra monitoring k8s, we are using only one query, hence updating the 0th index of queryData
		handleChangeQueryData('filters', query.builder.queryData[0].filters);
		setQuickFiltersLastUpdated(Date.now());
		setSearchParams({
			...Object.fromEntries(searchParams.entries()),
			[INFRA_MONITORING_K8S_PARAMS_KEYS.FILTERS]: JSON.stringify(
				query.builder.queryData[0].filters,
			),
		});

		logEvent(InfraMonitoringEvents.FilterApplied, {
			entity: InfraMonitoringEvents.K8sEntity,
			page: InfraMonitoringEvents.ListPage,
			category: selectedCategory,
			view: InfraMonitoringEvents.QuickFiltersView,
		});
	};

	const items: CollapseProps['items'] = [
		{
			label: (
				<div className="k8s-quick-filters-category-label">
					<div className="k8s-quick-filters-category-label-container">
						<Container size={14} className="k8s-quick-filters-category-label-icon" />
						<Typography.Text>Pods</Typography.Text>
					</div>
				</div>
			),
			key: K8sCategories.PODS,
			showArrow: false,
			children: (
				<QuickFilters
					source={QuickFiltersSource.INFRA_MONITORING}
					config={GetPodsQuickFiltersConfig(dotMetricsEnabled)}
					handleFilterVisibilityChange={handleFilterVisibilityChange}
					onFilterChange={handleFilterChange}
				/>
			),
		},
		{
			label: (
				<div className="k8s-quick-filters-category-label">
					<div className="k8s-quick-filters-category-label-container">
						<Workflow size={14} className="k8s-quick-filters-category-label-icon" />
						<Typography.Text>Nodes</Typography.Text>
					</div>
				</div>
			),
			key: K8sCategories.NODES,
			showArrow: false,
			children: (
				<QuickFilters
					source={QuickFiltersSource.INFRA_MONITORING}
					config={GetNodesQuickFiltersConfig(dotMetricsEnabled)}
					handleFilterVisibilityChange={handleFilterVisibilityChange}
					onFilterChange={handleFilterChange}
				/>
			),
		},
		{
			label: (
				<div className="k8s-quick-filters-category-label">
					<div className="k8s-quick-filters-category-label-container">
						<FilePenLine
							size={14}
							className="k8s-quick-filters-category-label-icon"
						/>
						<Typography.Text>Namespaces</Typography.Text>
					</div>
				</div>
			),
			key: K8sCategories.NAMESPACES,
			showArrow: false,
			children: (
				<QuickFilters
					source={QuickFiltersSource.INFRA_MONITORING}
					config={GetNamespaceQuickFiltersConfig(dotMetricsEnabled)}
					handleFilterVisibilityChange={handleFilterVisibilityChange}
					onFilterChange={handleFilterChange}
				/>
			),
		},
		{
			label: (
				<div className="k8s-quick-filters-category-label">
					<div className="k8s-quick-filters-category-label-container">
						<Boxes size={14} className="k8s-quick-filters-category-label-icon" />
						<Typography.Text>Clusters</Typography.Text>
					</div>
				</div>
			),
			key: K8sCategories.CLUSTERS,
			showArrow: false,
			children: (
				<QuickFilters
					source={QuickFiltersSource.INFRA_MONITORING}
					config={GetClustersQuickFiltersConfig(dotMetricsEnabled)}
					handleFilterVisibilityChange={handleFilterVisibilityChange}
					onFilterChange={handleFilterChange}
				/>
			),
		},
		{
			label: (
				<div className="k8s-quick-filters-category-label">
					<div className="k8s-quick-filters-category-label-container">
						<Computer size={14} className="k8s-quick-filters-category-label-icon" />
						<Typography.Text>Deployments</Typography.Text>
					</div>
				</div>
			),
			key: K8sCategories.DEPLOYMENTS,
			showArrow: false,
			children: (
				<QuickFilters
					source={QuickFiltersSource.INFRA_MONITORING}
					config={GetDeploymentsQuickFiltersConfig(dotMetricsEnabled)}
					handleFilterVisibilityChange={handleFilterVisibilityChange}
					onFilterChange={handleFilterChange}
				/>
			),
		},
		{
			label: (
				<div className="k8s-quick-filters-category-label">
					<div className="k8s-quick-filters-category-label-container">
						<Bolt size={14} className="k8s-quick-filters-category-label-icon" />
						<Typography.Text>Jobs</Typography.Text>
					</div>
				</div>
			),
			key: K8sCategories.JOBS,
			showArrow: false,
			children: (
				<QuickFilters
					source={QuickFiltersSource.INFRA_MONITORING}
					config={GetJobsQuickFiltersConfig(dotMetricsEnabled)}
					handleFilterVisibilityChange={handleFilterVisibilityChange}
					onFilterChange={handleFilterChange}
				/>
			),
		},
		{
			label: (
				<div className="k8s-quick-filters-category-label">
					<div className="k8s-quick-filters-category-label-container">
						<Group size={14} className="k8s-quick-filters-category-label-icon" />
						<Typography.Text>DaemonSets</Typography.Text>
					</div>
				</div>
			),
			key: K8sCategories.DAEMONSETS,
			showArrow: false,
			children: (
				<QuickFilters
					source={QuickFiltersSource.INFRA_MONITORING}
					config={GetDaemonsetsQuickFiltersConfig(dotMetricsEnabled)}
					handleFilterVisibilityChange={handleFilterVisibilityChange}
					onFilterChange={handleFilterChange}
				/>
			),
		},
		{
			label: (
				<div className="k8s-quick-filters-category-label">
					<div className="k8s-quick-filters-category-label-container">
						<ArrowUpDown
							size={14}
							className="k8s-quick-filters-category-label-icon"
						/>
						<Typography.Text>StatefulSets</Typography.Text>
					</div>
				</div>
			),
			key: K8sCategories.STATEFULSETS,
			showArrow: false,
			children: (
				<QuickFilters
					source={QuickFiltersSource.INFRA_MONITORING}
					config={GetStatefulsetsQuickFiltersConfig(dotMetricsEnabled)}
					handleFilterVisibilityChange={handleFilterVisibilityChange}
					onFilterChange={handleFilterChange}
				/>
			),
		},
		{
			label: (
				<div className="k8s-quick-filters-category-label">
					<div className="k8s-quick-filters-category-label-container">
						<HardDrive size={14} className="k8s-quick-filters-category-label-icon" />
						<Typography.Text>Volumes</Typography.Text>
					</div>
				</div>
			),
			key: K8sCategories.VOLUMES,
			showArrow: false,
			children: (
				<QuickFilters
					source={QuickFiltersSource.INFRA_MONITORING}
					config={GetVolumesQuickFiltersConfig(dotMetricsEnabled)}
					handleFilterVisibilityChange={handleFilterVisibilityChange}
					onFilterChange={handleFilterChange}
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
			setSelectedCategory(key[0] as string);
			setSearchParams({
				[INFRA_MONITORING_K8S_PARAMS_KEYS.CATEGORY]: key[0] as string,
			});
			// Reset filters
			handleChangeQueryData('filters', { items: [], op: 'and' });
		}
	};

	return (
		<Sentry.ErrorBoundary fallback={<ErrorBoundaryFallback />}>
			<div className="infra-monitoring-container">
				<div className="k8s-container">
					{showFilters && (
						<div className="k8s-quick-filters-container">
							<div className="k8s-quick-filters-container-header">
								<Typography.Text>Filters</Typography.Text>

								<Tooltip title="Collapse Filters">
									<VerticalAlignTopOutlined
										rotate={270}
										onClick={handleFilterVisibilityChange}
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
						className={`k8s-list-container ${
							showFilters ? 'k8s-list-container-filters-visible' : ''
						}`}
					>
						{selectedCategory === K8sCategories.PODS && (
							<K8sPodLists
								isFiltersVisible={showFilters}
								handleFilterVisibilityChange={handleFilterVisibilityChange}
								quickFiltersLastUpdated={quickFiltersLastUpdated}
							/>
						)}

						{selectedCategory === K8sCategories.NODES && (
							<K8sNodesList
								isFiltersVisible={showFilters}
								handleFilterVisibilityChange={handleFilterVisibilityChange}
								quickFiltersLastUpdated={quickFiltersLastUpdated}
							/>
						)}

						{selectedCategory === K8sCategories.CLUSTERS && (
							<K8sClustersList
								isFiltersVisible={showFilters}
								handleFilterVisibilityChange={handleFilterVisibilityChange}
								quickFiltersLastUpdated={quickFiltersLastUpdated}
							/>
						)}

						{selectedCategory === K8sCategories.DEPLOYMENTS && (
							<K8sDeploymentsList
								isFiltersVisible={showFilters}
								handleFilterVisibilityChange={handleFilterVisibilityChange}
								quickFiltersLastUpdated={quickFiltersLastUpdated}
							/>
						)}

						{selectedCategory === K8sCategories.NAMESPACES && (
							<K8sNamespacesList
								isFiltersVisible={showFilters}
								handleFilterVisibilityChange={handleFilterVisibilityChange}
								quickFiltersLastUpdated={quickFiltersLastUpdated}
							/>
						)}

						{selectedCategory === K8sCategories.STATEFULSETS && (
							<K8sStatefulSetsList
								isFiltersVisible={showFilters}
								handleFilterVisibilityChange={handleFilterVisibilityChange}
								quickFiltersLastUpdated={quickFiltersLastUpdated}
							/>
						)}

						{selectedCategory === K8sCategories.JOBS && (
							<K8sJobsList
								isFiltersVisible={showFilters}
								handleFilterVisibilityChange={handleFilterVisibilityChange}
								quickFiltersLastUpdated={quickFiltersLastUpdated}
							/>
						)}

						{selectedCategory === K8sCategories.DAEMONSETS && (
							<K8sDaemonSetsList
								isFiltersVisible={showFilters}
								handleFilterVisibilityChange={handleFilterVisibilityChange}
								quickFiltersLastUpdated={quickFiltersLastUpdated}
							/>
						)}

						{selectedCategory === K8sCategories.VOLUMES && (
							<K8sVolumesList
								isFiltersVisible={showFilters}
								handleFilterVisibilityChange={handleFilterVisibilityChange}
								quickFiltersLastUpdated={quickFiltersLastUpdated}
							/>
						)}
					</div>
				</div>
			</div>
		</Sentry.ErrorBoundary>
	);
}
