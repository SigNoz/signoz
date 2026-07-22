import {
	FiltersType,
	IQuickFiltersConfig,
} from 'components/QuickFilters/types';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { EQueryType } from 'types/common/dashboard';
import { DataSource, ReduceOperators } from 'types/common/queryBuilder';
import { v4 } from 'uuid';

// TODO(backend): Find a way to generate this via openapi
export const INFRA_MONITORING_ATTR_KEYS = {
	// Host
	HOST_NAME: 'host.name',

	// Cluster
	K8S_CLUSTER_NAME: 'k8s.cluster.name',
	K8S_CLUSTER_UID: 'k8s.cluster.uid',

	// Namespace
	K8S_NAMESPACE_NAME: 'k8s.namespace.name',

	// Node
	K8S_NODE_NAME: 'k8s.node.name',
	K8S_NODE_UID: 'k8s.node.uid',
	K8S_NODE_CPU_USAGE: 'k8s.node.cpu.usage',
	K8S_NODE_ALLOCATABLE_CPU: 'k8s.node.allocatable_cpu',
	K8S_NODE_ALLOCATABLE_MEMORY: 'k8s.node.allocatable_memory',
	K8S_NODE_CONDITION_READY: 'k8s.node.condition_ready',
	K8S_NODE_MEMORY_RSS: 'k8s.node.memory.rss',
	K8S_NODE_MEMORY_USAGE: 'k8s.node.memory.usage',
	K8S_NODE_MEMORY_WORKING_SET: 'k8s.node.memory.working_set',
	K8S_NODE_FILESYSTEM_AVAILABLE: 'k8s.node.filesystem.available',
	K8S_NODE_FILESYSTEM_CAPACITY: 'k8s.node.filesystem.capacity',
	K8S_NODE_FILESYSTEM_USAGE: 'k8s.node.filesystem.usage',
	K8S_NODE_NETWORK_IO: 'k8s.node.network.io',
	K8S_NODE_NETWORK_ERRORS: 'k8s.node.network.errors',

	// Pod
	K8S_POD_NAME: 'k8s.pod.name',
	K8S_POD_UID: 'k8s.pod.uid',
	K8S_POD_CPU_USAGE: 'k8s.pod.cpu.usage',
	K8S_POD_CPU_LIMIT_UTILIZATION: 'k8s.pod.cpu_limit_utilization',
	K8S_POD_CPU_REQUEST_UTILIZATION: 'k8s.pod.cpu_request_utilization',
	K8S_POD_MEMORY_USAGE: 'k8s.pod.memory.usage',
	K8S_POD_MEMORY_RSS: 'k8s.pod.memory.rss',
	K8S_POD_MEMORY_WORKING_SET: 'k8s.pod.memory.working_set',
	K8S_POD_MEMORY_MAJOR_PAGE_FAULTS: 'k8s.pod.memory.major_page_faults',
	K8S_POD_MEMORY_LIMIT_UTILIZATION: 'k8s.pod.memory_limit_utilization',
	K8S_POD_MEMORY_REQUEST_UTILIZATION: 'k8s.pod.memory_request_utilization',
	K8S_POD_FILESYSTEM_AVAILABLE: 'k8s.pod.filesystem.available',
	K8S_POD_FILESYSTEM_CAPACITY: 'k8s.pod.filesystem.capacity',
	K8S_POD_FILESYSTEM_USAGE: 'k8s.pod.filesystem.usage',
	K8S_POD_NETWORK_IO: 'k8s.pod.network.io',
	K8S_POD_NETWORK_ERRORS: 'k8s.pod.network.errors',

	// Container
	K8S_CONTAINER_NAME: 'k8s.container.name',
	K8S_CONTAINER_CPU_REQUEST: 'k8s.container.cpu_request',
	K8S_CONTAINER_CPU_LIMIT: 'k8s.container.cpu_limit',
	K8S_CONTAINER_MEMORY_REQUEST: 'k8s.container.memory_request',
	K8S_CONTAINER_MEMORY_LIMIT: 'k8s.container.memory_limit',

	// Deployment
	K8S_DEPLOYMENT_NAME: 'k8s.deployment.name',
	K8S_DEPLOYMENT_AVAILABLE: 'k8s.deployment.available',
	K8S_DEPLOYMENT_DESIRED: 'k8s.deployment.desired',

	// StatefulSet
	K8S_STATEFULSET_NAME: 'k8s.statefulset.name',
	K8S_STATEFULSET_CURRENT_PODS: 'k8s.statefulset.current_pods',
	K8S_STATEFULSET_DESIRED_PODS: 'k8s.statefulset.desired_pods',
	K8S_STATEFULSET_READY_PODS: 'k8s.statefulset.ready_pods',
	K8S_STATEFULSET_UPDATED_PODS: 'k8s.statefulset.updated_pods',

	// DaemonSet
	K8S_DAEMONSET_NAME: 'k8s.daemonset.name',
	K8S_DAEMONSET_CURRENT_SCHEDULED_NODES: 'k8s.daemonset.current_scheduled_nodes',
	K8S_DAEMONSET_DESIRED_SCHEDULED_NODES: 'k8s.daemonset.desired_scheduled_nodes',
	K8S_DAEMONSET_MISSCHEDULED_NODES: 'k8s.daemonset.misscheduled_nodes',
	K8S_DAEMONSET_READY_NODES: 'k8s.daemonset.ready_nodes',

	// ReplicaSet
	K8S_REPLICASET_NAME: 'k8s.replicaset.name',
	K8S_REPLICASET_AVAILABLE: 'k8s.replicaset.available',
	K8S_REPLICASET_DESIRED: 'k8s.replicaset.desired',

	// Job
	K8S_JOB_NAME: 'k8s.job.name',
	K8S_CRONJOB_NAME: 'k8s.cronjob.name',
	K8S_JOB_ACTIVE_PODS: 'k8s.job.active_pods',
	K8S_JOB_DESIRED_SUCCESSFUL_PODS: 'k8s.job.desired_successful_pods',
	K8S_JOB_FAILED_PODS: 'k8s.job.failed_pods',
	K8S_JOB_SUCCESSFUL_PODS: 'k8s.job.successful_pods',

	// Volume
	K8S_PERSISTENT_VOLUME_CLAIM_NAME: 'k8s.persistentvolumeclaim.name',
	K8S_VOLUME_AVAILABLE: 'k8s.volume.available',
	K8S_VOLUME_CAPACITY: 'k8s.volume.capacity',
	K8S_VOLUME_INODES: 'k8s.volume.inodes',
	K8S_VOLUME_INODES_FREE: 'k8s.volume.inodes.free',
	K8S_VOLUME_INODES_USED: 'k8s.volume.inodes.used',
	K8S_VOLUME_TYPE: 'k8s.volume.type',

	// K8s events
	K8S_OBJECT_KIND: 'k8s.object.kind',
	K8S_OBJECT_NAME: 'k8s.object.name',

	// Environment
	DEPLOYMENT_ENVIRONMENT: 'deployment.environment',
} as const;

