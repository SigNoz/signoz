/* eslint-disable sonarjs/no-duplicate-string */
import { K8sNamespacesData } from 'api/infraMonitoring/getK8sNamespacesList';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { EQueryType } from 'types/common/dashboard';
import { DataSource, ReduceOperators } from 'types/common/queryBuilder';
import { v4 } from 'uuid';

export const namespaceWidgetInfo = [
	{
		title: 'CPU Usage (cores)',
		yAxisUnit: '',
	},
	{
		title: 'Memory Usage (bytes)',
		yAxisUnit: 'bytes',
	},
	{
		title: 'Pods CPU (top 10)',
		yAxisUnit: '',
	},
	{
		title: 'Pods Memory (top 10)',
		yAxisUnit: 'bytes',
	},
	{
		title: 'Network rate',
		yAxisUnit: 'binBps',
	},
	{
		title: 'Network errors',
		yAxisUnit: '',
	},
	{
		title: 'StatefulSets',
		yAxisUnit: '',
	},
	{
		title: 'ReplicaSets',
		yAxisUnit: '',
	},
	{
		title: 'DaemonSets',
		yAxisUnit: '',
	},
	{
		title: 'Deployments',
		yAxisUnit: '',
	},
];

export const getNamespaceMetricsQueryPayload = (
	namespace: K8sNamespacesData,
	start: number,
	end: number,
): GetQueryResultsProps[] => {
	const k8sPodCpuUtilizationKey = 'k8s.pod.cpu.usage';
	const k8sContainerCpuRequestKey = 'k8s.container.cpu_request';
	const k8sPodMemoryUsageKey = 'k8s.pod.memory.usage';
	const k8sContainerMemoryRequestKey = 'k8s.container.memory_request';
	const k8sPodMemoryWorkingSetKey = 'k8s.pod.memory.working_set';
	const k8sPodMemoryRssKey = 'k8s.pod.memory.rss';
	const k8sPodNetworkIoKey = 'k8s.pod.network.io';
	const k8sPodNetworkErrorsKey = 'k8s.pod.network.errors';
	const k8sStatefulsetCurrentPodsKey = 'k8s.statefulset.current_pods';
	const k8sStatefulsetDesiredPodsKey = 'k8s.statefulset.desired_pods';
	const k8sStatefulsetUpdatedPodsKey = 'k8s.statefulset.updated_pods';
	const k8sReplicasetDesiredKey = 'k8s.replicaset.desired';
	const k8sReplicasetAvailableKey = 'k8s.replicaset.available';
	const k8sDaemonsetDesiredScheduledNamespacesKey =
		'k8s.daemonset.desired.scheduled.namespaces';
	const k8sDaemonsetCurrentScheduledNamespacesKey =
		'k8s.daemonset.current.scheduled.namespaces';
	const k8sDaemonsetReadyNamespacesKey = 'k8s.daemonset.ready.namespaces';
	const k8sDaemonsetMisscheduledNamespacesKey =
		'k8s.daemonset.misscheduled.namespaces';
	const k8sDeploymentDesiredKey = 'k8s.deployment.desired';
	const k8sDeploymentAvailableKey = 'k8s.deployment.available';
	const k8sNamespaceNameKey = 'k8s.namespace.name';
	const k8sPodNameKey = 'k8s.pod.name';
	const k8sStatefulsetNameKey = 'k8s.statefulset.name';
	const k8sReplicasetNameKey = 'k8s.replicaset.name';
	const k8sDaemonsetNameKey = 'k8s.daemonset.name';
	const k8sDeploymentNameKey = 'k8s.deployment.name';

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
								id: k8sPodCpuUtilizationKey,
								key: k8sPodCpuUtilizationKey,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'A',
							filters: {
								items: [
									{
										id: '47b3adae',
										key: {
											dataType: DataTypes.String,
											id: k8sNamespaceNameKey,
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: namespace.namespaceName,
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
								id: k8sContainerCpuRequestKey,
								key: k8sContainerCpuRequestKey,
								type: 'Gauge',
							},
							aggregateOperator: 'latest',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'B',
							filters: {
								items: [
									{
										id: '93d2be5e',
										key: {
											dataType: DataTypes.String,
											id: k8sNamespaceNameKey,
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: namespace.namespaceName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'requests',
							limit: null,
							orderBy: [],
							queryName: 'B',
							reduceTo: ReduceOperators.AVG,
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'latest',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: k8sPodCpuUtilizationKey,
								key: k8sPodCpuUtilizationKey,
								type: 'Gauge',
							},
							aggregateOperator: 'min',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'C',
							filters: {
								items: [
									{
										id: '795eb679',
										key: {
											dataType: DataTypes.String,
											id: k8sNamespaceNameKey,
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: namespace.namespaceName,
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
							queryName: 'C',
							reduceTo: ReduceOperators.AVG,
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'min',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: k8sPodCpuUtilizationKey,
								key: k8sPodCpuUtilizationKey,
								type: 'Gauge',
							},
							aggregateOperator: 'max',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'D',
							filters: {
								items: [
									{
										id: '6792adbe',
										key: {
											dataType: DataTypes.String,
											id: k8sNamespaceNameKey,
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: namespace.namespaceName,
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
							queryName: 'D',
							reduceTo: ReduceOperators.AVG,
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
								id: k8sPodMemoryUsageKey,
								key: k8sPodMemoryUsageKey,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'A',
							filters: {
								items: [
									{
										id: '10011298',
										key: {
											dataType: DataTypes.String,
											id: k8sNamespaceNameKey,
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: namespace.namespaceName,
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
								id: k8sContainerMemoryRequestKey,
								key: k8sContainerMemoryRequestKey,
								type: 'Gauge',
							},
							aggregateOperator: 'latest',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'B',
							filters: {
								items: [
									{
										id: 'ea53b656',
										key: {
											dataType: DataTypes.String,
											id: k8sNamespaceNameKey,
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: namespace.namespaceName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'request',
							limit: null,
							orderBy: [],
							queryName: 'B',
							reduceTo: ReduceOperators.AVG,
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'latest',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: k8sPodMemoryWorkingSetKey,
								key: k8sPodMemoryWorkingSetKey,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'C',
							filters: {
								items: [
									{
										id: '674ace83',
										key: {
											dataType: DataTypes.String,
											id: k8sNamespaceNameKey,
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: namespace.namespaceName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'working set',
							limit: null,
							orderBy: [],
							queryName: 'C',
							reduceTo: ReduceOperators.AVG,
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'avg',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: k8sPodMemoryRssKey,
								key: k8sPodMemoryRssKey,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'D',
							filters: {
								items: [
									{
										id: '187dbdb3',
										key: {
											dataType: DataTypes.String,
											id: k8sNamespaceNameKey,
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: namespace.namespaceName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'rss',
							limit: null,
							orderBy: [],
							queryName: 'D',
							reduceTo: ReduceOperators.AVG,
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'avg',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: k8sPodMemoryUsageKey,
								key: k8sPodMemoryUsageKey,
								type: 'Gauge',
							},
							aggregateOperator: 'min',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'E',
							filters: {
								items: [
									{
										id: 'a3dbf468',
										key: {
											dataType: DataTypes.String,
											id: k8sNamespaceNameKey,
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: namespace.namespaceName,
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
							queryName: 'E',
							reduceTo: ReduceOperators.AVG,
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'min',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: k8sPodMemoryUsageKey,
								key: k8sPodMemoryUsageKey,
								type: 'Gauge',
							},
							aggregateOperator: 'max',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'F',
							filters: {
								items: [
									{
										id: '4b2406c2',
										key: {
											dataType: DataTypes.String,
											id: k8sNamespaceNameKey,
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: namespace.namespaceName,
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
							queryName: 'F',
							reduceTo: ReduceOperators.AVG,
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
								id: k8sPodCpuUtilizationKey,
								key: k8sPodCpuUtilizationKey,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'A',
							filters: {
								items: [
									{
										id: 'c3a73f0a',
										key: {
											dataType: DataTypes.String,
											id: k8sNamespaceNameKey,
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: namespace.namespaceName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: k8sPodNameKey,
									key: k8sPodNameKey,
									type: 'tag',
								},
							],
							having: [],
							legend: `{{${k8sPodNameKey}}}`,
							limit: 20,
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
								id: k8sPodMemoryUsageKey,
								key: k8sPodMemoryUsageKey,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'A',
							filters: {
								items: [
									{
										id: '5cad3379',
										key: {
											dataType: DataTypes.String,
											id: k8sNamespaceNameKey,
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: namespace.namespaceName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: k8sPodNameKey,
									key: k8sPodNameKey,
									type: 'tag',
								},
							],
							having: [],
							legend: `{{${k8sPodNameKey}}}`,
							limit: 10,
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
								id: k8sPodNetworkIoKey,
								key: k8sPodNetworkIoKey,
								type: 'Sum',
							},
							aggregateOperator: 'rate',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'A',
							filters: {
								items: [
									{
										id: '00f5c5e1',
										key: {
											dataType: DataTypes.String,
											id: k8sNamespaceNameKey,
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: namespace.namespaceName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'interface',
									key: 'interface',
									type: 'tag',
								},
								{
									dataType: DataTypes.String,
									id: 'direction',
									key: 'direction',
									type: 'tag',
								},
							],
							having: [],
							legend: '{{direction}} :: {{interface}}',
							limit: null,
							orderBy: [],
							queryName: 'A',
							reduceTo: ReduceOperators.AVG,
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'rate',
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
								dataType: DataTypes.String,
								id: k8sPodNetworkErrorsKey,
								key: k8sPodNetworkErrorsKey,
								type: 'Sum',
							},
							aggregateOperator: 'increase',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'A',
							filters: {
								items: [
									{
										id: '3aa8e064',
										key: {
											dataType: DataTypes.String,
											id: k8sNamespaceNameKey,
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: namespace.namespaceName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'interface',
									key: 'interface',
									type: 'tag',
								},
								{
									dataType: DataTypes.String,
									id: 'direction',
									key: 'direction',
									type: 'tag',
								},
							],
							having: [],
							legend: '{{direction}} :: {{interface}}',
							limit: null,
							orderBy: [],
							queryName: 'A',
							reduceTo: ReduceOperators.AVG,
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'increase',
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
								id: k8sStatefulsetCurrentPodsKey,
								key: k8sStatefulsetCurrentPodsKey,
								type: 'Gauge',
							},
							aggregateOperator: 'latest',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'A',
							filters: {
								items: [
									{
										id: '5f2a55c5',
										key: {
											dataType: DataTypes.String,
											id: k8sStatefulsetNameKey,
											key: k8sStatefulsetNameKey,
											type: 'tag',
										},
										op: '=',
										value: namespace.namespaceName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: k8sStatefulsetNameKey,
									key: k8sStatefulsetNameKey,
									type: 'tag',
								},
							],
							having: [],
							legend: 'current',
							limit: null,
							orderBy: [],
							queryName: 'A',
							reduceTo: ReduceOperators.LAST,
							spaceAggregation: 'max',
							stepInterval: 60,
							timeAggregation: 'latest',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: k8sStatefulsetDesiredPodsKey,
								key: k8sStatefulsetDesiredPodsKey,
								type: 'Gauge',
							},
							aggregateOperator: 'latest',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'B',
							filters: {
								items: [
									{
										id: '13bd7a1d',
										key: {
											dataType: DataTypes.String,
											id: k8sNamespaceNameKey,
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: namespace.namespaceName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: k8sStatefulsetNameKey,
									key: k8sStatefulsetNameKey,
									type: 'tag',
								},
							],
							having: [],
							legend: 'desired',
							limit: null,
							orderBy: [],
							queryName: 'B',
							reduceTo: ReduceOperators.LAST,
							spaceAggregation: 'max',
							stepInterval: 60,
							timeAggregation: 'latest',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: k8sStatefulsetUpdatedPodsKey,
								key: k8sStatefulsetUpdatedPodsKey,
								type: 'Gauge',
							},
							aggregateOperator: 'latest',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'C',
							filters: {
								items: [
									{
										id: '9d287c73',
										key: {
											dataType: DataTypes.String,
											id: k8sNamespaceNameKey,
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: namespace.namespaceName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: k8sStatefulsetNameKey,
									key: k8sStatefulsetNameKey,
									type: 'tag',
								},
							],
							having: [],
							legend: 'updated',
							limit: null,
							orderBy: [],
							queryName: 'C',
							reduceTo: ReduceOperators.LAST,
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
								id: k8sReplicasetDesiredKey,
								key: k8sReplicasetDesiredKey,
								type: 'Gauge',
							},
							aggregateOperator: 'latest',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'A',
							filters: {
								items: [
									{
										id: '0c1e655c',
										key: {
											dataType: DataTypes.String,
											id: k8sNamespaceNameKey,
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: namespace.namespaceName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: k8sReplicasetNameKey,
									key: k8sReplicasetNameKey,
									type: 'tag',
								},
							],
							having: [
								{
									columnName: `MAX(${k8sReplicasetDesiredKey})`,
									op: '>',
									value: 0,
								},
							],
							legend: 'desired',
							limit: null,
							orderBy: [],
							queryName: 'A',
							reduceTo: ReduceOperators.LAST,
							spaceAggregation: 'max',
							stepInterval: 60,
							timeAggregation: 'latest',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: k8sReplicasetAvailableKey,
								key: k8sReplicasetAvailableKey,
								type: 'Gauge',
							},
							aggregateOperator: 'latest',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'B',
							filters: {
								items: [
									{
										id: 'b2296bdb',
										key: {
											dataType: DataTypes.String,
											id: k8sNamespaceNameKey,
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: namespace.namespaceName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: k8sReplicasetNameKey,
									key: k8sReplicasetNameKey,
									type: 'tag',
								},
							],
							having: [
								{
									columnName: `MAX(${k8sReplicasetDesiredKey})`,
									op: '>',
									value: 0,
								},
							],
							legend: 'available',
							limit: null,
							orderBy: [],
							queryName: 'B',
							reduceTo: ReduceOperators.LAST,
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
								id: k8sDaemonsetDesiredScheduledNamespacesKey,
								key: k8sDaemonsetDesiredScheduledNamespacesKey,
								type: 'Gauge',
							},
							aggregateOperator: 'latest',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'A',
							filters: {
								items: [
									{
										id: '2964eb92',
										key: {
											dataType: DataTypes.String,
											id: k8sNamespaceNameKey,
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: namespace.namespaceName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: k8sDaemonsetNameKey,
									key: k8sDaemonsetNameKey,
									type: 'tag',
								},
							],
							having: [],
							legend: 'desired',
							limit: null,
							orderBy: [],
							queryName: 'A',
							reduceTo: ReduceOperators.LAST,
							spaceAggregation: 'max',
							stepInterval: 60,
							timeAggregation: 'latest',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: k8sDaemonsetCurrentScheduledNamespacesKey,
								key: k8sDaemonsetCurrentScheduledNamespacesKey,
								type: 'Gauge',
							},
							aggregateOperator: 'latest',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'B',
							filters: {
								items: [
									{
										id: 'cd324eff',
										key: {
											dataType: DataTypes.String,
											id: k8sNamespaceNameKey,
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: namespace.namespaceName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: k8sDaemonsetNameKey,
									key: k8sDaemonsetNameKey,
									type: 'tag',
								},
							],
							having: [],
							legend: 'current',
							limit: null,
							orderBy: [],
							queryName: 'B',
							reduceTo: ReduceOperators.LAST,
							spaceAggregation: 'max',
							stepInterval: 60,
							timeAggregation: 'latest',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: k8sDaemonsetReadyNamespacesKey,
								key: k8sDaemonsetReadyNamespacesKey,
								type: 'Gauge',
							},
							aggregateOperator: 'latest',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'C',
							filters: {
								items: [
									{
										id: '0416fa6f',
										key: {
											dataType: DataTypes.String,
											id: k8sNamespaceNameKey,
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: namespace.namespaceName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: k8sDaemonsetNameKey,
									key: k8sDaemonsetNameKey,
									type: 'tag',
								},
							],
							having: [],
							legend: 'ready',
							limit: null,
							orderBy: [],
							queryName: 'C',
							reduceTo: ReduceOperators.LAST,
							spaceAggregation: 'max',
							stepInterval: 60,
							timeAggregation: 'latest',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: k8sDaemonsetMisscheduledNamespacesKey,
								key: k8sDaemonsetMisscheduledNamespacesKey,
								type: 'Gauge',
							},
							aggregateOperator: 'latest',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'D',
							filters: {
								items: [
									{
										id: 'c0a126d3',
										key: {
											dataType: DataTypes.String,
											id: k8sNamespaceNameKey,
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: namespace.namespaceName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: k8sDaemonsetNameKey,
									key: k8sDaemonsetNameKey,
									type: 'tag',
								},
							],
							having: [],
							legend: 'misscheduled',
							limit: null,
							orderBy: [],
							queryName: 'D',
							reduceTo: ReduceOperators.LAST,
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
								id: k8sDeploymentDesiredKey,
								key: k8sDeploymentDesiredKey,
								type: 'Gauge',
							},
							aggregateOperator: 'latest',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'A',
							filters: {
								items: [
									{
										id: '9bc659c1',
										key: {
											dataType: DataTypes.String,
											id: k8sNamespaceNameKey,
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: namespace.namespaceName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: k8sDeploymentNameKey,
									key: k8sDeploymentNameKey,
									type: 'tag',
								},
							],
							having: [],
							legend: 'desired',
							limit: null,
							orderBy: [],
							queryName: 'A',
							reduceTo: ReduceOperators.LAST,
							spaceAggregation: 'max',
							stepInterval: 60,
							timeAggregation: 'latest',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: k8sDeploymentAvailableKey,
								key: k8sDeploymentAvailableKey,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'B',
							filters: {
								items: [
									{
										id: 'e1696631',
										key: {
											dataType: DataTypes.String,
											id: k8sNamespaceNameKey,
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: namespace.namespaceName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: k8sDeploymentNameKey,
									key: k8sDeploymentNameKey,
									type: 'tag',
								},
							],
							having: [],
							legend: 'available',
							limit: null,
							orderBy: [],
							queryName: 'B',
							reduceTo: ReduceOperators.LAST,
							spaceAggregation: 'max',
							stepInterval: 60,
							timeAggregation: 'avg',
						},
					],
					queryFormulas: [
						{
							disabled: false,
							expression: 'A/B',
							legend: 'util %',
							queryName: 'F1',
						},
					],
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
			formatForWeb: true,
			start,
			end,
		},
	];
};
