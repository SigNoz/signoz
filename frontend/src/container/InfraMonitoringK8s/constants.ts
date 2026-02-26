/* eslint-disable sonarjs/no-duplicate-string */
import {
	FiltersType,
	IQuickFiltersConfig,
} from 'components/QuickFilters/types';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { DataSource } from 'types/common/queryBuilder';

export const DEFAULT_PAGE_SIZE = 10;

export enum K8sCategory {
	HOSTS = 'hosts',
	PODS = 'pods',
	NODES = 'nodes',
	NAMESPACES = 'namespaces',
	CLUSTERS = 'clusters',
	DEPLOYMENTS = 'deployments',
	STATEFULSETS = 'statefulsets',
	DAEMONSETS = 'daemonsets',
	CONTAINERS = 'containers',
	JOBS = 'jobs',
	VOLUMES = 'volumes',
}

export const K8sCategories = {
	HOSTS: 'hosts',
	PODS: 'pods',
	NODES: 'nodes',
	NAMESPACES: 'namespaces',
	CLUSTERS: 'clusters',
	DEPLOYMENTS: 'deployments',
	STATEFULSETS: 'statefulsets',
	DAEMONSETS: 'daemonsets',
	CONTAINERS: 'containers',
	JOBS: 'jobs',
	VOLUMES: 'volumes',
};

export const K8sEntityToAggregateAttributeMap = {
	[K8sCategory.HOSTS]: 'system.cpu.load_average.15m',
	[K8sCategory.PODS]: 'k8s.pod.cpu.usage',
	[K8sCategory.NODES]: 'k8s.node.cpu.usage',
	[K8sCategory.NAMESPACES]: 'k8s.pod.cpu.usage',
	[K8sCategory.CLUSTERS]: 'k8s.node.cpu.usage',
	[K8sCategory.DEPLOYMENTS]: 'k8s.pod.cpu.usage',
	[K8sCategory.STATEFULSETS]: 'k8s.pod.cpu.usage',
	[K8sCategory.DAEMONSETS]: 'k8s.pod.cpu.usage',
	[K8sCategory.CONTAINERS]: 'k8s.pod.cpu.usage',
	[K8sCategory.JOBS]: 'k8s.job.desired_successful_pods',
	[K8sCategory.VOLUMES]: 'k8s.volume.capacity',
};

export function GetK8sEntityToAggregateAttribute(
	category: K8sCategory,
): string {
	return K8sEntityToAggregateAttributeMap[category];
}

export function GetPodsQuickFiltersConfig(): IQuickFiltersConfig[] {
	return [
		{
			type: FiltersType.CHECKBOX,
			title: 'Pod',
			attributeKey: {
				key: 'k8s.pod.name',
				dataType: DataTypes.String,
				type: 'tag',
				id: 'k8s.pod.name--string--tag--true',
			},
			aggregateOperator: 'noop',
			aggregateAttribute: 'k8s.pod.cpu.usage',
			dataSource: DataSource.METRICS,
			defaultOpen: true,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Namespace',
			attributeKey: {
				key: 'k8s.namespace.name',
				dataType: DataTypes.String,
				type: 'resource',
				id: 'k8s.namespace.name--string--resource--false',
			},
			aggregateOperator: 'noop',
			aggregateAttribute: 'k8s.pod.cpu.usage',
			dataSource: DataSource.METRICS,
			defaultOpen: false,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Node',
			attributeKey: {
				key: 'k8s.node.name',
				dataType: DataTypes.String,
				type: 'resource',
				id: 'k8s.node.name--string--resource--false',
			},
			aggregateOperator: 'noop',
			aggregateAttribute: 'k8s.pod.cpu.usage',
			dataSource: DataSource.METRICS,
			defaultOpen: false,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Cluster',
			attributeKey: {
				key: 'k8s.cluster.name',
				dataType: DataTypes.String,
				type: 'resource',
				id: 'k8s.cluster.name--string--resource--false',
			},
			aggregateOperator: 'noop',
			aggregateAttribute: 'k8s.pod.cpu.usage',
			dataSource: DataSource.METRICS,
			defaultOpen: false,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Deployment',
			attributeKey: {
				key: 'k8s.deployment.name',
				dataType: DataTypes.String,
				type: 'resource',
				id: 'k8s.deployment.name--string--resource--false',
			},
			aggregateOperator: 'noop',
			aggregateAttribute: 'k8s.pod.cpu.usage',
			dataSource: DataSource.METRICS,
			defaultOpen: false,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Statefulset',
			attributeKey: {
				key: 'k8s.statefulset.name',
				dataType: DataTypes.String,
				type: 'resource',
				id: 'k8s.statefulset.name--string--resource--false',
			},
			aggregateOperator: 'noop',
			aggregateAttribute: 'k8s.pod.cpu.usage',
			dataSource: DataSource.METRICS,
			defaultOpen: false,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'DaemonSet',
			attributeKey: {
				key: 'k8s.daemonset.name',
				dataType: DataTypes.String,
				type: 'resource',
				id: 'k8s.daemonset.name--string--resource--false',
			},
			aggregateOperator: 'noop',
			aggregateAttribute: 'k8s.pod.cpu.usage',
			dataSource: DataSource.METRICS,
			defaultOpen: false,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Job',
			attributeKey: {
				key: 'k8s.job.name',
				dataType: DataTypes.String,
				type: 'resource',
				id: 'k8s.job.name--string--resource--false',
			},
			aggregateOperator: 'noop',
			aggregateAttribute: 'k8s.pod.cpu.usage',
			dataSource: DataSource.METRICS,
			defaultOpen: false,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Environment',
			attributeKey: {
				key: 'deployment.environment',
				dataType: DataTypes.String,
				type: 'resource',
			},
			defaultOpen: true,
		},
	];
}

