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

export const K8sEntityToAggregateAttributeMapping = {
	[K8sCategory.HOSTS]: 'system_cpu_load_average_15m',
	[K8sCategory.PODS]: 'k8s_pod_cpu_utilization',
	[K8sCategory.NODES]: 'k8s_node_cpu_utilization',
	[K8sCategory.NAMESPACES]: 'k8s_pod_cpu_utilization',
	[K8sCategory.CLUSTERS]: 'k8s_node_cpu_utilization',
	[K8sCategory.DEPLOYMENTS]: 'k8s_pod_cpu_utilization',
	[K8sCategory.STATEFULSETS]: 'k8s_pod_cpu_utilization',
	[K8sCategory.DAEMONSETS]: 'k8s_pod_cpu_utilization',
	[K8sCategory.CONTAINERS]: 'k8s_pod_cpu_utilization',
	[K8sCategory.JOBS]: 'k8s_job_desired_successful_pods',
	[K8sCategory.VOLUMES]: 'k8s_volume_capacity',
};

export const PodsQuickFiltersConfig: IQuickFiltersConfig[] = [
	{
		type: FiltersType.CHECKBOX,
		title: 'Pod',
		attributeKey: {
			key: 'k8s_pod_name',
			dataType: DataTypes.String,
			type: 'tag',
			isColumn: false,
			isJSON: false,
			id: 'k8s_pod_name--string--tag--true',
		},
		aggregateOperator: 'noop',
		aggregateAttribute: 'k8s_pod_cpu_utilization',
		dataSource: DataSource.METRICS,
		defaultOpen: true,
	},
	{
		type: FiltersType.CHECKBOX,
		title: 'Namespace',
		attributeKey: {
			key: 'k8s_namespace_name',
			dataType: DataTypes.String,
			type: 'resource',
			isColumn: false,
			isJSON: false,
		},
		aggregateOperator: 'noop',
		aggregateAttribute: 'k8s_pod_cpu_utilization',
		dataSource: DataSource.METRICS,
		defaultOpen: false,
	},
	{
		type: FiltersType.CHECKBOX,
		title: 'Node',
		attributeKey: {
			key: 'k8s_node_name',
			dataType: DataTypes.String,
			type: 'resource',
			isColumn: false,
			isJSON: false,
			id: 'k8s.node.name--string--resource--true',
		},
		aggregateOperator: 'noop',
		aggregateAttribute: 'k8s_pod_cpu_utilization',
		dataSource: DataSource.METRICS,
		defaultOpen: false,
	},
	{
		type: FiltersType.CHECKBOX,
		title: 'Cluster',
		attributeKey: {
			key: 'k8s_cluster_name',
			dataType: DataTypes.String,
			type: 'resource',
			isColumn: false,
			isJSON: false,
		},
		aggregateOperator: 'noop',
		aggregateAttribute: 'k8s_pod_cpu_utilization',
		dataSource: DataSource.METRICS,
		defaultOpen: false,
	},
	{
		type: FiltersType.CHECKBOX,
		title: 'Deployment',
		attributeKey: {
			key: 'k8s_deployment_name',
			dataType: DataTypes.String,
			type: 'resource',
			isColumn: false,
			isJSON: false,
		},
		aggregateOperator: 'noop',
		aggregateAttribute: 'k8s_pod_cpu_utilization',
		dataSource: DataSource.METRICS,
		defaultOpen: false,
	},
	{
		type: FiltersType.CHECKBOX,
		title: 'Statefulset',
		attributeKey: {
			key: 'k8s_statefulset_name',
			dataType: DataTypes.String,
			type: 'resource',
			isColumn: false,
			isJSON: false,
		},
		aggregateOperator: 'noop',
		aggregateAttribute: 'k8s_pod_cpu_utilization',
		dataSource: DataSource.METRICS,
		defaultOpen: false,
	},
	{
		type: FiltersType.CHECKBOX,
		title: 'DaemonSet',
		attributeKey: {
			key: 'k8s_daemonset_name',
			dataType: DataTypes.String,
			type: 'resource',
			isColumn: false,
			isJSON: false,
		},
		aggregateOperator: 'noop',
		aggregateAttribute: 'k8s_pod_cpu_utilization',
		dataSource: DataSource.METRICS,
		defaultOpen: false,
	},
	{
		type: FiltersType.CHECKBOX,
		title: 'Job',
		attributeKey: {
			key: 'k8s_job_name',
			dataType: DataTypes.String,
			type: 'resource',
			isColumn: false,
			isJSON: false,
		},
		aggregateOperator: 'noop',
		aggregateAttribute: 'k8s_pod_cpu_utilization',
		dataSource: DataSource.METRICS,
		defaultOpen: false,
	},
];

