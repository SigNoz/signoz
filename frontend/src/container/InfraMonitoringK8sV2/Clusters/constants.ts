import { InframonitoringtypesClusterRecordDTO } from 'api/generated/services/sigNoz.schemas';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { EQueryType } from 'types/common/dashboard';
import { DataSource, ReduceOperators } from 'types/common/queryBuilder';
import { v4 } from 'uuid';

import {
	K8sDetailsCountConfig,
	K8sDetailsMetadataConfig,
} from '../Base/K8sBaseDetails';
import { formatValueForExpression } from 'components/QueryBuilderV2/utils';
import {
	INFRA_MONITORING_ATTR_KEYS,
	InfraMonitoringEntity,
} from '../constants';
import { SelectedItemParams } from '../hooks';
import {
	buildEventsExpression,
	buildLogsTracesExpression,
} from 'container/InfraMonitoringK8sV2/Base/utils';

export const k8sClusterGetSelectedItemExpression = (
	params: SelectedItemParams,
): string =>
	`${INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME} = ${formatValueForExpression(params.selectedItem ?? '')}`;

export const k8sClusterDetailsMetadataConfig: K8sDetailsMetadataConfig<InframonitoringtypesClusterRecordDTO>[] =
	[{ label: 'Cluster Name', getValue: (p): string => p.clusterName || '' }];

export const k8sClusterDetailsCountsConfig: K8sDetailsCountConfig<InframonitoringtypesClusterRecordDTO>[] =
	[
		{
			label: 'Namespaces',
			getValue: (p): number => p.counts?.namespaces ?? 0,
			targetCategory: InfraMonitoringEntity.NAMESPACES,
		},
		{
			label: 'Nodes',
			getValue: (p): number => p.counts?.nodes ?? 0,
			targetCategory: InfraMonitoringEntity.NODES,
		},
		{
			label: 'Deployments',
			getValue: (p): number => p.counts?.deployments ?? 0,
			targetCategory: InfraMonitoringEntity.DEPLOYMENTS,
		},
		{
			label: 'StatefulSets',
			getValue: (p): number => p.counts?.statefulSets ?? 0,
			targetCategory: InfraMonitoringEntity.STATEFULSETS,
		},
		{
			label: 'DaemonSets',
			getValue: (p): number => p.counts?.daemonSets ?? 0,
			targetCategory: InfraMonitoringEntity.DAEMONSETS,
		},
		{
			label: 'Jobs',
			getValue: (p): number => p.counts?.jobs ?? 0,
			targetCategory: InfraMonitoringEntity.JOBS,
		},
	];

export const k8sClusterInitialEventsExpression = (
	item: InframonitoringtypesClusterRecordDTO,
): string =>
	buildEventsExpression({
		objectKind: 'Cluster',
		objectName: item.clusterName || '',
	});

export const k8sClusterInitialLogTracesExpression = (
	item: InframonitoringtypesClusterRecordDTO,
): string =>
	buildLogsTracesExpression({
		mainAttributeKey: INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME,
		mainAttributeValue: item.clusterName,
	});

export const k8sClusterGetEntityName = (
	item: InframonitoringtypesClusterRecordDTO,
): string => item.clusterName || '';

export const k8sClusterGetCountsFilterExpression = (
	item: InframonitoringtypesClusterRecordDTO,
): string =>
	`${INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME} = ${formatValueForExpression(item.clusterName ?? '')}`;

export const clusterWidgetInfo = [
	{
		title: 'CPU Usage, allocatable',
		yAxisUnit: '',
		docPath:
			'/infrastructure-monitoring/kubernetes/clusters/#cpu-usage-allocatable',
	},
	{
		title: 'Memory Usage, allocatable',
		yAxisUnit: 'bytes',
		docPath:
			'/infrastructure-monitoring/kubernetes/clusters/#memory-usage-allocatable',
	},
	{
		title: 'Ready Nodes',
		yAxisUnit: '',
		docPath: '/infrastructure-monitoring/kubernetes/clusters/#ready-nodes',
	},
	{
		title: 'NotReady Nodes',
		yAxisUnit: '',
		docPath: '/infrastructure-monitoring/kubernetes/clusters/#notready-nodes',
	},
	{
		title: 'Deployments available and desired',
		yAxisUnit: '',
		docPath:
			'/infrastructure-monitoring/kubernetes/clusters/#deployments-available-and-desired',
	},
	{
		title: 'Statefulset pods',
		yAxisUnit: '',
		docPath: '/infrastructure-monitoring/kubernetes/clusters/#statefulset-pods',
	},
	{
		title: 'Daemonset nodes',
		yAxisUnit: '',
		docPath: '/infrastructure-monitoring/kubernetes/clusters/#daemonset-nodes',
	},
	{
		title: 'Jobs',
		yAxisUnit: '',
		docPath: '/infrastructure-monitoring/kubernetes/clusters/#jobs',
	},
];

