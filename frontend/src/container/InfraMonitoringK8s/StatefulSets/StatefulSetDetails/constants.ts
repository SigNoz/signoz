/* eslint-disable sonarjs/no-duplicate-string */
import { K8sStatefulSetsData } from 'api/infraMonitoring/getsK8sStatefulSetsList';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';
import { v4 } from 'uuid';

export const statefulSetWidgetInfo = [
	{
		title: 'CPU usage, request, limits',
		yAxisUnit: '',
	},
	{
		title: 'CPU request, limit util (%)',
		yAxisUnit: 'percentunit',
	},
	{
		title: 'Memory usage, request, limits',
		yAxisUnit: 'bytes',
	},
	{
		title: 'Memory request, limit util (%)',
		yAxisUnit: 'percentunit',
	},
	{
		title: 'Network IO',
		yAxisUnit: 'binBps',
	},
	{
		title: 'Network errors count',
		yAxisUnit: '',
	},
];

export const getStatefulSetMetricsQueryPayload = (
	statefulSet: K8sStatefulSetsData,
	start: number,
	end: number,
	dotMetricsEnabled: boolean,
): GetQueryResultsProps[] => {
	const k8sStatefulSetNameKey = dotMetricsEnabled
		? 'k8s.statefulset.name'
		: 'k8s_statefulset_name';
	const k8sNamespaceNameKey = dotMetricsEnabled
		? 'k8s.namespace.name'
		: 'k8s_namespace_name';
	const k8sPodNameKey = dotMetricsEnabled ? 'k8s.pod.name' : 'k8s_pod_name';

	const k8sPodCpuUtilKey = dotMetricsEnabled
		? 'k8s.pod.cpu.usage'
		: 'k8s_pod_cpu_usage';
	const k8sContainerCpuRequestKey = dotMetricsEnabled
		? 'k8s.container.cpu_request'
		: 'k8s_container_cpu_request';
	const k8sContainerCpuLimitKey = dotMetricsEnabled
		? 'k8s.container.cpu_limit'
		: 'k8s_container_cpu_limit';
	const k8sPodCpuReqUtilKey = dotMetricsEnabled
		? 'k8s.pod.cpu_request_utilization'
		: 'k8s_pod_cpu_request_utilization';
	const k8sPodCpuLimitUtilKey = dotMetricsEnabled
		? 'k8s.pod.cpu_limit_utilization'
		: 'k8s_pod_cpu_limit_utilization';

	const k8sPodMemUsageKey = dotMetricsEnabled
		? 'k8s.pod.memory.usage'
		: 'k8s_pod_memory_usage';
	const k8sContainerMemRequestKey = dotMetricsEnabled
		? 'k8s.container.memory_request'
		: 'k8s_container_memory_request';
	const k8sContainerMemLimitKey = dotMetricsEnabled
		? 'k8s.container.memory_limit'
		: 'k8s_container_memory_limit';
	const k8sPodMemReqUtilKey = dotMetricsEnabled
		? 'k8s.pod.memory_request_utilization'
		: 'k8s_pod_memory_request_utilization';
	const k8sPodMemLimitUtilKey = dotMetricsEnabled
		? 'k8s.pod.memory_limit_utilization'
		: 'k8s_pod_memory_limit_utilization';

	const k8sPodNetworkIoKey = dotMetricsEnabled
		? 'k8s.pod.network.io'
		: 'k8s_pod_network_io';
	const k8sPodNetworkErrorsKey = dotMetricsEnabled
		? 'k8s.pod.network.errors'
		: 'k8s_pod_network_errors';

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
								id: 'cpu_usage',
								key: k8sPodCpuUtilKey,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'A',
							filters: {
								items: [
									{
										id: 'f1',
										key: {
											dataType: DataTypes.String,
											id: 'ss_name',
											key: k8sStatefulSetNameKey,
											type: 'tag',
										},
										op: '=',
										value: statefulSet.meta.k8s_statefulset_name,
									},
									{
										id: 'f2',
										key: {
											dataType: DataTypes.String,
											id: 'ns_name',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: statefulSet.meta.k8s_namespace_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'usage',
							limit: null,
							orderBy: [],
							queryName: 'A',
							reduceTo: 'avg',
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'avg',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'cpu_request',
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
										id: 'f3',
										key: {
											dataType: DataTypes.String,
											id: 'pod_name',
											key: k8sPodNameKey,
											type: 'tag',
										},
										op: 'contains',
										value: statefulSet.meta.k8s_statefulset_name,
									},
									{
										id: 'f2',
										key: {
											dataType: DataTypes.String,
											id: 'ns_name',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: statefulSet.meta.k8s_namespace_name,
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
							reduceTo: 'avg',
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'latest',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'cpu_limit',
								key: k8sContainerCpuLimitKey,
								type: 'Gauge',
							},
							aggregateOperator: 'latest',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'C',
							filters: {
								items: [
									{
										id: 'f4',
										key: {
											dataType: DataTypes.String,
											id: 'pod_name',
											key: k8sPodNameKey,
											type: 'tag',
										},
										op: 'contains',
										value: statefulSet.meta.k8s_statefulset_name,
									},
									{
										id: 'f2',
										key: {
											dataType: DataTypes.String,
											id: 'ns_name',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: statefulSet.meta.k8s_namespace_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'limits',
							limit: null,
							orderBy: [],
							queryName: 'C',
							reduceTo: 'avg',
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'latest',
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
								id: 'cpu_req_util',
								key: k8sPodCpuReqUtilKey,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'A',
							filters: {
								items: [
									{
										id: 'f1',
										key: {
											dataType: DataTypes.String,
											id: 'ss_name',
											key: k8sStatefulSetNameKey,
											type: 'tag',
										},
										op: '=',
										value: statefulSet.meta.k8s_statefulset_name,
									},
									{
										id: 'f2',
										key: {
											dataType: DataTypes.String,
											id: 'ns_name',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: statefulSet.meta.k8s_namespace_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'Reqs util %',
							limit: null,
							orderBy: [],
							queryName: 'A',
							reduceTo: 'avg',
							spaceAggregation: 'avg',
							stepInterval: 60,
							timeAggregation: 'avg',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'cpu_limit_util',
								key: k8sPodCpuLimitUtilKey,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'B',
							filters: {
								items: [
									{
										id: 'f1',
										key: {
											dataType: DataTypes.String,
											id: 'ss_name',
											key: k8sStatefulSetNameKey,
											type: 'tag',
										},
										op: '=',
										value: statefulSet.meta.k8s_statefulset_name,
									},
									{
										id: 'f2',
										key: {
											dataType: DataTypes.String,
											id: 'ns_name',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: statefulSet.meta.k8s_namespace_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'Limit util %',
							limit: null,
							orderBy: [],
							queryName: 'B',
							reduceTo: 'avg',
							spaceAggregation: 'avg',
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
								id: 'mem_usage',
								key: k8sPodMemUsageKey,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'A',
							filters: {
								items: [
									{
										id: 'f1',
										key: {
											dataType: DataTypes.String,
											id: 'ss_name',
											key: k8sStatefulSetNameKey,
											type: 'tag',
										},
										op: '=',
										value: statefulSet.meta.k8s_statefulset_name,
									},
									{
										id: 'f2',
										key: {
											dataType: DataTypes.String,
											id: 'ns_name',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: statefulSet.meta.k8s_namespace_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'usage',
							limit: null,
							orderBy: [],
							queryName: 'A',
							reduceTo: 'avg',
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'avg',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'mem_request',
								key: k8sContainerMemRequestKey,
								type: 'Gauge',
							},
							aggregateOperator: 'latest',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'B',
							filters: {
								items: [
									{
										id: 'f3',
										key: {
											dataType: DataTypes.String,
											id: 'pod_name',
											key: k8sPodNameKey,
											type: 'tag',
										},
										op: 'contains',
										value: statefulSet.meta.k8s_statefulset_name,
									},
									{
										id: 'f2',
										key: {
											dataType: DataTypes.String,
											id: 'ns_name',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: statefulSet.meta.k8s_namespace_name,
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
							reduceTo: 'avg',
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'latest',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'mem_limit',
								key: k8sContainerMemLimitKey,
								type: 'Gauge',
							},
							aggregateOperator: 'latest',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'C',
							filters: {
								items: [
									{
										id: 'f4',
										key: {
											dataType: DataTypes.String,
											id: 'pod_name',
											key: k8sPodNameKey,
											type: 'tag',
										},
										op: 'contains',
										value: statefulSet.meta.k8s_statefulset_name,
									},
									{
										id: 'f2',
										key: {
											dataType: DataTypes.String,
											id: 'ns_name',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: statefulSet.meta.k8s_namespace_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'limits',
							limit: null,
							orderBy: [],
							queryName: 'C',
							reduceTo: 'avg',
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'latest',
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
								id: 'mem_req_util',
								key: k8sPodMemReqUtilKey,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'A',
							filters: {
								items: [
									{
										id: 'f1',
										key: {
											dataType: DataTypes.String,
											id: 'ss_name',
											key: k8sStatefulSetNameKey,
											type: 'tag',
										},
										op: '=',
										value: statefulSet.meta.k8s_statefulset_name,
									},
									{
										id: 'f2',
										key: {
											dataType: DataTypes.String,
											id: 'ns_name',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: statefulSet.meta.k8s_namespace_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'Reqs util %',
							limit: null,
							orderBy: [],
							queryName: 'A',
							reduceTo: 'avg',
							spaceAggregation: 'avg',
							stepInterval: 60,
							timeAggregation: 'avg',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'mem_limit_util',
								key: k8sPodMemLimitUtilKey,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'B',
							filters: {
								items: [
									{
										id: 'f1',
										key: {
											dataType: DataTypes.String,
											id: 'ss_name',
											key: k8sStatefulSetNameKey,
											type: 'tag',
										},
										op: '=',
										value: statefulSet.meta.k8s_statefulset_name,
									},
									{
										id: 'f2',
										key: {
											dataType: DataTypes.String,
											id: 'ns_name',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: statefulSet.meta.k8s_namespace_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'Limits util %',
							limit: null,
							orderBy: [],
							queryName: 'B',
							reduceTo: 'avg',
							spaceAggregation: 'avg',
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
								id: 'net_io',
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
										id: 'f1',
										key: {
											dataType: DataTypes.String,
											id: 'ss_name',
											key: k8sStatefulSetNameKey,
											type: 'tag',
										},
										op: '=',
										value: statefulSet.meta.k8s_statefulset_name,
									},
									{
										id: 'f2',
										key: {
											dataType: DataTypes.String,
											id: 'ns_name',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: statefulSet.meta.k8s_namespace_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'direction',
									key: 'direction',
									type: 'tag',
								},
								{
									dataType: DataTypes.String,
									id: 'interface',
									key: 'interface',
									type: 'tag',
								},
							],
							having: [],
							legend: '{{direction}} :: {{interface}}',
							limit: null,
							orderBy: [],
							queryName: 'A',
							reduceTo: 'avg',
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'rate',
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
								id: 'net_err',
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
										id: 'f1',
										key: {
											dataType: DataTypes.String,
											id: 'ss_name',
											key: k8sStatefulSetNameKey,
											type: 'tag',
										},
										op: '=',
										value: statefulSet.meta.k8s_statefulset_name,
									},
									{
										id: 'f2',
										key: {
											dataType: DataTypes.String,
											id: 'ns_name',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: statefulSet.meta.k8s_namespace_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'direction',
									key: 'direction',
									type: 'tag',
								},
								{
									dataType: DataTypes.String,
									id: 'interface',
									key: 'interface',
									type: 'tag',
								},
							],
							having: [],
							legend: '{{direction}} :: {{interface}}',
							limit: null,
							orderBy: [],
							queryName: 'A',
							reduceTo: 'avg',
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'increase',
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
		},
	];
};