export function GetNodesQuickFiltersConfig(): IQuickFiltersConfig[] {
	return [
		{
			type: FiltersType.CHECKBOX,
			title: 'Node Name',
			attributeKey: {
				key: 'k8s.node.name',
				dataType: DataTypes.String,
				type: 'resource',
				id: 'k8s.node.name--string--resource--true',
			},
			aggregateOperator: 'noop',
			aggregateAttribute: 'k8s.node.cpu.usage',
			dataSource: DataSource.METRICS,
			defaultOpen: true,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Cluster Name',
			attributeKey: {
				key: 'k8s.cluster.name',
				dataType: DataTypes.String,
				type: 'resource',
				id: 'k8s.cluster.name--string--resource--true',
			},
			aggregateOperator: 'noop',
			aggregateAttribute: 'k8s.node.cpu.usage',
			dataSource: DataSource.METRICS,
			defaultOpen: true,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Environment',
			attributeKey: {
				key: 'deployment.environment',
				dataType: DataTypes.String,
				type: 'resource',
			},
			defaultOpen: true,
		},
	];
}

export function GetNamespaceQuickFiltersConfig(): IQuickFiltersConfig[] {
	return [
		{
			type: FiltersType.CHECKBOX,
			title: 'Namespace Name',
			attributeKey: {
				key: 'k8s.namespace.name',
				dataType: DataTypes.String,
				type: 'resource',
				id: 'k8s.namespace.name--string--resource',
			},
			aggregateOperator: 'noop',
			aggregateAttribute: 'k8s.pod.cpu.usage',
			dataSource: DataSource.METRICS,
			defaultOpen: true,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Cluster Name',
			attributeKey: {
				key: 'k8s.cluster.name',
				dataType: DataTypes.String,
				type: 'resource',
				id: 'k8s.cluster.name--string--resource',
			},
			aggregateOperator: 'noop',
			aggregateAttribute: 'k8s.pod.cpu.usage',
			dataSource: DataSource.METRICS,
			defaultOpen: true,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Environment',
			attributeKey: {
				key: 'deployment.environment',
				dataType: DataTypes.String,
				type: 'resource',
			},
			defaultOpen: true,
		},
	];
}

export function GetClustersQuickFiltersConfig(): IQuickFiltersConfig[] {
	return [
		{
			type: FiltersType.CHECKBOX,
			title: 'Cluster Name',
			attributeKey: {
				key: 'k8s.cluster.name',
				dataType: DataTypes.String,
				type: 'resource',
				id: 'k8s.cluster.name--string--resource',
			},
			aggregateOperator: 'noop',
			aggregateAttribute: 'k8s.node.cpu.usage',
			dataSource: DataSource.METRICS,
			defaultOpen: true,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Environment',
			attributeKey: {
				key: 'deployment.environment',
				dataType: DataTypes.String,
				type: 'resource',
			},
			defaultOpen: true,
		},
	];
}

