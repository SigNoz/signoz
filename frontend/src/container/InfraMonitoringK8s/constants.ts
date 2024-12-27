import {
	FiltersType,
	IQuickFiltersConfig,
} from 'components/QuickFilters/QuickFilters';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { DataSource } from 'types/common/queryBuilder';

export enum K8sCategory {
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
		title: 'Namespace',
		attributeKey: {
			key: 'k8s_namespace_name',
			dataType: DataTypes.String,
			type: 'resource',
			isColumn: false,
			isJSON: false,
		},
		defaultOpen: true,
	},
];

export const ClustersQuickFiltersConfig: IQuickFiltersConfig[] = [
	{
		type: FiltersType.CHECKBOX,
		title: 'Cluster',
		attributeKey: {
			key: 'k8s.cluster.name',
			dataType: DataTypes.String,
			type: 'resource',
			isColumn: false,
			isJSON: false,
		},
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
		title: 'Volume',
		attributeKey: {
			key: 'k8s_volume_name',
			dataType: DataTypes.String,
			type: 'resource',
			isColumn: false,
			isJSON: false,
		},
		defaultOpen: true,
	},
];

export const DeploymentsQuickFiltersConfig: IQuickFiltersConfig[] = [
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
		defaultOpen: true,
	},
];

export const StatefulsetsQuickFiltersConfig: IQuickFiltersConfig[] = [
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
		defaultOpen: true,
	},
];

export const DaemonSetsQuickFiltersConfig: IQuickFiltersConfig[] = [
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
		defaultOpen: true,
	},
];

export const JobsQuickFiltersConfig: IQuickFiltersConfig[] = [
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
		defaultOpen: true,
	},
];

export const getInvalidValueTooltipText = (
	entity: K8sCategory,
	attribute: string,
): string => `Some ${entity} do not have ${attribute}s.`;