export const NodesQuickFiltersConfig: IQuickFiltersConfig[] = [
	{
		type: FiltersType.CHECKBOX,
		title: 'Node Name',
		attributeKey: {
			key: 'k8s_node_name',
			dataType: DataTypes.String,
			type: 'resource',
			isColumn: false,
			isJSON: false,
		},
		aggregateOperator: 'noop',
		aggregateAttribute: 'k8s_pod_cpu_utilization',
		dataSource: DataSource.METRICS,
		defaultOpen: true,
	},
	{
		type: FiltersType.CHECKBOX,
		title: 'Cluster Name',
		attributeKey: {
			key: 'k8s_cluster_name',
			dataType: DataTypes.String,
			type: 'resource',
			isColumn: false,
			isJSON: false,
		},
		aggregateOperator: 'noop',
		aggregateAttribute: 'k8s_pod_cpu_utilization',
		dataSource: DataSource.METRICS,
		defaultOpen: true,
	},
];

export const NamespaceQuickFiltersConfig: IQuickFiltersConfig[] = [
	{
		type: FiltersType.CHECKBOX,
		title: 'Namespace Name',
		attributeKey: {
			key: 'k8s_namespace_name',
			dataType: DataTypes.String,
			type: 'resource',
			isColumn: false,
			isJSON: false,
		},
		aggregateOperator: 'noop',
		aggregateAttribute: 'k8s_pod_cpu_utilization',
		dataSource: DataSource.METRICS,
		defaultOpen: true,
	},
	{
		type: FiltersType.CHECKBOX,
		title: 'Cluster Name',
		attributeKey: {
			key: 'k8s_cluster_name',
			dataType: DataTypes.String,
			type: 'resource',
			isColumn: false,
			isJSON: false,
		},
		aggregateOperator: 'noop',
		aggregateAttribute: 'k8s_pod_cpu_utilization',
		dataSource: DataSource.METRICS,
		defaultOpen: true,
	},
];

export const ClustersQuickFiltersConfig: IQuickFiltersConfig[] = [
	{
		type: FiltersType.CHECKBOX,
		title: 'Cluster Name',
		attributeKey: {
			key: 'k8s_cluster_name',
			dataType: DataTypes.String,
			type: 'resource',
			isColumn: false,
			isJSON: false,
		},
		aggregateOperator: 'noop',
		aggregateAttribute: 'k8s_pod_cpu_utilization',
		dataSource: DataSource.METRICS,
		defaultOpen: true,
	},
];

export const ContainersQuickFiltersConfig: IQuickFiltersConfig[] = [
	{
		type: FiltersType.CHECKBOX,
		title: 'Container',
		attributeKey: {
			key: 'k8s_container_name',
			dataType: DataTypes.String,
			type: 'resource',
			isColumn: false,
			isJSON: false,
		},
		defaultOpen: true,
	},
];

export const VolumesQuickFiltersConfig: IQuickFiltersConfig[] = [
	{
		type: FiltersType.CHECKBOX,
		title: 'PVC Volume Claim Name',
		attributeKey: {
			key: 'k8s_persistentvolumeclaim_name',
			dataType: DataTypes.String,
			type: 'resource',
			isColumn: false,
			isJSON: false,
		},
		aggregateOperator: 'noop',
		aggregateAttribute: 'k8s_volume_capacity',
		dataSource: DataSource.METRICS,
		defaultOpen: true,
	},
	{
		type: FiltersType.CHECKBOX,
		title: 'Namespace Name',
		attributeKey: {
			key: 'k8s_namespace_name',
			dataType: DataTypes.String,
			type: 'resource',
			isColumn: false,
			isJSON: false,
		},
		aggregateOperator: 'noop',
		aggregateAttribute: 'k8s_volume_capacity',
		dataSource: DataSource.METRICS,
		defaultOpen: true,
	},
	{
		type: FiltersType.CHECKBOX,
		title: 'Cluster Name',
		attributeKey: {
			key: 'k8s_cluster_name',
			dataType: DataTypes.String,
			type: 'resource',
			isColumn: false,
			isJSON: false,
		},
		aggregateOperator: 'noop',
		aggregateAttribute: 'k8s_volume_capacity',
		dataSource: DataSource.METRICS,
		defaultOpen: true,
	},
];

export const DeploymentsQuickFiltersConfig: IQuickFiltersConfig[] = [
	{
		type: FiltersType.CHECKBOX,
		title: 'Deployment Name',
		attributeKey: {
			key: 'k8s_deployment_name',
			dataType: DataTypes.String,
			type: 'resource',
			isColumn: false,
			isJSON: false,
		},
		aggregateOperator: 'noop',
		aggregateAttribute: 'k8s_pod_cpu_utilization',
		dataSource: DataSource.METRICS,
		defaultOpen: true,
	},
	{
		type: FiltersType.CHECKBOX,
		title: 'Namespace Name',
		attributeKey: {
			key: 'k8s_namespace_name',
			dataType: DataTypes.String,
			type: 'resource',
			isColumn: false,
			isJSON: false,
		},
		aggregateOperator: 'noop',
		aggregateAttribute: 'k8s_pod_cpu_utilization',
		dataSource: DataSource.METRICS,
		defaultOpen: true,
	},
	{
		type: FiltersType.CHECKBOX,
		title: 'Cluster Name',
		attributeKey: {
			key: 'k8s_cluster_name',
			dataType: DataTypes.String,
			type: 'resource',
			isColumn: false,
			isJSON: false,
		},
		aggregateOperator: 'noop',
		aggregateAttribute: 'k8s_pod_cpu_utilization',
		dataSource: DataSource.METRICS,
		defaultOpen: true,
	},
];