export function GetContainersQuickFiltersConfig(): IQuickFiltersConfig[] {
	return [
		{
			type: FiltersType.CHECKBOX,
			title: 'Container',
			attributeKey: {
				key: 'k8s.container.name',
				dataType: DataTypes.String,
				type: 'resource',
				id: 'k8s.container.name--string--resource',
			},
			defaultOpen: true,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Environment',
			attributeKey: {
				key: 'deployment.environment',
				dataType: DataTypes.String,
				type: 'resource',
			},
			defaultOpen: true,
		},
	];
}

export function GetVolumesQuickFiltersConfig(): IQuickFiltersConfig[] {
	return [
		{
			type: FiltersType.CHECKBOX,
			title: 'PVC Volume Claim Name',
			attributeKey: {
				key: 'k8s.persistentvolumeclaim.name',
				dataType: DataTypes.String,
				type: 'resource',
				id: 'k8s.persistentvolumeclaim.name--string--resource',
			},
			aggregateOperator: 'noop',
			aggregateAttribute: 'k8s.volume.capacity',
			dataSource: DataSource.METRICS,
			defaultOpen: true,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Namespace Name',
			attributeKey: {
				key: 'k8s.namespace.name',
				dataType: DataTypes.String,
				type: 'resource',
				id: 'k8s.namespace.name--string--resource',
			},
			aggregateOperator: 'noop',
			aggregateAttribute: 'k8s.volume.capacity',
			dataSource: DataSource.METRICS,
			defaultOpen: true,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Cluster Name',
			attributeKey: {
				key: 'k8s.cluster.name',
				dataType: DataTypes.String,
				type: 'resource',
				id: 'k8s.cluster.name--string--resource',
			},
			aggregateOperator: 'noop',
			aggregateAttribute: 'k8s.volume.capacity',
			dataSource: DataSource.METRICS,
			defaultOpen: true,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Environment',
			attributeKey: {
				key: 'deployment.environment',
				dataType: DataTypes.String,
				type: 'resource',
			},
			defaultOpen: true,
		},
	];
}

export function GetDeploymentsQuickFiltersConfig(): IQuickFiltersConfig[] {
	return [
		{
			type: FiltersType.CHECKBOX,
			title: 'Deployment Name',
			attributeKey: {
				key: 'k8s.deployment.name',
				dataType: DataTypes.String,
				type: 'resource',
				id: 'k8s.deployment.name--string--resource',
			},
			aggregateOperator: 'noop',
			aggregateAttribute: 'k8s.pod.cpu.usage',
			dataSource: DataSource.METRICS,
			defaultOpen: true,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Namespace Name',
			attributeKey: {
				key: 'k8s.namespace.name',
				dataType: DataTypes.String,
				type: 'resource',
				id: 'k8s.namespace.name--string--resource',
			},
			aggregateOperator: 'noop',
			aggregateAttribute: 'k8s.pod.cpu.usage',
			dataSource: DataSource.METRICS,
			defaultOpen: true,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Cluster Name',
			attributeKey: {
				key: 'k8s.cluster.name',
				dataType: DataTypes.String,
				type: 'resource',
				id: 'k8s.cluster.name--string--resource',
			},
			aggregateOperator: 'noop',
			aggregateAttribute: 'k8s.pod.cpu.usage',
			dataSource: DataSource.METRICS,
			defaultOpen: true,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Environment',
			attributeKey: {
				key: 'deployment.environment',
				dataType: DataTypes.String,
				type: 'resource',
			},
			defaultOpen: true,
		},
	];
}

export function GetStatefulsetsQuickFiltersConfig(): IQuickFiltersConfig[] {
	return [
		{
			type: FiltersType.CHECKBOX,
			title: 'Statefulset Name',
			attributeKey: {
				key: 'k8s.statefulset.name',
				dataType: DataTypes.String,
				type: 'resource',
				id: 'k8s.statefulset.name--string--resource',
			},
			aggregateOperator: 'noop',
			aggregateAttribute: 'k8s.pod.cpu.usage',
			dataSource: DataSource.METRICS,
			defaultOpen: true,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Namespace Name',
			attributeKey: {
				key: 'k8s.namespace.name',
				dataType: DataTypes.String,
				type: 'resource',
				id: 'k8s.namespace.name--string--resource',
			},
			aggregateOperator: 'noop',
			aggregateAttribute: 'k8s.pod.cpu.usage',
			dataSource: DataSource.METRICS,
			defaultOpen: true,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Cluster Name',
			attributeKey: {
				key: 'k8s.cluster.name',
				dataType: DataTypes.String,
				type: 'resource',
				id: 'k8s.cluster.name--string--resource',
			},
			aggregateOperator: 'noop',
			aggregateAttribute: 'k8s.pod.cpu.usage',
			dataSource: DataSource.METRICS,
			defaultOpen: true,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Environment',
			attributeKey: {
				key: 'deployment.environment',
				dataType: DataTypes.String,
				type: 'resource',
			},
			defaultOpen: true,
		},
	];
}