export const getClusterMetricsQueryPayload = (
	cluster: InframonitoringtypesClusterRecordDTO,
	start: number,
	end: number,
): GetQueryResultsProps[] => {
	return [
		{
			selectedTime: 'GLOBAL_TIME',
			graphType: PANEL_TYPES.TIME_SERIES,
			query: {
				builder: {
					queryData: [
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'k8s_pod_cpu_usage--float64--Gauge--true',
								key: INFRA_MONITORING_ATTR_KEYS.K8S_POD_CPU_USAGE,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'A',
							filters: {
								items: [
									{
										id: '0224c582',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_cluster_name--string--tag--false',
											key: INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME,
											type: 'tag',
										},
										op: '=',
										value: cluster.clusterName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'usage (avg)',
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
								id: 'k8s_pod_cpu_usage--float64--Gauge--true',
								key: INFRA_MONITORING_ATTR_KEYS.K8S_POD_CPU_USAGE,
								type: 'Gauge',
							},
							aggregateOperator: 'min',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'B',
							filters: {
								items: [
									{
										id: 'a0e11f0c',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_cluster_name--string--tag--false',
											key: INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME,
											type: 'tag',
										},
										op: '=',
										value: cluster.clusterName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'usage (min)',
							limit: null,
							orderBy: [],
							queryName: 'B',
							reduceTo: ReduceOperators.AVG,
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'min',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'k8s_pod_cpu_usage--float64--Gauge--true',
								key: INFRA_MONITORING_ATTR_KEYS.K8S_POD_CPU_USAGE,
								type: 'Gauge',
							},
							aggregateOperator: 'max',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'C',
							filters: {
								items: [
									{
										id: 'c775629c',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_cluster_name--string--tag--false',
											key: INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME,
											type: 'tag',
										},
										op: '=',
										value: cluster.clusterName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'usage (max)',
							limit: null,
							orderBy: [],
							queryName: 'C',
							reduceTo: ReduceOperators.AVG,
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'max',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'k8s_node_allocatable_cpu--float64--Gauge--true',
								key: INFRA_MONITORING_ATTR_KEYS.K8S_NODE_ALLOCATABLE_CPU,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'D',
							filters: {
								items: [
									{
										id: '31f6c43a',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_cluster_name--string--tag--false',
											key: INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME,
											type: 'tag',
										},
										op: '=',
										value: cluster.clusterName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'allocatable',
							limit: null,
							orderBy: [],
							queryName: 'D',
							reduceTo: ReduceOperators.AVG,
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'avg',
						},
					],
					queryFormulas: [],
					queryTraceOperator: [],
				},
				clickhouse_sql: [
					{
						disabled: false,
						legend: '',
						name: 'A',
						query: '',
					},
				],
				id: v4(),
				promql: [
					{
						disabled: false,
						legend: '',
						name: 'A',
						query: '',
					},
				],
				queryType: EQueryType.QUERY_BUILDER,
			},
			variables: {},
			formatForWeb: false,
			start,
			end,
		},
		{
			selectedTime: 'GLOBAL_TIME',
			graphType: PANEL_TYPES.TIME_SERIES,
			query: {
				builder: {
					queryData: [
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'k8s_pod_memory_usage--float64--Gauge--true',
								key: INFRA_MONITORING_ATTR_KEYS.K8S_POD_MEMORY_USAGE,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'A',
							filters: {
								items: [
									{
										id: '61a3c55e',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_cluster_name--string--tag--false',
											key: INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME,
											type: 'tag',
										},
										op: '=',
										value: cluster.clusterName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'usage (avg)',
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
								id: 'k8s_pod_memory_usage--float64--Gauge--true',
								key: INFRA_MONITORING_ATTR_KEYS.K8S_POD_MEMORY_USAGE,
								type: 'Gauge',
							},
							aggregateOperator: 'min',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'B',
							filters: {
								items: [
									{
										id: '834a887f',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_cluster_name--string--tag--false',
											key: INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME,
											type: 'tag',
										},
										op: '=',
										value: cluster.clusterName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'usage (min)',
							limit: null,
							orderBy: [],
							queryName: 'B',
							reduceTo: ReduceOperators.AVG,
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'min',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'k8s_pod_memory_usage--float64--Gauge--true',
								key: INFRA_MONITORING_ATTR_KEYS.K8S_POD_MEMORY_USAGE,
								type: 'Gauge',
							},
							aggregateOperator: 'max',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'C',
							filters: {
								items: [
									{
										id: '9b002160',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_cluster_name--string--tag--false',
											key: INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME,
											type: 'tag',
										},
										op: '=',
										value: cluster.clusterName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'usage (max)',
							limit: null,
							orderBy: [],
							queryName: 'C',
							reduceTo: ReduceOperators.AVG,
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'max',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'k8s_node_allocatable_memory--float64--Gauge--true',
								key: INFRA_MONITORING_ATTR_KEYS.K8S_NODE_ALLOCATABLE_MEMORY,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'D',
							filters: {
								items: [
									{
										id: '02a9a67e',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_cluster_name--string--tag--false',
											key: INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME,
											type: 'tag',
										},
										op: '=',
										value: cluster.clusterName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'allocatable',
							limit: null,
							orderBy: [],
							queryName: 'D',
							reduceTo: ReduceOperators.AVG,
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'avg',
						},
					],
					queryFormulas: [],
					queryTraceOperator: [],
				},
				clickhouse_sql: [
					{
						disabled: false,
						legend: '',
						name: 'A',
						query: '',
					},
				],
				id: v4(),
				promql: [
					{
						disabled: false,
						legend: '',
						name: 'A',
						query: '',
					},
				],
				queryType: EQueryType.QUERY_BUILDER,
			},
			variables: {},
			formatForWeb: false,
			start,
			end,
		},
		{
			selectedTime: 'GLOBAL_TIME',
			graphType: PANEL_TYPES.TIME_SERIES,
			query: {
				builder: {
					queryData: [
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'k8s_node_condition_ready--float64--Gauge--true',
								key: INFRA_MONITORING_ATTR_KEYS.K8S_NODE_CONDITION_READY,
								type: 'Gauge',
							},
							aggregateOperator: 'latest',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'A',
							filters: {
								items: [
									{
										id: 'd7779183',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_cluster_name--string--tag--false',
											key: INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME,
											type: 'tag',
										},
										op: '=',
										value: cluster.clusterName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'k8s_node_name--string--tag--false',
									key: INFRA_MONITORING_ATTR_KEYS.K8S_NODE_NAME,
									type: 'tag',
								},
							],
							having: [
								{
									columnName: `MAX(${INFRA_MONITORING_ATTR_KEYS.K8S_NODE_CONDITION_READY})`,
									op: '=',
									value: 1,
								},
							],
							legend: `{{${INFRA_MONITORING_ATTR_KEYS.K8S_NODE_NAME}}}`,
							limit: null,
							orderBy: [],
							queryName: 'A',
							reduceTo: ReduceOperators.AVG,
							spaceAggregation: 'max',
							stepInterval: 60,
							timeAggregation: 'latest',
						},
					],
					queryFormulas: [],
					queryTraceOperator: [],
				},
				clickhouse_sql: [
					{
						disabled: false,
						legend: '',
						name: 'A',
						query: '',
					},
				],
				id: v4(),
				promql: [
					{
						disabled: false,
						legend: '',
						name: 'A',
						query: '',
					},
				],
				queryType: EQueryType.QUERY_BUILDER,
			},
			variables: {},
			formatForWeb: false,
			start,
			end,
		},
		{
			selectedTime: 'GLOBAL_TIME',
			graphType: PANEL_TYPES.TIME_SERIES,
			query: {
				builder: {
					queryData: [
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'k8s_node_condition_ready--float64--Gauge--true',
								key: INFRA_MONITORING_ATTR_KEYS.K8S_NODE_CONDITION_READY,
								type: 'Gauge',
							},
							aggregateOperator: 'latest',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'A',
							filters: {
								items: [
									{
										id: 'd7779183',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_cluster_name--string--tag--false',
											key: INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME,
											type: 'tag',
										},
										op: '=',
										value: cluster.clusterName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'k8s_node_name--string--tag--false',
									key: INFRA_MONITORING_ATTR_KEYS.K8S_NODE_NAME,
									type: 'tag',
								},
							],
							having: [
								{
									columnName: `MAX(${INFRA_MONITORING_ATTR_KEYS.K8S_NODE_CONDITION_READY})`,
									op: '=',
									value: 0,
								},
							],
							legend: `{{${INFRA_MONITORING_ATTR_KEYS.K8S_NODE_NAME}}}`,
							limit: null,
							orderBy: [],
							queryName: 'A',
							reduceTo: ReduceOperators.AVG,
							spaceAggregation: 'max',
							stepInterval: 60,
							timeAggregation: 'latest',
						},
					],
					queryFormulas: [],
					queryTraceOperator: [],
				},
				clickhouse_sql: [
					{
						disabled: false,
						legend: '',
						name: 'A',
						query: '',
					},
				],
				id: v4(),
				promql: [
					{
						disabled: false,
						legend: '',
						name: 'A',
						query: '',
					},
				],
				queryType: EQueryType.QUERY_BUILDER,
			},
			variables: {},
			formatForWeb: false,
			start,
			end,
		},
		{
			selectedTime: 'GLOBAL_TIME',
			graphType: PANEL_TYPES.TABLE,
			query: {
				builder: {
					queryData: [
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'k8s_deployment_available--float64--Gauge--true',
								key: INFRA_MONITORING_ATTR_KEYS.K8S_DEPLOYMENT_AVAILABLE,
								type: 'Gauge',
							},
							aggregateOperator: 'latest',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'A',
							filters: {
								items: [
									{
										id: 'a7da59c7',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_cluster_name--string--tag--false',
											key: INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME,
											type: 'tag',
										},
										op: '=',
										value: cluster.clusterName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'k8s_deployment_name--string--tag--false',
									key: INFRA_MONITORING_ATTR_KEYS.K8S_DEPLOYMENT_NAME,
									type: 'tag',
								},
								{
									dataType: DataTypes.String,
									id: 'k8s_namespace_name--string--tag--false',
									key: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
									type: 'tag',
								},
							],
							having: [],
							legend: 'available',
							limit: null,
							orderBy: [],
							queryName: 'A',
							reduceTo: ReduceOperators.LAST,
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'latest',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'k8s_deployment_desired--float64--Gauge--true',
								key: INFRA_MONITORING_ATTR_KEYS.K8S_DEPLOYMENT_DESIRED,
								type: 'Gauge',
							},
							aggregateOperator: 'latest',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'B',
							filters: {
								items: [
									{
										id: '55110885',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_cluster_name--string--tag--false',
											key: INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME,
											type: 'tag',
										},
										op: '=',
										value: cluster.clusterName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'k8s_deployment_name--string--tag--false',
									key: INFRA_MONITORING_ATTR_KEYS.K8S_DEPLOYMENT_NAME,
									type: 'tag',
								},
								{
									dataType: DataTypes.String,
									id: 'k8s_namespace_name--string--tag--false',
									key: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
									type: 'tag',
								},
							],
							having: [],
							legend: 'desired',
							limit: null,
							orderBy: [],
							queryName: 'B',
							reduceTo: ReduceOperators.LAST,
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'latest',
						},
					],
					queryFormulas: [],
					queryTraceOperator: [],
				},
				clickhouse_sql: [
					{
						disabled: false,
						legend: '',
						name: 'A',
						query: '',
					},
					{
						disabled: false,
						legend: '',
						name: 'B',
						query: '',
					},
				],
				id: v4(),
				promql: [
					{
						disabled: false,
						legend: '',
						name: 'A',
						query: '',
					},
					{
						disabled: false,
						legend: '',
						name: 'B',
						query: '',
					},
				],
				queryType: EQueryType.QUERY_BUILDER,
			},
			variables: {},
			formatForWeb: true,
			start,
			end,
		},
		{
			selectedTime: 'GLOBAL_TIME',
			graphType: PANEL_TYPES.TABLE,
			query: {
				builder: {
					queryData: [
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'k8s_statefulset_current_pods--float64--Gauge--true',
								key: INFRA_MONITORING_ATTR_KEYS.K8S_STATEFULSET_CURRENT_PODS,
								type: 'Gauge',
							},
							aggregateOperator: 'max',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'A',
							filters: {
								items: [
									{
										id: '3c57b4d1',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_cluster_name--string--tag--false',
											key: INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME,
											type: 'tag',
										},
										op: '=',
										value: cluster.clusterName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'k8s_statefulset_name--string--tag--false',
									key: INFRA_MONITORING_ATTR_KEYS.K8S_STATEFULSET_NAME,
									type: 'tag',
								},
								{
									dataType: DataTypes.String,
									id: 'k8s_namespace_name--string--tag--false',
									key: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
									type: 'tag',
								},
							],
							having: [],
							legend: 'current',
							limit: null,
							orderBy: [],
							queryName: 'A',
							reduceTo: ReduceOperators.LAST,
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'max',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'k8s_statefulset_desired_pods--float64--Gauge--true',
								key: INFRA_MONITORING_ATTR_KEYS.K8S_STATEFULSET_DESIRED_PODS,
								type: 'Gauge',
							},
							aggregateOperator: 'max',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'B',
							filters: {
								items: [
									{
										id: '0f49fe64',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_cluster_name--string--tag--false',
											key: INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME,
											type: 'tag',
										},
										op: '=',
										value: cluster.clusterName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'k8s_statefulset_name--string--tag--false',
									key: INFRA_MONITORING_ATTR_KEYS.K8S_STATEFULSET_NAME,
									type: 'tag',
								},
								{
									dataType: DataTypes.String,
									id: 'k8s_namespace_name--string--tag--false',
									key: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
									type: 'tag',
								},
							],
							having: [],
							legend: 'desired',
							limit: null,
							orderBy: [],
							queryName: 'B',
							reduceTo: ReduceOperators.LAST,
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'max',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'k8s_statefulset_ready_pods--float64--Gauge--true',
								key: INFRA_MONITORING_ATTR_KEYS.K8S_STATEFULSET_READY_PODS,
								type: 'Gauge',
							},
							aggregateOperator: 'max',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'C',
							filters: {
								items: [
									{
										id: '0bebf625',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_cluster_name--string--tag--false',
											key: INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME,
											type: 'tag',
										},
										op: '=',
										value: cluster.clusterName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'k8s_statefulset_name--string--tag--false',
									key: INFRA_MONITORING_ATTR_KEYS.K8S_STATEFULSET_NAME,
									type: 'tag',
								},
								{
									dataType: DataTypes.String,
									id: 'k8s_namespace_name--string--tag--false',
									key: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
									type: 'tag',
								},
							],
							having: [],
							legend: 'ready',
							limit: null,
							orderBy: [],
							queryName: 'C',
							reduceTo: ReduceOperators.LAST,
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'max',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'k8s_statefulset_updated_pods--float64--Gauge--true',
								key: INFRA_MONITORING_ATTR_KEYS.K8S_STATEFULSET_UPDATED_PODS,
								type: 'Gauge',
							},
							aggregateOperator: 'max',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'D',
							filters: {
								items: [
									{
										id: '1ddacbbe',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_cluster_name--string--tag--false',
											key: INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME,
											type: 'tag',
										},
										op: '=',
										value: cluster.clusterName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'k8s_statefulset_name--string--tag--false',
									key: INFRA_MONITORING_ATTR_KEYS.K8S_STATEFULSET_NAME,
									type: 'tag',
								},
								{
									dataType: DataTypes.String,
									id: 'k8s_namespace_name--string--tag--false',
									key: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
									type: 'tag',
								},
							],
							having: [],
							legend: 'updated',
							limit: null,
							orderBy: [],
							queryName: 'D',
							reduceTo: ReduceOperators.LAST,
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'max',
						},
					],
					queryFormulas: [],
					queryTraceOperator: [],
				},
				clickhouse_sql: [
					{
						disabled: false,
						legend: '',
						name: 'A',
						query: '',
					},
					{
						disabled: false,
						legend: '',
						name: 'B',
						query: '',
					},
					{
						disabled: false,
						legend: '',
						name: 'C',
						query: '',
					},
					{
						disabled: false,
						legend: '',
						name: 'D',
						query: '',
					},
				],
				id: v4(),
				promql: [
					{
						disabled: false,
						legend: '',
						name: 'A',
						query: '',
					},
					{
						disabled: false,
						legend: '',
						name: 'B',
						query: '',
					},
					{
						disabled: false,
						legend: '',
						name: 'C',
						query: '',
					},
					{
						disabled: false,
						legend: '',
						name: 'D',
						query: '',
					},
				],
				queryType: EQueryType.QUERY_BUILDER,
			},
			variables: {},
			formatForWeb: true,
			start,
			end,
		},
		{
			selectedTime: 'GLOBAL_TIME',
			graphType: PANEL_TYPES.TABLE,
			query: {
				builder: {
					queryData: [
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'k8s_daemonset_current_scheduled_nodes--float64--Gauge--true',
								key: INFRA_MONITORING_ATTR_KEYS.K8S_DAEMONSET_CURRENT_SCHEDULED_NODES,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'A',
							filters: {
								items: [
									{
										id: 'e0bea554',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_cluster_name--string--tag--false',
											key: INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME,
											type: 'tag',
										},
										op: '=',
										value: cluster.clusterName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'k8s_daemonset_name--string--tag--false',
									key: INFRA_MONITORING_ATTR_KEYS.K8S_DAEMONSET_NAME,
									type: 'tag',
								},
							],
							having: [],
							legend: 'current_nodes',
							limit: null,
							orderBy: [],
							queryName: 'A',
							reduceTo: ReduceOperators.LAST,
							spaceAggregation: 'avg',
							stepInterval: 60,
							timeAggregation: 'avg',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'k8s_daemonset_desired_scheduled_nodes--float64--Gauge--true',
								key: INFRA_MONITORING_ATTR_KEYS.K8S_DAEMONSET_DESIRED_SCHEDULED_NODES,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'B',
							filters: {
								items: [
									{
										id: '741052f7',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_cluster_name--string--tag--false',
											key: INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME,
											type: 'tag',
										},
										op: '=',
										value: cluster.clusterName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'k8s_daemonset_name--string--tag--false',
									key: INFRA_MONITORING_ATTR_KEYS.K8S_DAEMONSET_NAME,
									type: 'tag',
								},
							],
							having: [],
							legend: 'desired_nodes',
							limit: null,
							orderBy: [],
							queryName: 'B',
							reduceTo: ReduceOperators.LAST,
							spaceAggregation: 'avg',
							stepInterval: 60,
							timeAggregation: 'avg',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'k8s_daemonset_ready_nodes--float64--Gauge--true',
								key: INFRA_MONITORING_ATTR_KEYS.K8S_DAEMONSET_READY_NODES,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'C',
							filters: {
								items: [
									{
										id: 'f23759f2',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_cluster_name--string--tag--false',
											key: INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME,
											type: 'tag',
										},
										op: '=',
										value: cluster.clusterName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'k8s_daemonset_name--string--tag--false',
									key: INFRA_MONITORING_ATTR_KEYS.K8S_DAEMONSET_NAME,
									type: 'tag',
								},
							],
							having: [],
							legend: 'ready_nodes',
							limit: null,
							orderBy: [],
							queryName: 'C',
							reduceTo: ReduceOperators.LAST,
							spaceAggregation: 'avg',
							stepInterval: 60,
							timeAggregation: 'avg',
						},
					],
					queryFormulas: [],
					queryTraceOperator: [],
				},
				clickhouse_sql: [
					{
						disabled: false,
						legend: '',
						name: 'A',
						query: '',
					},
					{
						disabled: false,
						legend: '',
						name: 'B',
						query: '',
					},
					{
						disabled: false,
						legend: '',
						name: 'C',
						query: '',
					},
				],
				id: v4(),
				promql: [
					{
						disabled: false,
						legend: '',
						name: 'A',
						query: '',
					},
					{
						disabled: false,
						legend: '',
						name: 'B',
						query: '',
					},
					{
						disabled: false,
						legend: '',
						name: 'C',
						query: '',
					},
				],
				queryType: EQueryType.QUERY_BUILDER,
			},
			variables: {},
			formatForWeb: true,
			start,
			end,
		},
		{
			selectedTime: 'GLOBAL_TIME',
			graphType: PANEL_TYPES.TABLE,
			query: {
				builder: {
					queryData: [
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'k8s_job_active_pods--float64--Gauge--true',
								key: INFRA_MONITORING_ATTR_KEYS.K8S_JOB_ACTIVE_PODS,
								type: 'Gauge',
							},
							aggregateOperator: 'max',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'A',
							filters: {
								items: [
									{
										id: 'fd485d85',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_cluster_name--string--tag--false',
											key: INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME,
											type: 'tag',
										},
										op: '=',
										value: cluster.clusterName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'k8s_job_name--string--tag--false',
									key: INFRA_MONITORING_ATTR_KEYS.K8S_JOB_NAME,
									type: 'tag',
								},
								{
									dataType: DataTypes.String,
									id: 'k8s_namespace_name--string--tag--false',
									key: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
									type: 'tag',
								},
							],
							having: [],
							legend: 'running',
							limit: null,
							orderBy: [],
							queryName: 'A',
							reduceTo: ReduceOperators.LAST,
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'max',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'k8s_job_successful_pods--float64--Gauge--true',
								key: INFRA_MONITORING_ATTR_KEYS.K8S_JOB_SUCCESSFUL_PODS,
								type: 'Gauge',
							},
							aggregateOperator: 'max',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'B',
							filters: {
								items: [
									{
										id: 'fc1beb81',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_cluster_name--string--tag--false',
											key: INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME,
											type: 'tag',
										},
										op: '=',
										value: cluster.clusterName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'k8s_job_name--string--tag--false',
									key: INFRA_MONITORING_ATTR_KEYS.K8S_JOB_NAME,
									type: 'tag',
								},
								{
									dataType: DataTypes.String,
									id: 'k8s_namespace_name--string--tag--false',
									key: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
									type: 'tag',
								},
							],
							having: [],
							legend: 'successful',
							limit: null,
							orderBy: [],
							queryName: 'B',
							reduceTo: ReduceOperators.LAST,
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'max',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'k8s_job_failed_pods--float64--Gauge--true',
								key: INFRA_MONITORING_ATTR_KEYS.K8S_JOB_FAILED_PODS,
								type: 'Gauge',
							},
							aggregateOperator: 'max',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'C',
							filters: {
								items: [
									{
										id: '97773348',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_cluster_name--string--tag--false',
											key: INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME,
											type: 'tag',
										},
										op: '=',
										value: cluster.clusterName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'k8s_job_name--string--tag--false',
									key: INFRA_MONITORING_ATTR_KEYS.K8S_JOB_NAME,
									type: 'tag',
								},
								{
									dataType: DataTypes.String,
									id: 'k8s_namespace_name--string--tag--false',
									key: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
									type: 'tag',
								},
							],
							having: [],
							legend: 'failed',
							limit: null,
							orderBy: [],
							queryName: 'C',
							reduceTo: ReduceOperators.LAST,
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'max',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'k8s_job_desired_successful_pods--float64--Gauge--true',
								key: INFRA_MONITORING_ATTR_KEYS.K8S_JOB_DESIRED_SUCCESSFUL_PODS,
								type: 'Gauge',
							},
							aggregateOperator: 'max',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'D',
							filters: {
								items: [
									{
										id: '5911618b',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_cluster_name--string--tag--false',
											key: INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME,
											type: 'tag',
										},
										op: '=',
										value: cluster.clusterName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'k8s_job_name--string--tag--false',
									key: INFRA_MONITORING_ATTR_KEYS.K8S_JOB_NAME,
									type: 'tag',
								},
								{
									dataType: DataTypes.String,
									id: 'k8s_namespace_name--string--tag--false',
									key: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
									type: 'tag',
								},
							],
							having: [],
							legend: 'desired successful',
							limit: null,
							orderBy: [],
							queryName: 'D',
							reduceTo: ReduceOperators.LAST,
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'max',
						},
					],
					queryFormulas: [],
					queryTraceOperator: [],
				},
				clickhouse_sql: [
					{
						disabled: false,
						legend: '',
						name: 'A',
						query: '',
					},
					{
						disabled: false,
						legend: '',
						name: 'B',
						query: '',
					},
					{
						disabled: false,
						legend: '',
						name: 'C',
						query: '',
					},
					{
						disabled: false,
						legend: '',
						name: 'D',
						query: '',
					},
				],
				id: v4(),
				promql: [
					{
						disabled: false,
						legend: '',
						name: 'A',
						query: '',
					},
					{
						disabled: false,
						legend: '',
						name: 'B',
						query: '',
					},
					{
						disabled: false,
						legend: '',
						name: 'C',
						query: '',
					},
					{
						disabled: false,
						legend: '',
						name: 'D',
						query: '',
					},
				],
				queryType: EQueryType.QUERY_BUILDER,
			},
			variables: {},
			formatForWeb: true,
			start,
			end,
		},
	];
};