export const StatefulsetsQuickFiltersConfig: IQuickFiltersConfig[] = [
	{
		type: FiltersType.CHECKBOX,
		title: 'Statefulset Name',
		attributeKey: {
			key: 'k8s_statefulset_name',
			dataType: DataTypes.String,
			type: 'resource',
			isColumn: false,
			isJSON: false,
		},
		aggregateOperator: 'noop',
		aggregateAttribute: 'k8s_pod_cpu_utilization',
		dataSource: DataSource.METRICS,
		defaultOpen: true,
	},
	{
		type: FiltersType.CHECKBOX,
		title: 'Namespace Name',
		attributeKey: {
			key: 'k8s_namespace_name',
			dataType: DataTypes.String,
			type: 'resource',
			isColumn: false,
			isJSON: false,
		},
		aggregateOperator: 'noop',
		aggregateAttribute: 'k8s_pod_cpu_utilization',
		dataSource: DataSource.METRICS,
		defaultOpen: true,
	},
	{
		type: FiltersType.CHECKBOX,
		title: 'Cluster Name',
		attributeKey: {
			key: 'k8s_cluster_name',
			dataType: DataTypes.String,
			type: 'resource',
			isColumn: false,
			isJSON: false,
		},
		aggregateOperator: 'noop',
		aggregateAttribute: 'k8s_pod_cpu_utilization',
		dataSource: DataSource.METRICS,
		defaultOpen: true,
	},
];

export const DaemonSetsQuickFiltersConfig: IQuickFiltersConfig[] = [
	{
		type: FiltersType.CHECKBOX,
		title: 'DaemonSet Name',
		attributeKey: {
			key: 'k8s_daemonset_name',
			dataType: DataTypes.String,
			type: 'resource',
			isColumn: false,
			isJSON: false,
		},
		aggregateOperator: 'noop',
		aggregateAttribute: 'k8s_pod_cpu_utilization',
		dataSource: DataSource.METRICS,
		defaultOpen: true,
	},
	{
		type: FiltersType.CHECKBOX,
		title: 'Namespace Name',
		attributeKey: {
			key: 'k8s_namespace_name',
			dataType: DataTypes.String,
			type: 'resource',
			isColumn: false,
			isJSON: false,
		},
		aggregateOperator: 'noop',
		aggregateAttribute: 'k8s_pod_cpu_utilization',
		dataSource: DataSource.METRICS,
		defaultOpen: true,
	},
	{
		type: FiltersType.CHECKBOX,
		title: 'Cluster Name',
		attributeKey: {
			key: 'k8s_cluster_name',
			dataType: DataTypes.String,
			type: 'resource',
			isColumn: false,
			isJSON: false,
		},
		aggregateOperator: 'noop',
		aggregateAttribute: 'k8s_pod_cpu_utilization',
		dataSource: DataSource.METRICS,
		defaultOpen: true,
	},
];

export const JobsQuickFiltersConfig: IQuickFiltersConfig[] = [
	{
		type: FiltersType.CHECKBOX,
		title: 'Job Name',
		attributeKey: {
			key: 'k8s_job_name',
			dataType: DataTypes.String,
			type: 'resource',
			isColumn: false,
			isJSON: false,
		},
		aggregateOperator: 'noop',
		aggregateAttribute: 'k8s_pod_cpu_utilization',
		dataSource: DataSource.METRICS,
		defaultOpen: true,
	},
	{
		type: FiltersType.CHECKBOX,
		title: 'Namespace Name',
		attributeKey: {
			key: 'k8s_namespace_name',
			dataType: DataTypes.String,
			type: 'resource',
			isColumn: false,
			isJSON: false,
		},
		aggregateOperator: 'noop',
		aggregateAttribute: 'k8s_pod_cpu_utilization',
		dataSource: DataSource.METRICS,
		defaultOpen: true,
	},
	{
		type: FiltersType.CHECKBOX,
		title: 'Cluster Name',
		attributeKey: {
			key: 'k8s_cluster_name',
			dataType: DataTypes.String,
			type: 'resource',
			isColumn: false,
			isJSON: false,
		},
		aggregateOperator: 'noop',
		aggregateAttribute: 'k8s_pod_cpu_utilization',
		dataSource: DataSource.METRICS,
		defaultOpen: true,
	},
];

export const getInvalidValueTooltipText = (
	entity: K8sCategory,
	attribute: string,
): string => `Some ${entity} do not have ${attribute}s.`;
