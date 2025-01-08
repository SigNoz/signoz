import './InfraMonitoringK8s.styles.scss';

import { VerticalAlignTopOutlined } from '@ant-design/icons';
import * as Sentry from '@sentry/react';
import type { CollapseProps } from 'antd';
import { Collapse, Tooltip, Typography } from 'antd';
import QuickFilters from 'components/QuickFilters/QuickFilters';
import {
	ArrowUpDown,
	Bolt,
	Boxes,
	Computer,
	Container,
	FilePenLine,
	Group,
	HardDrive,
	PackageOpen,
	Workflow,
} from 'lucide-react';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';
import { useState } from 'react';

import {
	ClustersQuickFiltersConfig,
	ContainersQuickFiltersConfig,
	DaemonSetsQuickFiltersConfig,
	DeploymentsQuickFiltersConfig,
	JobsQuickFiltersConfig,
	K8sCategories,
	NamespaceQuickFiltersConfig,
	NodesQuickFiltersConfig,
	PodsQuickFiltersConfig,
	StatefulsetsQuickFiltersConfig,
	VolumesQuickFiltersConfig,
} from './constants';
import K8sPodLists from './Pods/K8sPodLists';
import Volumes from './Volumes/Volumes';

export default function InfraMonitoringK8s(): JSX.Element {
	const [showFilters, setShowFilters] = useState(true);

	const [selectedCategory, setSelectedCategory] = useState(K8sCategories.PODS);

	const handleFilterVisibilityChange = (): void => {
		setShowFilters(!showFilters);
	};

	const items: CollapseProps['items'] = [
		{
			label: (
				<div className="k8s-quick-filters-category-label">
					<div className="k8s-quick-filters-category-label-container">
						<Container size={14} className="k8s-quick-filters-category-label-icon" />
						<Typography.Text>Pods</Typography.Text>

						<Typography.Text> ({PodsQuickFiltersConfig.length}) </Typography.Text>
					</div>
				</div>
			),
			key: K8sCategories.PODS,
			showArrow: false,
			children: (
				<QuickFilters
					source="infra-monitoring"
					config={PodsQuickFiltersConfig}
					handleFilterVisibilityChange={handleFilterVisibilityChange}
				/>
			),
		},
		{
			label: (
				<div className="k8s-quick-filters-category-label">
					<div className="k8s-quick-filters-category-label-container">
						<Workflow size={14} className="k8s-quick-filters-category-label-icon" />
						<Typography.Text>Nodes</Typography.Text>

						<Typography.Text> ({NodesQuickFiltersConfig.length}) </Typography.Text>
					</div>
				</div>
			),
			key: K8sCategories.NODES,
			showArrow: false,
			children: (
				<QuickFilters
					source="infra-monitoring"
					config={NodesQuickFiltersConfig}
					handleFilterVisibilityChange={handleFilterVisibilityChange}
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
						<Typography.Text>Namespace</Typography.Text>

						<Typography.Text>
							{' '}
							({NamespaceQuickFiltersConfig.length}){' '}
						</Typography.Text>
					</div>
				</div>
			),
			key: K8sCategories.NAMESPACES,
			showArrow: false,
			children: (
				<QuickFilters
					source="infra-monitoring"
					config={NamespaceQuickFiltersConfig}
					handleFilterVisibilityChange={handleFilterVisibilityChange}
				/>
			),
		},
		{
			label: (
				<div className="k8s-quick-filters-category-label">
					<div className="k8s-quick-filters-category-label-container">
						<Boxes size={14} className="k8s-quick-filters-category-label-icon" />
						<Typography.Text>Clusters</Typography.Text>

						<Typography.Text> ({ClustersQuickFiltersConfig.length}) </Typography.Text>
					</div>
				</div>
			),
			key: K8sCategories.CLUSTERS,
			showArrow: false,
			children: (
				<QuickFilters
					source="infra-monitoring"
					config={ClustersQuickFiltersConfig}
					handleFilterVisibilityChange={handleFilterVisibilityChange}
				/>
			),
		},
		{
			label: (
				<div className="k8s-quick-filters-category-label">
					<div className="k8s-quick-filters-category-label-container">
						<PackageOpen
							size={14}
							className="k8s-quick-filters-category-label-icon"
						/>
						<Typography.Text>Containers</Typography.Text>

						<Typography.Text>
							{' '}
							({ContainersQuickFiltersConfig.length}){' '}
						</Typography.Text>
					</div>
				</div>
			),
			key: K8sCategories.CONTAINERS,
			showArrow: false,
			children: (
				<QuickFilters
					source="infra-monitoring"
					config={ContainersQuickFiltersConfig}
					handleFilterVisibilityChange={handleFilterVisibilityChange}
				/>
			),
		},
		{
			label: (
				<div className="k8s-quick-filters-category-label">
					<div className="k8s-quick-filters-category-label-container">
						<HardDrive size={14} className="k8s-quick-filters-category-label-icon" />
						<Typography.Text>Volumes</Typography.Text>

						<Typography.Text> ({VolumesQuickFiltersConfig.length}) </Typography.Text>
					</div>
				</div>
			),
			key: K8sCategories.VOLUMES,
			showArrow: false,
			children: (
				<QuickFilters
					source="infra-monitoring"
					config={VolumesQuickFiltersConfig}
					handleFilterVisibilityChange={handleFilterVisibilityChange}
				/>
			),
		},
		{
			label: (
				<div className="k8s-quick-filters-category-label">
					<div className="k8s-quick-filters-category-label-container">
						<Computer size={14} className="k8s-quick-filters-category-label-icon" />
						<Typography.Text>Deployments</Typography.Text>

						<Typography.Text>
							{' '}
							({DeploymentsQuickFiltersConfig.length}){' '}
						</Typography.Text>
					</div>
				</div>
			),
			key: K8sCategories.DEPLOYMENTS,
			showArrow: false,
			children: (
				<QuickFilters
					source="infra-monitoring"
					config={DeploymentsQuickFiltersConfig}
					handleFilterVisibilityChange={handleFilterVisibilityChange}
				/>
			),
		},
		{
			label: (
				<div className="k8s-quick-filters-category-label">
					<div className="k8s-quick-filters-category-label-container">
						<Bolt size={14} className="k8s-quick-filters-category-label-icon" />
						<Typography.Text>Jobs</Typography.Text>

						<Typography.Text> ({JobsQuickFiltersConfig.length}) </Typography.Text>
					</div>
				</div>
			),
			key: K8sCategories.JOBS,
			showArrow: false,
			children: (
				<QuickFilters
					source="infra-monitoring"
					config={JobsQuickFiltersConfig}
					handleFilterVisibilityChange={handleFilterVisibilityChange}
				/>
			),
		},
		{
			label: (
				<div className="k8s-quick-filters-category-label">
					<div className="k8s-quick-filters-category-label-container">
						<Group size={14} className="k8s-quick-filters-category-label-icon" />
						<Typography.Text>DaemonSets</Typography.Text>

						<Typography.Text>
							{' '}
							({DaemonSetsQuickFiltersConfig.length}){' '}
						</Typography.Text>
					</div>
				</div>
			),
			key: K8sCategories.DAEMONSETS,
			showArrow: false,
			children: (
				<QuickFilters
					source="infra-monitoring"
					config={DaemonSetsQuickFiltersConfig}
					handleFilterVisibilityChange={handleFilterVisibilityChange}
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

						<Typography.Text>
							{' '}
							({StatefulsetsQuickFiltersConfig.length}){' '}
						</Typography.Text>
					</div>
				</div>
			),
			key: K8sCategories.STATEFULSETS,
			showArrow: false,
			children: (
				<QuickFilters
					source="infra-monitoring"
					config={StatefulsetsQuickFiltersConfig}
					handleFilterVisibilityChange={handleFilterVisibilityChange}
				/>
			),
		},
	];

	const handleCategoryChange = (key: string | string[]): void => {
		if (Array.isArray(key) && key.length > 0) {
			setSelectedCategory(key[0] as string);
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
							/>
						)}

						{selectedCategory === K8sCategories.VOLUMES && <Volumes />}
					</div>
				</div>
			</div>
		</Sentry.ErrorBoundary>
	);
}