export const DEFAULT_PAGE_SIZE = 10;

export enum InfraMonitoringEntity {
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

export enum VIEWS {
	METRICS = 'metrics',
	LOGS = 'logs',
	TRACES = 'traces',
	CONTAINERS = 'containers',
	PROCESSES = 'processes',
	EVENTS = 'events',
	POD_METRICS = 'pod_metrics',
}

export const VIEW_TYPES = {
	METRICS: VIEWS.METRICS,
	LOGS: VIEWS.LOGS,
	TRACES: VIEWS.TRACES,
	EVENTS: VIEWS.EVENTS,
	POD_METRICS: VIEWS.POD_METRICS,
};

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

const underscoreMap = {
	[InfraMonitoringEntity.HOSTS]: 'system_cpu_load_average_15m',
	[InfraMonitoringEntity.PODS]: 'k8s_pod_cpu_usage',
	[InfraMonitoringEntity.NODES]: 'k8s_node_cpu_usage',
	[InfraMonitoringEntity.NAMESPACES]: 'k8s_pod_cpu_usage',
	[InfraMonitoringEntity.CLUSTERS]: 'k8s_node_cpu_usage',
	[InfraMonitoringEntity.DEPLOYMENTS]: 'k8s_pod_cpu_usage',
	[InfraMonitoringEntity.STATEFULSETS]: 'k8s_pod_cpu_usage',
	[InfraMonitoringEntity.DAEMONSETS]: 'k8s_pod_cpu_usage',
	[InfraMonitoringEntity.CONTAINERS]: 'k8s_pod_cpu_usage',
	[InfraMonitoringEntity.JOBS]: 'k8s_job_desired_successful_pods',
	[InfraMonitoringEntity.VOLUMES]: 'k8s_volume_capacity',
};

const dotMap = {
	[InfraMonitoringEntity.HOSTS]: 'system.cpu.load_average.15m',
	[InfraMonitoringEntity.PODS]: 'k8s.pod.cpu.usage',
	[InfraMonitoringEntity.NODES]: 'k8s.node.cpu.usage',
	[InfraMonitoringEntity.NAMESPACES]: 'k8s.pod.cpu.usage',
	[InfraMonitoringEntity.CLUSTERS]: 'k8s.node.cpu.usage',
	[InfraMonitoringEntity.DEPLOYMENTS]: 'k8s.pod.cpu.usage',
	[InfraMonitoringEntity.STATEFULSETS]: 'k8s.pod.cpu.usage',
	[InfraMonitoringEntity.DAEMONSETS]: 'k8s.pod.cpu.usage',
	[InfraMonitoringEntity.CONTAINERS]: 'k8s.pod.cpu.usage',
	[InfraMonitoringEntity.JOBS]: 'k8s.job.desired_successful_pods',
	[InfraMonitoringEntity.VOLUMES]: 'k8s.volume.capacity',
};

export function GetK8sEntityToAggregateAttribute(
	category: InfraMonitoringEntity,
	dotMetricsEnabled: boolean,
): string {
	return dotMetricsEnabled ? dotMap[category] : underscoreMap[category];
}

export function GetPodsQuickFiltersConfig(
	dotMetricsEnabled: boolean,
): IQuickFiltersConfig[] {
	const podKey = dotMetricsEnabled ? 'k8s.pod.name' : 'k8s_pod_name';
	const namespaceKey = dotMetricsEnabled
		? 'k8s.namespace.name'
		: 'k8s_namespace_name';
	const nodeKey = dotMetricsEnabled ? 'k8s.node.name' : 'k8s_node_name';
	const clusterKey = dotMetricsEnabled ? 'k8s.cluster.name' : 'k8s_cluster_name';
	const deploymentKey = dotMetricsEnabled
		? 'k8s.deployment.name'
		: 'k8s_deployment_name';
	const statefulsetKey = dotMetricsEnabled
		? 'k8s.statefulset.name'
		: 'k8s_statefulset_name';
	const daemonsetKey = dotMetricsEnabled
		? 'k8s.daemonset.name'
		: 'k8s_daemonset_name';
	const jobKey = dotMetricsEnabled ? 'k8s.job.name' : 'k8s_job_name';
	const environmentKey = dotMetricsEnabled
		? 'deployment.environment'
		: 'deployment_environment';

	// Define aggregate attribute (metric) name
	const cpuUtilizationMetric = dotMetricsEnabled
		? 'k8s.pod.cpu.usage'
		: 'k8s_pod_cpu_usage';

	return [
		{
			type: FiltersType.CHECKBOX,
			title: 'Pod',
			attributeKey: {
				key: podKey,
				dataType: DataTypes.String,
				type: 'tag',
				id: `${podKey}--string--tag--true`,
			},
			aggregateOperator: 'noop',
			aggregateAttribute: cpuUtilizationMetric,
			dataSource: DataSource.METRICS,
			defaultOpen: true,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Namespace',
			attributeKey: {
				key: namespaceKey,
				dataType: DataTypes.String,
				type: 'resource',
				id: `${namespaceKey}--string--resource--false`,
			},
			aggregateOperator: 'noop',
			aggregateAttribute: cpuUtilizationMetric,
			dataSource: DataSource.METRICS,
			defaultOpen: false,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Node',
			attributeKey: {
				key: nodeKey,
				dataType: DataTypes.String,
				type: 'resource',
				id: `${nodeKey}--string--resource--false`,
			},
			aggregateOperator: 'noop',
			aggregateAttribute: cpuUtilizationMetric,
			dataSource: DataSource.METRICS,
			defaultOpen: false,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Cluster',
			attributeKey: {
				key: clusterKey,
				dataType: DataTypes.String,
				type: 'resource',
				id: `${clusterKey}--string--resource--false`,
			},
			aggregateOperator: 'noop',
			aggregateAttribute: cpuUtilizationMetric,
			dataSource: DataSource.METRICS,
			defaultOpen: false,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Deployment',
			attributeKey: {
				key: deploymentKey,
				dataType: DataTypes.String,
				type: 'resource',
				id: `${deploymentKey}--string--resource--false`,
			},
			aggregateOperator: 'noop',
			aggregateAttribute: cpuUtilizationMetric,
			dataSource: DataSource.METRICS,
			defaultOpen: false,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Statefulset',
			attributeKey: {
				key: statefulsetKey,
				dataType: DataTypes.String,
				type: 'resource',
				id: `${statefulsetKey}--string--resource--false`,
			},
			aggregateOperator: 'noop',
			aggregateAttribute: cpuUtilizationMetric,
			dataSource: DataSource.METRICS,
			defaultOpen: false,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'DaemonSet',
			attributeKey: {
				key: daemonsetKey,
				dataType: DataTypes.String,
				type: 'resource',
				id: `${daemonsetKey}--string--resource--false`,
			},
			aggregateOperator: 'noop',
			aggregateAttribute: cpuUtilizationMetric,
			dataSource: DataSource.METRICS,
			defaultOpen: false,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Job',
			attributeKey: {
				key: jobKey,
				dataType: DataTypes.String,
				type: 'resource',
				id: `${jobKey}--string--resource--false`,
			},
			aggregateOperator: 'noop',
			aggregateAttribute: cpuUtilizationMetric,
			dataSource: DataSource.METRICS,
			defaultOpen: false,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Environment',
			attributeKey: {
				key: environmentKey,
				dataType: DataTypes.String,
				type: 'resource',
			},
			defaultOpen: true,
		},
	];
}

export function GetNodesQuickFiltersConfig(
	dotMetricsEnabled: boolean,
): IQuickFiltersConfig[] {
	// Define attribute keys
	const nodeKey = dotMetricsEnabled ? 'k8s.node.name' : 'k8s_node_name';
	const clusterKey = dotMetricsEnabled ? 'k8s.cluster.name' : 'k8s_cluster_name';

	// Define aggregate metric name for node CPU utilization
	const cpuUtilMetric = dotMetricsEnabled
		? 'k8s.node.cpu.usage'
		: 'k8s_node_cpu_usage';
	const environmentKey = dotMetricsEnabled
		? 'deployment.environment'
		: 'deployment_environment';

	return [
		{
			type: FiltersType.CHECKBOX,
			title: 'Node Name',
			attributeKey: {
				key: nodeKey,
				dataType: DataTypes.String,
				type: 'resource',
				id: `${nodeKey}--string--resource--true`,
			},
			aggregateOperator: 'noop',
			aggregateAttribute: cpuUtilMetric,
			dataSource: DataSource.METRICS,
			defaultOpen: true,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Cluster Name',
			attributeKey: {
				key: clusterKey,
				dataType: DataTypes.String,
				type: 'resource',
				id: `${clusterKey}--string--resource--true`,
			},
			aggregateOperator: 'noop',
			aggregateAttribute: cpuUtilMetric,
			dataSource: DataSource.METRICS,
			defaultOpen: true,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Environment',
			attributeKey: {
				key: environmentKey,
				dataType: DataTypes.String,
				type: 'resource',
			},
			defaultOpen: true,
		},
	];
}

export function GetNamespaceQuickFiltersConfig(
	dotMetricsEnabled: boolean,
): IQuickFiltersConfig[] {
	const namespaceKey = dotMetricsEnabled
		? 'k8s.namespace.name'
		: 'k8s_namespace_name';
	const clusterKey = dotMetricsEnabled ? 'k8s.cluster.name' : 'k8s_cluster_name';
	const cpuUtilMetric = dotMetricsEnabled
		? 'k8s.pod.cpu.usage'
		: 'k8s_pod_cpu_usage';
	const environmentKey = dotMetricsEnabled
		? 'deployment.environment'
		: 'deployment_environment';

	return [
		{
			type: FiltersType.CHECKBOX,
			title: 'Namespace Name',
			attributeKey: {
				key: namespaceKey,
				dataType: DataTypes.String,
				type: 'resource',
				id: `${namespaceKey}--string--resource`,
			},
			aggregateOperator: 'noop',
			aggregateAttribute: cpuUtilMetric,
			dataSource: DataSource.METRICS,
			defaultOpen: true,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Cluster Name',
			attributeKey: {
				key: clusterKey,
				dataType: DataTypes.String,
				type: 'resource',
				id: `${clusterKey}--string--resource`,
			},
			aggregateOperator: 'noop',
			aggregateAttribute: cpuUtilMetric,
			dataSource: DataSource.METRICS,
			defaultOpen: true,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Environment',
			attributeKey: {
				key: environmentKey,
				dataType: DataTypes.String,
				type: 'resource',
			},
			defaultOpen: true,
		},
	];
}

export function GetClustersQuickFiltersConfig(
	dotMetricsEnabled: boolean,
): IQuickFiltersConfig[] {
	const clusterKey = dotMetricsEnabled ? 'k8s.cluster.name' : 'k8s_cluster_name';
	const cpuUtilMetric = dotMetricsEnabled
		? 'k8s.node.cpu.usage'
		: 'k8s_node_cpu_usage';
	const environmentKey = dotMetricsEnabled
		? 'deployment.environment'
		: 'deployment_environment';

	return [
		{
			type: FiltersType.CHECKBOX,
			title: 'Cluster Name',
			attributeKey: {
				key: clusterKey,
				dataType: DataTypes.String,
				type: 'resource',
				id: `${clusterKey}--string--resource`,
			},
			aggregateOperator: 'noop',
			aggregateAttribute: cpuUtilMetric,
			dataSource: DataSource.METRICS,
			defaultOpen: true,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Environment',
			attributeKey: {
				key: environmentKey,
				dataType: DataTypes.String,
				type: 'resource',
			},
			defaultOpen: true,
		},
	];
}

export function GetVolumesQuickFiltersConfig(
	dotMetricsEnabled: boolean,
): IQuickFiltersConfig[] {
	const pvcKey = dotMetricsEnabled
		? 'k8s.persistentvolumeclaim.name'
		: 'k8s_persistentvolumeclaim_name';
	const namespaceKey = dotMetricsEnabled
		? 'k8s.namespace.name'
		: 'k8s_namespace_name';
	const clusterKey = dotMetricsEnabled ? 'k8s.cluster.name' : 'k8s_cluster_name';
	const volumeMetric = dotMetricsEnabled
		? 'k8s.volume.capacity'
		: 'k8s_volume_capacity';
	const environmentKey = dotMetricsEnabled
		? 'deployment.environment'
		: 'deployment_environment';

	return [
		{
			type: FiltersType.CHECKBOX,
			title: 'PVC Volume Claim Name',
			attributeKey: {
				key: pvcKey,
				dataType: DataTypes.String,
				type: 'resource',
				id: `${pvcKey}--string--resource`,
			},
			aggregateOperator: 'noop',
			aggregateAttribute: volumeMetric,
			dataSource: DataSource.METRICS,
			defaultOpen: true,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Namespace Name',
			attributeKey: {
				key: namespaceKey,
				dataType: DataTypes.String,
				type: 'resource',
				id: `${namespaceKey}--string--resource`,
			},
			aggregateOperator: 'noop',
			aggregateAttribute: volumeMetric,
			dataSource: DataSource.METRICS,
			defaultOpen: true,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Cluster Name',
			attributeKey: {
				key: clusterKey,
				dataType: DataTypes.String,
				type: 'resource',
				id: `${clusterKey}--string--resource`,
			},
			aggregateOperator: 'noop',
			aggregateAttribute: volumeMetric,
			dataSource: DataSource.METRICS,
			defaultOpen: true,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Environment',
			attributeKey: {
				key: environmentKey,
				dataType: DataTypes.String,
				type: 'resource',
			},
			defaultOpen: true,
		},
	];
}

export function GetDeploymentsQuickFiltersConfig(
	dotMetricsEnabled: boolean,
): IQuickFiltersConfig[] {
	const deployKey = dotMetricsEnabled
		? 'k8s.deployment.name'
		: 'k8s_deployment_name';
	const namespaceKey = dotMetricsEnabled
		? 'k8s.namespace.name'
		: 'k8s_namespace_name';
	const clusterKey = dotMetricsEnabled ? 'k8s.cluster.name' : 'k8s_cluster_name';
	const metric = dotMetricsEnabled ? 'k8s.pod.cpu.usage' : 'k8s_pod_cpu_usage';
	const environmentKey = dotMetricsEnabled
		? 'deployment.environment'
		: 'deployment_environment';

	return [
		{
			type: FiltersType.CHECKBOX,
			title: 'Deployment Name',
			attributeKey: {
				key: deployKey,
				dataType: DataTypes.String,
				type: 'resource',
				id: `${deployKey}--string--resource`,
			},
			aggregateOperator: 'noop',
			aggregateAttribute: metric,
			dataSource: DataSource.METRICS,
			defaultOpen: true,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Namespace Name',
			attributeKey: {
				key: namespaceKey,
				dataType: DataTypes.String,
				type: 'resource',
				id: `${namespaceKey}--string--resource`,
			},
			aggregateOperator: 'noop',
			aggregateAttribute: metric,
			dataSource: DataSource.METRICS,
			defaultOpen: true,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Cluster Name',
			attributeKey: {
				key: clusterKey,
				dataType: DataTypes.String,
				type: 'resource',
				id: `${clusterKey}--string--resource`,
			},
			aggregateOperator: 'noop',
			aggregateAttribute: metric,
			dataSource: DataSource.METRICS,
			defaultOpen: true,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Environment',
			attributeKey: {
				key: environmentKey,
				dataType: DataTypes.String,
				type: 'resource',
			},
			defaultOpen: true,
		},
	];
}

export function GetStatefulsetsQuickFiltersConfig(
	dotMetricsEnabled: boolean,
): IQuickFiltersConfig[] {
	const ssKey = dotMetricsEnabled
		? 'k8s.statefulset.name'
		: 'k8s_statefulset_name';
	const namespaceKey = dotMetricsEnabled
		? 'k8s.namespace.name'
		: 'k8s_namespace_name';
	const clusterKey = dotMetricsEnabled ? 'k8s.cluster.name' : 'k8s_cluster_name';
	const metric = dotMetricsEnabled ? 'k8s.pod.cpu.usage' : 'k8s_pod_cpu_usage';
	const environmentKey = dotMetricsEnabled
		? 'deployment.environment'
		: 'deployment_environment';

	return [
		{
			type: FiltersType.CHECKBOX,
			title: 'Statefulset Name',
			attributeKey: {
				key: ssKey,
				dataType: DataTypes.String,
				type: 'resource',
				id: `${ssKey}--string--resource`,
			},
			aggregateOperator: 'noop',
			aggregateAttribute: metric,
			dataSource: DataSource.METRICS,
			defaultOpen: true,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Namespace Name',
			attributeKey: {
				key: namespaceKey,
				dataType: DataTypes.String,
				type: 'resource',
				id: `${namespaceKey}--string--resource`,
			},
			aggregateOperator: 'noop',
			aggregateAttribute: metric,
			dataSource: DataSource.METRICS,
			defaultOpen: true,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Cluster Name',
			attributeKey: {
				key: clusterKey,
				dataType: DataTypes.String,
				type: 'resource',
				id: `${clusterKey}--string--resource`,
			},
			aggregateOperator: 'noop',
			aggregateAttribute: metric,
			dataSource: DataSource.METRICS,
			defaultOpen: true,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Environment',
			attributeKey: {
				key: environmentKey,
				dataType: DataTypes.String,
				type: 'resource',
			},
			defaultOpen: true,
		},
	];
}

export function GetDaemonsetsQuickFiltersConfig(
	dotMetricsEnabled: boolean,
): IQuickFiltersConfig[] {
	const nameKey = dotMetricsEnabled
		? 'k8s.daemonset.name'
		: 'k8s_daemonset_name';
	const namespaceKey = dotMetricsEnabled
		? 'k8s.namespace.name'
		: 'k8s_namespace_name';
	const clusterKey = dotMetricsEnabled ? 'k8s.cluster.name' : 'k8s_cluster_name';
	const metricName = dotMetricsEnabled
		? 'k8s.pod.cpu.usage'
		: 'k8s_pod_cpu_usage';
	const environmentKey = dotMetricsEnabled
		? 'deployment.environment'
		: 'deployment_environment';

	return [
		{
			type: FiltersType.CHECKBOX,
			title: 'DaemonSet Name',
			attributeKey: {
				key: nameKey,
				dataType: DataTypes.String,
				type: 'resource',
				id: `${nameKey}--string--resource--true`,
			},
			aggregateOperator: 'noop',
			aggregateAttribute: metricName,
			dataSource: DataSource.METRICS,
			defaultOpen: true,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Namespace Name',
			attributeKey: {
				key: namespaceKey,
				dataType: DataTypes.String,
				type: 'resource',
			},
			aggregateOperator: 'noop',
			aggregateAttribute: metricName,
			dataSource: DataSource.METRICS,
			defaultOpen: true,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Cluster Name',
			attributeKey: {
				key: clusterKey,
				dataType: DataTypes.String,
				type: 'resource',
			},
			aggregateOperator: 'noop',
			aggregateAttribute: metricName,
			dataSource: DataSource.METRICS,
			defaultOpen: true,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Environment',
			attributeKey: {
				key: environmentKey,
				dataType: DataTypes.String,
				type: 'resource',
			},
			defaultOpen: true,
		},
	];
}

export function GetJobsQuickFiltersConfig(
	dotMetricsEnabled: boolean,
): IQuickFiltersConfig[] {
	const nameKey = dotMetricsEnabled ? 'k8s.job.name' : 'k8s_job_name';
	const namespaceKey = dotMetricsEnabled
		? 'k8s.namespace.name'
		: 'k8s_namespace_name';
	const clusterKey = dotMetricsEnabled ? 'k8s.cluster.name' : 'k8s_cluster_name';
	const metricName = dotMetricsEnabled
		? 'k8s.pod.cpu.usage'
		: 'k8s_pod_cpu_usage';
	const environmentKey = dotMetricsEnabled
		? 'deployment.environment'
		: 'deployment_environment';

	return [
		{
			type: FiltersType.CHECKBOX,
			title: 'Job Name',
			attributeKey: {
				key: nameKey,
				dataType: DataTypes.String,
				type: 'resource',
				id: `${nameKey}--string--resource--true`,
			},
			aggregateOperator: 'noop',
			aggregateAttribute: metricName,
			dataSource: DataSource.METRICS,
			defaultOpen: true,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Namespace Name',
			attributeKey: {
				key: namespaceKey,
				dataType: DataTypes.String,
				type: 'resource',
			},
			aggregateOperator: 'noop',
			aggregateAttribute: metricName,
			dataSource: DataSource.METRICS,
			defaultOpen: true,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Cluster Name',
			attributeKey: {
				key: clusterKey,
				dataType: DataTypes.String,
				type: 'resource',
			},
			aggregateOperator: 'noop',
			aggregateAttribute: metricName,
			dataSource: DataSource.METRICS,
			defaultOpen: true,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Environment',
			attributeKey: {
				key: environmentKey,
				dataType: DataTypes.String,
				type: 'resource',
			},
			defaultOpen: true,
		},
	];
}

export const getInvalidValueTooltipText = (
	entity: InfraMonitoringEntity,
	attribute: string,
): string => `Some ${entity} do not have ${attribute}s.`;

export const ENTITY_FILTER_PLACEHOLDERS: Record<InfraMonitoringEntity, string> =
	{
		[InfraMonitoringEntity.HOSTS]:
			"Enter your filter query (e.g., host.name = 'web-server-01' AND os.type = 'linux')",
		[InfraMonitoringEntity.PODS]:
			"Enter your filter query (e.g., k8s.namespace.name = 'production' AND k8s.deployment.name = 'api-server')",
		[InfraMonitoringEntity.NODES]:
			"Enter your filter query (e.g., k8s.node.name = 'node-01' AND k8s.cluster.name = 'prod-cluster')",
		[InfraMonitoringEntity.NAMESPACES]:
			"Enter your filter query (e.g., k8s.namespace.name = 'production' AND k8s.cluster.name = 'prod-cluster')",
		[InfraMonitoringEntity.CLUSTERS]:
			"Enter your filter query (e.g., k8s.cluster.name = 'prod-cluster' AND deployment.environment = 'production')",
		[InfraMonitoringEntity.DEPLOYMENTS]:
			"Enter your filter query (e.g., k8s.deployment.name = 'api-server' AND k8s.namespace.name = 'production')",
		[InfraMonitoringEntity.STATEFULSETS]:
			"Enter your filter query (e.g., k8s.statefulset.name = 'postgres' AND k8s.namespace.name = 'databases')",
		[InfraMonitoringEntity.DAEMONSETS]:
			"Enter your filter query (e.g., k8s.daemonset.name = 'fluentd' AND k8s.namespace.name = 'logging')",
		[InfraMonitoringEntity.CONTAINERS]:
			"Enter your filter query (e.g., k8s.container.name = 'nginx' AND k8s.namespace.name = 'production')",
		[InfraMonitoringEntity.JOBS]:
			"Enter your filter query (e.g., k8s.job.name = 'backup-job' AND k8s.namespace.name = 'cron-jobs')",
		[InfraMonitoringEntity.VOLUMES]:
			"Enter your filter query (e.g., k8s.persistentvolumeclaim.name = 'data-pvc' AND k8s.namespace.name = 'storage')",
	};

export const INFRA_MONITORING_K8S_PARAMS_KEYS = {
	CATEGORY: 'category',
	VIEW: 'view',
	FILTERS: 'filters',
	EXPRESSION: 'expression',
	GROUP_BY: 'groupBy',
	ORDER_BY: 'orderBy',
	LOG_FILTERS: 'logFilters',
	TRACES_FILTERS: 'tracesFilters',
	EVENTS_FILTERS: 'eventsFilters',
	HOSTS_FILTERS: 'hostsFilters',
	STATUS_FILTER: 'statusFilter',
	CURRENT_PAGE: 'currentPage',
	PAGE: 'page',
	PAGE_SIZE: 'pageSize',
	EXPANDED: 'expanded',
	SELECTED_ITEM: 'selectedItem',
	SELECTED_ITEM_CLUSTER_NAME: 'selectedItemClusterName',
	SELECTED_ITEM_NAMESPACE_NAME: 'selectedItemNamespaceName',
	DETAIL_RELATIVE_TIME: 'detailRelativeTime',
	DETAIL_START_TIME: 'detailStartTime',
	DETAIL_END_TIME: 'detailEndTime',
};

/** Metric namespace prefixes for /fields/keys and /fields/values APIs */
export const METRIC_NAMESPACE_BY_ENTITY: Record<InfraMonitoringEntity, string> =
	{
		[InfraMonitoringEntity.HOSTS]: 'system.',
		[InfraMonitoringEntity.PODS]: 'k8s.pod.',
		[InfraMonitoringEntity.NODES]: 'k8s.node.',
		[InfraMonitoringEntity.NAMESPACES]: 'k8s.pod.',
		[InfraMonitoringEntity.CLUSTERS]: 'k8s.node.',
		[InfraMonitoringEntity.DEPLOYMENTS]: 'k8s.',
		[InfraMonitoringEntity.STATEFULSETS]: 'k8s.',
		[InfraMonitoringEntity.DAEMONSETS]: 'k8s.',
		[InfraMonitoringEntity.CONTAINERS]: 'k8s.pod.',
		[InfraMonitoringEntity.JOBS]: 'k8s.',
		[InfraMonitoringEntity.VOLUMES]: 'k8s.volume.',
	};

export interface WorkloadFilterContext {
	workloadNameKey: string;
	workloadNameValue: string;
	clusterName: string;
	namespaceName?: string;
}

export const podUtilizationByPodWidgetInfo = [
	{
		title: 'CPU Limit Utilization By Pod Name',
		yAxisUnit: 'percentunit',
		docPath: '#cpu-limit-utilization-by-pod-name',
	},
	{
		title: 'CPU Request Utilization By Pod Name',
		yAxisUnit: 'percentunit',
		docPath: '#cpu-request-utilization-by-pod-name',
	},
	{
		title: 'Memory Limit Utilization By Pod Name',
		yAxisUnit: 'percentunit',
		docPath: '#memory-limit-utilization-by-pod-name',
	},
	{
		title: 'Memory Request Utilization By Pod Name',
		yAxisUnit: 'percentunit',
		docPath: '#memory-request-utilization-by-pod-name',
	},
	{
		title: 'FileSystem Usage Percentage By Pod Name',
		yAxisUnit: 'percentunit',
		docPath: '#filesystem-usage-percentage-by-pod-name',
	},
];

export function getPodUtilizationByPodQueryPayloads(
	context: WorkloadFilterContext,
	start: number,
	end: number,
	dotMetricsEnabled: boolean,
): GetQueryResultsProps[] {
	const getKey = (dotKey: string, underscoreKey: string): string =>
		dotMetricsEnabled ? dotKey : underscoreKey;

	const k8sPodCpuLimitUtilKey = getKey(
		'k8s.pod.cpu_limit_utilization',
		'k8s_pod_cpu_limit_utilization',
	);
	const k8sPodCpuRequestUtilKey = getKey(
		'k8s.pod.cpu_request_utilization',
		'k8s_pod_cpu_request_utilization',
	);
	const k8sPodMemLimitUtilKey = getKey(
		'k8s.pod.memory_limit_utilization',
		'k8s_pod_memory_limit_utilization',
	);
	const k8sPodMemRequestUtilKey = getKey(
		'k8s.pod.memory_request_utilization',
		'k8s_pod_memory_request_utilization',
	);
	const k8sPodFsUsageKey = getKey(
		'k8s.pod.filesystem.usage',
		'k8s_pod_filesystem_usage',
	);
	const k8sPodFsCapacityKey = getKey(
		'k8s.pod.filesystem.capacity',
		'k8s_pod_filesystem_capacity',
	);
	const k8sPodNameKey = getKey('k8s.pod.name', 'k8s_pod_name');
	const k8sClusterNameKey = getKey('k8s.cluster.name', 'k8s_cluster_name');
	const k8sNamespaceNameKey = getKey('k8s.namespace.name', 'k8s_namespace_name');

	const baseFilters = [
		{
			id: 'workload',
			key: {
				dataType: DataTypes.String,
				id: `${context.workloadNameKey}--string--tag--false`,
				key: context.workloadNameKey,
				type: 'tag',
			},
			op: '=',
			value: context.workloadNameValue,
		},
		{
			id: 'cluster',
			key: {
				dataType: DataTypes.String,
				id: `${k8sClusterNameKey}--string--tag--false`,
				key: k8sClusterNameKey,
				type: 'tag',
			},
			op: '=',
			value: context.clusterName,
		},
		...(context.namespaceName
			? [
					{
						id: 'namespace',
						key: {
							dataType: DataTypes.String,
							id: `${k8sNamespaceNameKey}--string--tag--false`,
							key: k8sNamespaceNameKey,
							type: 'tag',
						},
						op: '=',
						value: context.namespaceName,
					},
				]
			: []),
	];

	const podNameGroupBy = [
		{
			dataType: DataTypes.String,
			id: `${k8sPodNameKey}--string--tag--false`,
			key: k8sPodNameKey,
			type: 'tag',
		},
	];

	const buildSingleMetricQuery = (
		metricKey: string,
		metricId: string,
	): GetQueryResultsProps => ({
		selectedTime: 'GLOBAL_TIME',
		graphType: PANEL_TYPES.TIME_SERIES,
		query: {
			builder: {
				queryData: [
					{
						aggregateAttribute: {
							dataType: DataTypes.Float64,
							id: metricId,
							key: metricKey,
							type: 'Gauge',
						},
						aggregateOperator: 'avg',
						dataSource: DataSource.METRICS,
						disabled: false,
						expression: 'A',
						filters: {
							items: [...baseFilters],
							op: 'AND',
						},
						functions: [],
						groupBy: podNameGroupBy,
						having: [],
						legend: `{{${k8sPodNameKey}}}`,
						limit: null,
						orderBy: [],
						queryName: 'A',
						reduceTo: ReduceOperators.AVG,
						spaceAggregation: 'sum',
						stepInterval: 60,
						timeAggregation: 'avg',
					},
				],
				queryFormulas: [],
				queryTraceOperator: [],
			},
			clickhouse_sql: [{ disabled: false, legend: '', name: 'A', query: '' }],
			id: v4(),
			promql: [{ disabled: false, legend: '', name: 'A', query: '' }],
			queryType: EQueryType.QUERY_BUILDER,
		},
		variables: {},
		formatForWeb: false,
		start,
		end,
	});

	const filesystemUsagePercentQuery: GetQueryResultsProps = {
		selectedTime: 'GLOBAL_TIME',
		graphType: PANEL_TYPES.TIME_SERIES,
		query: {
			builder: {
				queryData: [
					{
						aggregateAttribute: {
							dataType: DataTypes.Float64,
							id: 'fs_usage',
							key: k8sPodFsUsageKey,
							type: 'Gauge',
						},
						aggregateOperator: 'avg',
						dataSource: DataSource.METRICS,
						disabled: true,
						expression: 'A',
						filters: {
							items: [...baseFilters],
							op: 'AND',
						},
						functions: [],
						groupBy: podNameGroupBy,
						having: [],
						legend: `{{${k8sPodNameKey}}}`,
						limit: null,
						orderBy: [],
						queryName: 'A',
						reduceTo: ReduceOperators.AVG,
						spaceAggregation: 'sum',
						stepInterval: 60,
						timeAggregation: 'avg',
					},
					{
						aggregateAttribute: {
							dataType: DataTypes.Float64,
							id: 'fs_capacity',
							key: k8sPodFsCapacityKey,
							type: 'Gauge',
						},
						aggregateOperator: 'avg',
						dataSource: DataSource.METRICS,
						disabled: true,
						expression: 'B',
						filters: {
							items: [...baseFilters],
							op: 'AND',
						},
						functions: [],
						groupBy: podNameGroupBy,
						having: [],
						legend: `{{${k8sPodNameKey}}}`,
						limit: null,
						orderBy: [],
						queryName: 'B',
						reduceTo: ReduceOperators.AVG,
						spaceAggregation: 'sum',
						stepInterval: 60,
						timeAggregation: 'avg',
					},
				],
				queryFormulas: [
					{
						disabled: false,
						expression: 'A/B',
						legend: `{{${k8sPodNameKey}}}`,
						queryName: 'F1',
					},
				],
				queryTraceOperator: [],
			},
			clickhouse_sql: [{ disabled: false, legend: '', name: 'A', query: '' }],
			id: v4(),
			promql: [{ disabled: false, legend: '', name: 'A', query: '' }],
			queryType: EQueryType.QUERY_BUILDER,
		},
		variables: {},
		formatForWeb: false,
		start,
		end,
	};

	return [
		buildSingleMetricQuery(k8sPodCpuLimitUtilKey, 'cpu_limit_util'),
		buildSingleMetricQuery(k8sPodCpuRequestUtilKey, 'cpu_request_util'),
		buildSingleMetricQuery(k8sPodMemLimitUtilKey, 'mem_limit_util'),
		buildSingleMetricQuery(k8sPodMemRequestUtilKey, 'mem_request_util'),
		filesystemUsagePercentQuery,
	];
}