export function GetDaemonsetsQuickFiltersConfig(): IQuickFiltersConfig[] {
	return [
		{
			type: FiltersType.CHECKBOX,
			title: 'DaemonSet Name',
			attributeKey: {
				key: 'k8s.daemonset.name',
				dataType: DataTypes.String,
				type: 'resource',
				id: 'k8s.daemonset.name--string--resource--true',
			},
			aggregateOperator: 'noop',
			aggregateAttribute: 'k8s.pod.cpu.usage',
			dataSource: DataSource.METRICS,
			defaultOpen: true,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Namespace Name',
			attributeKey: {
				key: 'k8s.namespace.name',
				dataType: DataTypes.String,
				type: 'resource',
			},
			aggregateOperator: 'noop',
			aggregateAttribute: 'k8s.pod.cpu.usage',
			dataSource: DataSource.METRICS,
			defaultOpen: true,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Cluster Name',
			attributeKey: {
				key: 'k8s.cluster.name',
				dataType: DataTypes.String,
				type: 'resource',
			},
			aggregateOperator: 'noop',
			aggregateAttribute: 'k8s.pod.cpu.usage',
			dataSource: DataSource.METRICS,
			defaultOpen: true,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Environment',
			attributeKey: {
				key: 'deployment.environment',
				dataType: DataTypes.String,
				type: 'resource',
			},
			defaultOpen: true,
		},
	];
}

export function GetJobsQuickFiltersConfig(): IQuickFiltersConfig[] {
	return [
		{
			type: FiltersType.CHECKBOX,
			title: 'Job Name',
			attributeKey: {
				key: 'k8s.job.name',
				dataType: DataTypes.String,
				type: 'resource',
				id: 'k8s.job.name--string--resource--true',
			},
			aggregateOperator: 'noop',
			aggregateAttribute: 'k8s.pod.cpu.usage',
			dataSource: DataSource.METRICS,
			defaultOpen: true,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Namespace Name',
			attributeKey: {
				key: 'k8s.namespace.name',
				dataType: DataTypes.String,
				type: 'resource',
			},
			aggregateOperator: 'noop',
			aggregateAttribute: 'k8s.pod.cpu.usage',
			dataSource: DataSource.METRICS,
			defaultOpen: true,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Cluster Name',
			attributeKey: {
				key: 'k8s.cluster.name',
				dataType: DataTypes.String,
				type: 'resource',
			},
			aggregateOperator: 'noop',
			aggregateAttribute: 'k8s.pod.cpu.usage',
			dataSource: DataSource.METRICS,
			defaultOpen: true,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Environment',
			attributeKey: {
				key: 'deployment.environment',
				dataType: DataTypes.String,
				type: 'resource',
			},
			defaultOpen: true,
		},
	];
}

export const getInvalidValueTooltipText = (
	entity: K8sCategory,
	attribute: string,
): string => `Some ${entity} do not have ${attribute}s.`;

export const INFRA_MONITORING_K8S_PARAMS_KEYS = {
	CATEGORY: 'category',
	VIEW: 'view',
	CLUSTER_NAME: 'clusterName',
	DAEMONSET_UID: 'daemonSetUID',
	DEPLOYMENT_UID: 'deploymentUID',
	JOB_UID: 'jobUID',
	NAMESPACE_UID: 'namespaceUID',
	NODE_UID: 'nodeUID',
	POD_UID: 'podUID',
	STATEFULSET_UID: 'statefulsetUID',
	VOLUME_UID: 'volumeUID',
	FILTERS: 'filters',
	GROUP_BY: 'groupBy',
	ORDER_BY: 'orderBy',
	LOG_FILTERS: 'logFilters',
	TRACES_FILTERS: 'tracesFilters',
	EVENTS_FILTERS: 'eventsFilters',
	HOSTS_FILTERS: 'hostsFilters',
	CURRENT_PAGE: 'currentPage',
};
