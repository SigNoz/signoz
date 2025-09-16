/* eslint-disable sonarjs/no-duplicate-string */
import { PANEL_TYPES } from 'constants/queryBuilder';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';

export const getPodQueryPayload = (
	clusterName: string,
	podName: string,
	start: number,
	end: number,
	dotMetricsEnabled: boolean,
): GetQueryResultsProps[] => {
	const k8sClusterNameKey = dotMetricsEnabled
		? 'k8s.cluster.name'
		: 'k8s_cluster_name';
	const k8sPodNameKey = dotMetricsEnabled ? 'k8s.pod.name' : 'k8s_pod_name';
	const containerCpuUtilKey = dotMetricsEnabled
		? 'container.cpu.usage'
		: 'container_cpu_usage';
	const containerMemUsageKey = dotMetricsEnabled
		? 'container.memory.usage'
		: 'container_memory_usage';
	const k8sContainerCpuReqKey = dotMetricsEnabled
		? 'k8s.container.cpu_request'
		: 'k8s_container_cpu_request';
	const k8sContainerCpuLimitKey = dotMetricsEnabled
		? 'k8s.container.cpu_limit'
		: 'k8s_container_cpu_limit';
	const k8sContainerMemReqKey = dotMetricsEnabled
		? 'k8s.container.memory_request'
		: 'k8s_container_memory_request';
	const k8sContainerMemLimitKey = dotMetricsEnabled
		? 'k8s.container.memory_limit'
		: 'k8s_container_memory_limit';
	const k8sPodFsAvailKey = dotMetricsEnabled
		? 'k8s.pod.filesystem.available'
		: 'k8s_pod_filesystem_available';
	const k8sPodFsCapKey = dotMetricsEnabled
		? 'k8s.pod.filesystem.capacity'
		: 'k8s_pod_filesystem_capacity';
	const k8sPodNetIoKey = dotMetricsEnabled
		? 'k8s.pod.network.io'
		: 'k8s_pod_network_io';
	const podLegendTemplate = dotMetricsEnabled
		? '{{k8s.pod.name}}'
		: '{{k8s_pod_name}}';
	const podLegendUsage = dotMetricsEnabled
		? 'usage - {{k8s.pod.name}}'
		: 'usage - {{k8s_pod_name}}';
	const podLegendLimit = dotMetricsEnabled
		? 'limit - {{k8s.pod.name}}'
		: 'limit - {{k8s_pod_name}}';

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
								id: 'container_cpu_usage--float64--Gauge--true',
								key: containerCpuUtilKey,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'A',
							filters: {
								items: [
									{
										id: '6e050953',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_cluster_name--string--tag--false',

											key: k8sClusterNameKey,
											type: 'tag',
										},
										op: '=',
										value: clusterName,
									},
									{
										id: '60fe5e62',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',

											key: k8sPodNameKey,
											type: 'tag',
										},
										op: '=',
										value: podName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'k8s_pod_name--string--tag--false',
									key: k8sPodNameKey,
									type: 'tag',
								},
							],
							having: [],
							legend: podLegendTemplate,
							limit: null,
							orderBy: [],
							queryName: 'A',
							reduceTo: 'avg',
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'avg',
						},
					],
					queryFormulas: [],
					queryTraceOperator: [],
				},
				clickhouse_sql: [{ disabled: false, legend: '', name: 'A', query: '' }],
				id: '9b92756a-b445-45f8-90f4-d26f3ef28f8f',
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
								id: 'container_memory_usage--float64--Gauge--true',
								key: containerMemUsageKey,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'A',
							filters: {
								items: [
									{
										id: 'a4250695',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_cluster_name--string--tag--false',
											key: k8sClusterNameKey,
											type: 'tag',
										},
										op: '=',
										value: clusterName,
									},
									{
										id: '3b2bc32b',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',
											key: k8sPodNameKey,
											type: 'tag',
										},
										op: '=',
										value: podName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'k8s_pod_name--string--tag--false',
									key: k8sPodNameKey,
									type: 'tag',
								},
							],
							having: [],
							legend: podLegendTemplate,
							limit: null,
							orderBy: [],
							queryName: 'A',
							reduceTo: 'avg',
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'avg',
						},
					],
					queryFormulas: [],
					queryTraceOperator: [],
				},
				clickhouse_sql: [{ disabled: false, legend: '', name: 'A', query: '' }],
				id: 'a22c1e03-4876-4b3e-9a96-a3c3a28f9c0f',
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
								id: 'container_cpu_usage--float64--Gauge--true',
								key: containerCpuUtilKey,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: true,
							expression: 'A',
							filters: {
								items: [
									{
										id: '8426b52f',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_cluster_name--string--tag--false',
											key: k8sClusterNameKey,
											type: 'tag',
										},
										op: '=',
										value: clusterName,
									},
									{
										id: '2f67240c',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',
											key: k8sPodNameKey,
											type: 'tag',
										},
										op: '=',
										value: podName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'k8s_pod_name--string--tag--false',
									key: k8sPodNameKey,
									type: 'tag',
								},
							],
							having: [],
							legend: '',
							limit: null,
							orderBy: [],
							queryName: 'A',
							reduceTo: 'sum',
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'avg',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'k8s_container_cpu_request--float64--Gauge--true',
								key: k8sContainerCpuReqKey,
								type: 'Gauge',
							},
							aggregateOperator: 'latest',
							dataSource: DataSource.METRICS,
							disabled: true,
							expression: 'B',
							filters: {
								items: [
									{
										id: '8c4667e1',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_cluster_name--string--tag--false',
											key: k8sClusterNameKey,
											type: 'tag',
										},
										op: '=',
										value: clusterName,
									},
									{
										id: 'b16e7306',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',
											key: k8sPodNameKey,
											type: 'tag',
										},
										op: 'in',
										value: podName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'k8s_pod_name--string--tag--false',
									key: k8sPodNameKey,
									type: 'tag',
								},
							],
							having: [],
							legend: '',
							limit: null,
							orderBy: [],
							queryName: 'B',
							reduceTo: 'avg',
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'latest',
						},
					],
					queryFormulas: [
						{
							disabled: false,
							expression: 'A*100/B',
							legend: podLegendTemplate,
							queryName: 'F1',
						},
					],
					queryTraceOperator: [],
				},
				clickhouse_sql: [{ disabled: false, legend: '', name: 'A', query: '' }],
				id: '7bb3a6f5-d1c6-4f2e-9cc9-7dcc46db398f',
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
								id: 'container_cpu_usage--float64--Gauge--true',
								key: containerCpuUtilKey,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: true,
							expression: 'A',
							filters: {
								items: [
									{
										id: '0a862947',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_cluster_name--string--tag--false',
											key: k8sClusterNameKey,
											type: 'tag',
										},
										op: '=',
										value: clusterName,
									},
									{
										id: 'cd13fbf0',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',
											key: k8sPodNameKey,
											type: 'tag',
										},
										op: '=',
										value: podName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'k8s_pod_name--string--tag--false',
									key: k8sPodNameKey,
									type: 'tag',
								},
							],
							having: [],
							legend: podLegendUsage,
							limit: null,
							orderBy: [],
							queryName: 'A',
							reduceTo: 'sum',
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'avg',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'k8s_container_cpu_limit--float64--Gauge--true',
								key: k8sContainerCpuLimitKey,
								type: 'Gauge',
							},
							aggregateOperator: 'latest',
							dataSource: DataSource.METRICS,
							disabled: true,
							expression: 'B',
							filters: {
								items: [
									{
										id: 'bfb8acf7',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_cluster_name--string--tag--false',
											key: k8sClusterNameKey,
											type: 'tag',
										},
										op: '=',
										value: clusterName,
									},
									{
										id: 'e09ba819',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',
											key: k8sPodNameKey,
											type: 'tag',
										},
										op: 'in',
										value: podName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'k8s_pod_name--string--tag--false',
									key: k8sPodNameKey,
									type: 'tag',
								},
							],
							having: [],
							legend: podLegendLimit,
							limit: null,
							orderBy: [],
							queryName: 'B',
							reduceTo: 'avg',
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'latest',
						},
					],
					queryFormulas: [
						{
							disabled: false,
							expression: 'A*100/B',
							legend: podLegendTemplate,
							queryName: 'F1',
						},
					],
					queryTraceOperator: [],
				},
				clickhouse_sql: [{ disabled: false, legend: '', name: 'A', query: '' }],
				id: '6d5ccd81-0ea1-4fb9-a66b-7f0fe2f15165',
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
								id: 'container_memory_usage--float64--Gauge--true',
								key: containerMemUsageKey,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: true,
							expression: 'A',
							filters: {
								items: [
									{
										id: 'ea3df3e7',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_cluster_name--string--tag--false',

											key: k8sClusterNameKey,
											type: 'tag',
										},
										op: '=',
										value: clusterName,
									},
									{
										id: '39b21fe0',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',

											key: k8sPodNameKey,
											type: 'tag',
										},
										op: 'in',
										value: podName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'k8s_pod_name--string--tag--false',

									key: k8sPodNameKey,
									type: 'tag',
								},
							],
							having: [],
							legend: '',
							limit: null,
							orderBy: [],
							queryName: 'A',
							reduceTo: 'sum',
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'avg',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'k8s_container_memory_request--float64--Gauge--true',

								key: k8sContainerMemReqKey,
								type: 'Gauge',
							},
							aggregateOperator: 'latest',
							dataSource: DataSource.METRICS,
							disabled: true,
							expression: 'B',
							filters: {
								items: [
									{
										id: '7401a4b9',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_cluster_name--string--tag--false',

											key: k8sClusterNameKey,
											type: 'tag',
										},
										op: '=',
										value: clusterName,
									},
									{
										id: '7cdad1cb',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',

											key: k8sPodNameKey,
											type: 'tag',
										},
										op: '=',
										value: podName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'k8s_pod_name--string--tag--false',

									key: k8sPodNameKey,
									type: 'tag',
								},
							],
							having: [],
							legend: '',
							limit: null,
							orderBy: [],
							queryName: 'B',
							reduceTo: 'avg',
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'latest',
						},
					],
					queryFormulas: [
						{
							disabled: false,
							expression: 'A*100/B',
							legend: podLegendTemplate,
							queryName: 'F1',
						},
					],
					queryTraceOperator: [],
				},
				clickhouse_sql: [{ disabled: false, legend: '', name: 'A', query: '' }],
				id: '4d03a0ff-4fa5-4b19-b397-97f80ba9e0ac',
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
								id: 'container_memory_usage--float64--Gauge--true',

								key: containerMemUsageKey,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: true,
							expression: 'A',
							filters: {
								items: [
									{
										id: 'f2a3175c',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_cluster_name--string--tag--false',

											key: k8sClusterNameKey,
											type: 'tag',
										},
										op: '=',
										value: clusterName,
									},
									{
										id: 'fc17ff21',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',

											key: k8sPodNameKey,
											type: 'tag',
										},
										op: '=',
										value: podName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'k8s_pod_name--string--tag--false',

									key: k8sPodNameKey,
									type: 'tag',
								},
							],
							having: [],
							legend: '',
							limit: null,
							orderBy: [],
							queryName: 'A',
							reduceTo: 'sum',
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'avg',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'k8s_container_memory_limit--float64--Gauge--true',

								key: k8sContainerMemLimitKey,
								type: 'Gauge',
							},
							aggregateOperator: 'latest',
							dataSource: DataSource.METRICS,
							disabled: true,
							expression: 'B',
							filters: {
								items: [
									{
										id: '175e96b7',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_cluster_name--string--tag--false',

											key: k8sClusterNameKey,
											type: 'tag',
										},
										op: '=',
										value: clusterName,
									},
									{
										id: '1d9fbe48',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',

											key: k8sPodNameKey,
											type: 'tag',
										},
										op: 'in',
										value: podName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'k8s_pod_name--string--tag--false',

									key: k8sPodNameKey,
									type: 'tag',
								},
							],
							having: [],
							legend: '',
							limit: null,
							orderBy: [],
							queryName: 'B',
							reduceTo: 'avg',
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'latest',
						},
					],
					queryFormulas: [
						{
							disabled: false,
							expression: 'A*100/B',
							legend: podLegendTemplate,
							queryName: 'F1',
						},
					],
					queryTraceOperator: [],
				},
				clickhouse_sql: [{ disabled: false, legend: '', name: 'A', query: '' }],
				id: 'ad491f19-0f83-4dd4-bb8f-bec295c18d1b',
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
								id: 'k8s_pod_filesystem_available--float64--Gauge--true',

								key: k8sPodFsAvailKey,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: true,
							expression: 'A',
							filters: {
								items: [
									{
										id: '877385bf',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_cluster_name--string--tag--false',

											key: k8sClusterNameKey,
											type: 'tag',
										},
										op: '=',
										value: clusterName,
									},
									{
										id: '877385cd',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',

											key: k8sPodNameKey,
											type: 'tag',
										},
										op: '=',
										value: podName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'k8s_pod_name--string--tag--false',

									key: k8sPodNameKey,
									type: 'tag',
								},
							],
							having: [],
							legend: '',
							limit: null,
							orderBy: [],
							queryName: 'A',
							reduceTo: 'sum',
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'avg',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'k8s_pod_filesystem_capacity--float64--Gauge--true',

								key: k8sPodFsCapKey,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: true,
							expression: 'B',
							filters: {
								items: [
									{
										id: '877385bf',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_cluster_name--string--tag--false',

											key: k8sClusterNameKey,
											type: 'tag',
										},
										op: '=',
										value: clusterName,
									},
									{
										id: '877385cd',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',

											key: k8sPodNameKey,
											type: 'tag',
										},
										op: '=',
										value: podName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'k8s_pod_name--string--tag--false',

									key: k8sPodNameKey,
									type: 'tag',
								},
							],
							having: [],
							legend: '',
							limit: null,
							orderBy: [],
							queryName: 'B',
							reduceTo: 'sum',
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'avg',
						},
					],
					queryFormulas: [
						{
							disabled: false,
							expression: '(B-A)/B',
							legend: podLegendTemplate,
							queryName: 'F1',
						},
					],
					queryTraceOperator: [],
				},
				clickhouse_sql: [{ disabled: false, legend: '', name: 'A', query: '' }],
				id: '16908d4e-1565-4847-8d87-01ebb8fc494a',
				promql: [{ disabled: false, legend: '', name: 'A', query: '' }],
				queryType: EQueryType.QUERY_BUILDER,
			},
			variables: {},
			fillGaps: false,
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
								id: 'k8s_pod_network_io--float64--Sum--true',

								key: k8sPodNetIoKey,
								type: 'Sum',
							},
							aggregateOperator: 'rate',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'A',
							filters: {
								items: [
									{
										id: '877385bf',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_cluster_name--string--tag--false',

											key: k8sClusterNameKey,
											type: 'tag',
										},
										op: '=',
										value: clusterName,
									},
									{
										id: '9613b4da',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',

											key: k8sPodNameKey,
											type: 'tag',
										},
										op: '=',
										value: podName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'k8s_pod_name--string--tag--false',

									key: k8sPodNameKey,
									type: 'tag',
								},
							],
							having: [],
							legend: podLegendTemplate,
							limit: null,
							orderBy: [],
							queryName: 'A',
							reduceTo: 'sum',
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'rate',
						},
					],
					queryFormulas: [],
					queryTraceOperator: [],
				},
				clickhouse_sql: [{ disabled: false, legend: '', name: 'A', query: '' }],
				id: '4b255d6d-4cde-474d-8866-f4418583c18b',
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

export const getNodeQueryPayload = (
	clusterName: string,
	nodeName: string,
	start: number,
	end: number,
	dotMetricsEnabled: boolean,
): GetQueryResultsProps[] => {
	const k8sClusterNameKey = dotMetricsEnabled
		? 'k8s.cluster.name'
		: 'k8s_cluster_name';
	const k8sNodeNameKey = dotMetricsEnabled ? 'k8s.node.name' : 'k8s_node_name';
	const k8sNodeCpuTimeKey = dotMetricsEnabled
		? 'k8s.node.cpu.time'
		: 'k8s_node_cpu_time';
	const k8sNodeAllocCpuKey = dotMetricsEnabled
		? 'k8s.node.allocatable_cpu'
		: 'k8s_node_allocatable_cpu';
	const k8sNodeMemWsKey = dotMetricsEnabled
		? 'k8s.node.memory.working_set'
		: 'k8s_node_memory_working_set';
	const k8sNodeAllocMemKey = dotMetricsEnabled
		? 'k8s.node.allocatable_memory'
		: 'k8s_node_allocatable_memory';
	const k8sNodeNetIoKey = dotMetricsEnabled
		? 'k8s.node.network.io'
		: 'k8s_node_network_io';
	const k8sNodeFsAvailKey = dotMetricsEnabled
		? 'k8s.node.filesystem.available'
		: 'k8s_node_filesystem_available';
	const k8sNodeFsCapKey = dotMetricsEnabled
		? 'k8s.node.filesystem.capacity'
		: 'k8s_node_filesystem_capacity';
	const podLegend = dotMetricsEnabled
		? '{{k8s.node.name}}'
		: '{{k8s_node_name}}';

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
								id: 'k8s_node_cpu_time--float64--Sum--true',

								key: k8sNodeCpuTimeKey,
								type: 'Sum',
							},
							aggregateOperator: 'rate',
							dataSource: DataSource.METRICS,
							disabled: true,
							expression: 'A',
							filters: {
								items: [
									{
										id: 'c_cluster',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_cluster_name--string--tag--false',

											key: k8sClusterNameKey,
											type: 'tag',
										},
										op: '=',
										value: clusterName,
									},
									{
										id: 'c_node',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_node_name--string--tag--false',

											key: k8sNodeNameKey,
											type: 'tag',
										},
										op: 'in',
										value: nodeName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'k8s_node_name--string--tag--false',

									key: k8sNodeNameKey,
									type: 'tag',
								},
							],
							having: [],
							legend: podLegend,
							limit: null,
							orderBy: [],
							queryName: 'A',
							reduceTo: 'sum',
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'rate',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'k8s_node_allocatable_cpu--float64--Gauge--true',

								key: k8sNodeAllocCpuKey,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: true,
							expression: 'B',
							filters: {
								items: [
									{
										id: 'cpu_node',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_node_name--string--tag--false',

											key: k8sNodeNameKey,
											type: 'tag',
										},
										op: 'in',
										value: nodeName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'k8s_node_name--string--tag--false',

									key: k8sNodeNameKey,
									type: 'tag',
								},
							],
							having: [],
							legend: podLegend,
							limit: null,
							orderBy: [],
							queryName: 'B',
							reduceTo: 'sum',
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'avg',
						},
					],
					queryFormulas: [
						{
							disabled: false,
							expression: 'A/B',
							legend: podLegend,
							queryName: 'F1',
						},
					],
					queryTraceOperator: [],
				},
				clickhouse_sql: [{ disabled: false, legend: '', name: 'A', query: '' }],
				id: '259295b5-774d-4b2e-8a4f-e5dd63e6c38d',
				promql: [{ disabled: false, legend: '', name: 'A', query: '' }],
				queryType: EQueryType.QUERY_BUILDER,
			},
			variables: {},
			fillGaps: false,
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
								id: 'k8s_node_memory_working_set--float64--Gauge--true',

								key: k8sNodeMemWsKey,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: true,
							expression: 'A',
							filters: {
								items: [
									{
										id: 'mem_cluster',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_cluster_name--string--tag--false',

											key: k8sClusterNameKey,
											type: 'tag',
										},
										op: '=',
										value: clusterName,
									},
									{
										id: 'mem_node',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_node_name--string--tag--false',

											key: k8sNodeNameKey,
											type: 'tag',
										},
										op: 'in',
										value: nodeName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'k8s_node_name--string--tag--false',

									key: k8sNodeNameKey,
									type: 'tag',
								},
							],
							having: [],
							legend: '',
							limit: null,
							orderBy: [],
							queryName: 'A',
							reduceTo: 'sum',
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'avg',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'k8s_node_allocatable_memory--float64--Gauge--true',

								key: k8sNodeAllocMemKey,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: true,
							expression: 'B',
							filters: {
								items: [
									{
										id: 'alloc_node',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_node_name--string--tag--false',

											key: k8sNodeNameKey,
											type: 'tag',
										},
										op: 'in',
										value: nodeName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'k8s_node_name--string--tag--false',

									key: k8sNodeNameKey,
									type: 'tag',
								},
							],
							having: [],
							legend: '',
							limit: null,
							orderBy: [],
							queryName: 'B',
							reduceTo: 'sum',
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'avg',
						},
					],
					queryFormulas: [
						{
							disabled: false,
							expression: 'A/B',
							legend: podLegend,
							queryName: 'F1',
						},
					],
					queryTraceOperator: [],
				},
				clickhouse_sql: [{ disabled: false, legend: '', name: 'A', query: '' }],
				id: '486af4da-2a1a-4b8f-992c-eba098d3a6f9',
				promql: [{ disabled: false, legend: '', name: 'A', query: '' }],
				queryType: EQueryType.QUERY_BUILDER,
			},
			variables: {},
			fillGaps: false,
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
								id: 'k8s_node_network_io--float64--Sum--true',

								key: k8sNodeNetIoKey,
								type: 'Sum',
							},
							aggregateOperator: 'rate',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'A',
							filters: {
								items: [
									{
										id: 'net_cluster',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_cluster_name--string--tag--false',

											key: k8sClusterNameKey,
											type: 'tag',
										},
										op: '=',
										value: clusterName,
									},
									{
										id: 'net_node',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_node_name--string--tag--false',

											key: k8sNodeNameKey,
											type: 'tag',
										},
										op: 'in',
										value: nodeName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'interface--string--tag--false',

									key: 'interface',
									type: 'tag',
								},
								{
									dataType: DataTypes.String,
									id: 'direction--string--tag--false',

									key: 'direction',
									type: 'tag',
								},
								{
									dataType: DataTypes.String,
									id: 'k8s_node_name--string--tag--false',

									key: k8sNodeNameKey,
									type: 'tag',
								},
							],
							having: [],
							legend: `${podLegend}-{{interface}}-{{direction}}`,
							limit: null,
							orderBy: [],
							queryName: 'A',
							reduceTo: 'sum',
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'rate',
						},
					],
					queryFormulas: [],
					queryTraceOperator: [],
				},
				clickhouse_sql: [{ disabled: false, legend: '', name: 'A', query: '' }],
				id: 'b56143c0-7d2f-4425-97c5-65ad6fc87366',
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
								id: 'k8s_node_filesystem_available--float64--Gauge--true',

								key: k8sNodeFsAvailKey,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: true,
							expression: 'A',
							filters: {
								items: [
									{
										id: 'fs_cluster',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_cluster_name--string--tag--false',

											key: k8sClusterNameKey,
											type: 'tag',
										},
										op: '=',
										value: clusterName,
									},
									{
										id: 'fs_node',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_node_name--string--tag--false',

											key: k8sNodeNameKey,
											type: 'tag',
										},
										op: 'in',
										value: nodeName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'k8s_node_name--string--tag--false',

									key: k8sNodeNameKey,
									type: 'tag',
								},
							],
							having: [],
							legend: '',
							limit: null,
							orderBy: [],
							queryName: 'A',
							reduceTo: 'sum',
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'avg',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'k8s_node_filesystem_capacity--float64--Gauge--true',

								key: k8sNodeFsCapKey,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: true,
							expression: 'B',
							filters: {
								items: [
									{
										id: 'fs_clusterB',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_cluster_name--string--tag--false',

											key: k8sClusterNameKey,
											type: 'tag',
										},
										op: '=',
										value: clusterName,
									},
									{
										id: 'fs_nodeB',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_node_name--string--tag--false',

											key: k8sNodeNameKey,
											type: 'tag',
										},
										op: 'in',
										value: nodeName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'k8s_node_name--string--tag--false',

									key: k8sNodeNameKey,
									type: 'tag',
								},
							],
							having: [],
							legend: '',
							limit: null,
							orderBy: [],
							queryName: 'B',
							reduceTo: 'sum',
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'avg',
						},
					],
					queryFormulas: [
						{
							disabled: false,
							expression: '(B-A)/B',
							legend: podLegend,
							queryName: 'F1',
						},
					],
					queryTraceOperator: [],
				},
				clickhouse_sql: [{ disabled: false, legend: '', name: 'A', query: '' }],
				id: '57eeac15-615c-4a71-9c61-8e0c0c76b045',
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

export const getHostQueryPayload = (
	hostName: string,
	start: number,
	end: number,
	dotMetricsEnabled: boolean,
): GetQueryResultsProps[] => {
	const hostNameKey = dotMetricsEnabled ? 'host.name' : 'host_name';
	const cpuTimeKey = dotMetricsEnabled ? 'system.cpu.time' : 'system_cpu_time';
	const memUsageKey = dotMetricsEnabled
		? 'system.memory.usage'
		: 'system_memory_usage';
	const load1mKey = dotMetricsEnabled
		? 'system.cpu.load_average.1m'
		: 'system_cpu_load_average_1m';
	const load5mKey = dotMetricsEnabled
		? 'system.cpu.load_average.5m'
		: 'system_cpu_load_average_5m';
	const load15mKey = dotMetricsEnabled
		? 'system.cpu.load_average.15m'
		: 'system_cpu_load_average_15m';
	const netIoKey = dotMetricsEnabled ? 'system.network.io' : 'system_network_io';
	const netPktsKey = dotMetricsEnabled
		? 'system.network.packets'
		: 'system_network_packets';
	const netErrKey = dotMetricsEnabled
		? 'system.network.errors'
		: 'system_network_errors';
	const netDropKey = dotMetricsEnabled
		? 'system.network.dropped'
		: 'system_network_dropped';
	const netConnKey = dotMetricsEnabled
		? 'system.network.connections'
		: 'system_network_connections';
	const diskIoKey = dotMetricsEnabled ? 'system.disk.io' : 'system_disk_io';
	const diskOpTimeKey = dotMetricsEnabled
		? 'system.disk.operation_time'
		: 'system_disk_operation_time';
	const diskPendingKey = dotMetricsEnabled
		? 'system.disk.pending_operations'
		: 'system_disk_pending_operations';

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
								id: 'system_cpu_time--float64--Sum--true',

								key: cpuTimeKey,
								type: 'Sum',
							},
							aggregateOperator: 'rate',
							dataSource: DataSource.METRICS,
							disabled: true,
							expression: 'A',
							filters: {
								items: [
									{
										id: 'cpu_f1',
										key: {
											dataType: DataTypes.String,
											id: 'host_name--string--tag--false',

											key: hostNameKey,
											type: 'tag',
										},
										op: '=',
										value: hostName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'state--string--tag--false',

									key: 'state',
									type: 'tag',
								},
							],
							having: [],
							legend: '{{state}}',
							limit: null,
							orderBy: [],
							queryName: 'A',
							reduceTo: 'avg',
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'rate',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'system_cpu_time--float64--Sum--true',

								key: cpuTimeKey,
								type: 'Sum',
							},
							aggregateOperator: 'rate',
							dataSource: DataSource.METRICS,
							disabled: true,
							expression: 'B',
							filters: {
								items: [
									{
										id: 'cpu_f2',
										key: {
											dataType: DataTypes.String,
											id: 'host_name--string--tag--false',

											key: hostNameKey,
											type: 'tag',
										},
										op: '=',
										value: hostName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: '{{state}}',
							limit: null,
							orderBy: [],
							queryName: 'B',
							reduceTo: 'avg',
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'rate',
						},
					],
					queryFormulas: [
						{
							disabled: false,
							expression: 'A/B',
							legend: '{{state}}',
							queryName: 'F1',
						},
					],
					queryTraceOperator: [],
				},
				clickhouse_sql: [{ disabled: false, legend: '', name: 'A', query: '' }],
				id: '315b15fa-ff0c-442f-89f8-2bf4fb1af2f2',
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
								id: 'system_memory_usage--float64--Gauge--true',

								key: memUsageKey,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'A',
							filters: {
								items: [
									{
										id: 'mem_f1',
										key: {
											dataType: DataTypes.String,
											id: 'host_name--string--tag--false',

											key: hostNameKey,
											type: 'tag',
										},
										op: '=',
										value: hostName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'state--string--tag--false',

									key: 'state',
									type: 'tag',
								},
							],
							having: [],
							legend: '{{state}}',
							limit: null,
							orderBy: [],
							queryName: 'A',
							reduceTo: 'avg',
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'avg',
						},
					],
					queryFormulas: [],
					queryTraceOperator: [],
				},
				clickhouse_sql: [{ disabled: false, legend: '', name: 'A', query: '' }],
				id: '40218bfb-a9b7-4974-aead-5bf666e139bf',
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
								id: 'system_cpu_load_average_1m--float64--Gauge--true',

								key: load1mKey,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'A',
							filters: {
								items: [
									{
										id: 'load1m_f1',
										key: {
											dataType: DataTypes.String,
											id: 'host_name--string--tag--false',

											key: hostNameKey,
											type: 'tag',
										},
										op: '=',
										value: hostName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: '1m',
							limit: 30,
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
								id: 'system_cpu_load_average_5m--float64--Gauge--true',

								key: load5mKey,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'B',
							filters: {
								items: [
									{
										id: 'load5m_f1',
										key: {
											dataType: DataTypes.String,
											id: 'host_name--string--tag--false',

											key: hostNameKey,
											type: 'tag',
										},
										op: '=',
										value: hostName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: '5m',
							limit: 30,
							orderBy: [],
							queryName: 'B',
							reduceTo: 'avg',
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'avg',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'system_cpu_load_average_15m--float64--Gauge--true',

								key: load15mKey,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'C',
							filters: {
								items: [
									{
										id: 'load15m_f1',
										key: {
											dataType: DataTypes.String,
											id: 'host_name--string--tag--false',

											key: hostNameKey,
											type: 'tag',
										},
										op: '=',
										value: hostName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: '15m',
							limit: 30,
							orderBy: [],
							queryName: 'C',
							reduceTo: 'avg',
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'avg',
						},
					],
					queryFormulas: [],
					queryTraceOperator: [],
				},
				clickhouse_sql: [{ disabled: false, legend: '', name: 'A', query: '' }],
				id: '8e6485ea-7018-43b0-ab27-b210f77b59ad',
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
								id: 'system_network_io--float64--Sum--true',

								key: netIoKey,
								type: 'Sum',
							},
							aggregateOperator: 'rate',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'A',
							filters: {
								items: [
									{
										id: 'netio_f1',
										key: {
											dataType: DataTypes.String,
											id: 'host_name--string--tag--false',

											key: hostNameKey,
											type: 'tag',
										},
										op: '=',
										value: hostName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'direction--string--tag--false',

									key: 'direction',
									type: 'tag',
								},
								{
									dataType: DataTypes.String,
									id: 'device--string--tag--false',

									key: 'device',
									type: 'tag',
								},
							],
							having: [
								{
									columnName: `SUM(${netIoKey})`,
									op: '>',
									value: 0,
								},
							],
							legend: '{{device}}::{{direction}}',
							limit: 30,
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
				id: '47173220-44df-4ef6-87f4-31e333c180c7',
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
								id: 'system_network_packets--float64--Sum--true',

								key: netPktsKey,
								type: 'Sum',
							},
							aggregateOperator: 'rate',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'A',
							filters: {
								items: [
									{
										id: 'netpkts_f1',
										key: {
											dataType: DataTypes.String,
											id: 'host_name--string--tag--false',

											key: hostNameKey,
											type: 'tag',
										},
										op: '=',
										value: hostName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'direction--string--tag--false',

									key: 'direction',
									type: 'tag',
								},
								{
									dataType: DataTypes.String,
									id: 'device--string--tag--false',

									key: 'device',
									type: 'tag',
								},
							],
							having: [],
							legend: '{{device}}::{{direction}}',
							limit: 30,
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
				id: '62eedbc6-c8ad-4d13-80a8-129396e1d1dc',
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
								id: 'system_network_errors--float64--Sum--true',

								key: netErrKey,
								type: 'Sum',
							},
							aggregateOperator: 'rate',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'A',
							filters: {
								items: [
									{
										id: 'neterr_f1',
										key: {
											dataType: DataTypes.String,
											id: 'host_name--string--tag--false',

											key: hostNameKey,
											type: 'tag',
										},
										op: '=',
										value: hostName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'direction--string--tag--false',

									key: 'direction',
									type: 'tag',
								},
								{
									dataType: DataTypes.String,
									id: 'device--string--tag--false',

									key: 'device',
									type: 'tag',
								},
							],
							having: [],
							legend: '{{device}}::{{direction}}',
							limit: 30,
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
				id: '5ddb1b38-53bb-46f5-b4fe-fe832d6b9b24',
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
								id: 'system_network_dropped--float64--Sum--true',

								key: netDropKey,
								type: 'Sum',
							},
							aggregateOperator: 'rate',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'A',
							filters: {
								items: [
									{
										id: 'netdrop_f1',
										key: {
											dataType: DataTypes.String,
											id: 'host_name--string--tag--false',

											key: hostNameKey,
											type: 'tag',
										},
										op: '=',
										value: hostName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'direction--string--tag--false',

									key: 'direction',
									type: 'tag',
								},
								{
									dataType: DataTypes.String,
									id: 'device--string--tag--false',

									key: 'device',
									type: 'tag',
								},
							],
							having: [],
							legend: '{{device}}::{{direction}}',
							limit: 30,
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
				id: 'a849bcce-7684-4852-9134-530b45419b8f',
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
								id: 'system_network_connections--float64--Gauge--true',

								key: netConnKey,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'A',
							filters: {
								items: [
									{
										id: 'netconn_f1',
										key: {
											dataType: DataTypes.String,
											id: 'host_name--string--tag--false',

											key: hostNameKey,
											type: 'tag',
										},
										op: '=',
										value: hostName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'protocol--string--tag--false',

									key: 'protocol',
									type: 'tag',
								},
								{
									dataType: DataTypes.String,
									id: 'state--string--tag--false',

									key: 'state',
									type: 'tag',
								},
							],
							having: [],
							legend: '{{protocol}}::{{state}}',
							limit: 30,
							orderBy: [],
							queryName: 'A',
							reduceTo: 'avg',
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'avg',
						},
					],
					queryFormulas: [],
					queryTraceOperator: [],
				},
				clickhouse_sql: [{ disabled: false, legend: '', name: 'A', query: '' }],
				id: 'ab685a3d-fa4c-4663-8d94-c452e59038f3',
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
								id: 'system_disk_io--float64--Sum--true',

								key: diskIoKey,
								type: 'Sum',
							},
							aggregateOperator: 'rate',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'A',
							filters: {
								items: [
									{
										id: 'diskio_f1',
										key: {
											dataType: DataTypes.String,
											id: 'host_name--string--tag--false',

											key: hostNameKey,
											type: 'tag',
										},
										op: '=',
										value: hostName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'system disk io',
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
				id: '9bd40b51-0790-4cdd-9718-551b2ded5926',
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
								id: 'system_disk_operation_time--float64--Sum--true',

								key: diskOpTimeKey,
								type: 'Sum',
							},
							aggregateOperator: 'rate',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'A',
							filters: {
								items: [
									{
										id: 'diskop_f1',
										key: {
											dataType: DataTypes.String,
											id: 'host_name--string--tag--false',

											key: hostNameKey,
											type: 'tag',
										},
										op: '=',
										value: hostName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'device--string--tag--false',

									key: 'device',
									type: 'tag',
								},
								{
									dataType: DataTypes.String,
									id: 'direction--string--tag--false',

									key: 'direction',
									type: 'tag',
								},
							],
							having: [
								{
									columnName: `SUM(${diskOpTimeKey})`,
									op: '>',
									value: 0,
								},
							],
							legend: '{{device}}::{{direction}}',
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
				id: '9c6d18ad-89ff-4e38-a15a-440e72ed6ca8',
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
								id: 'system_disk_pending_operations--float64--Gauge--true',

								key: diskPendingKey,
								type: 'Gauge',
							},
							aggregateOperator: 'max',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'A',
							filters: {
								items: [
									{
										id: 'diskpend_f1',
										key: {
											dataType: DataTypes.String,
											id: 'host_name--string--tag--false',

											key: hostNameKey,
											type: 'tag',
										},
										op: '=',
										value: hostName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'device--string--tag--false',

									key: 'device',
									type: 'tag',
								},
							],
							having: [
								{
									columnName: `SUM(${diskPendingKey})`,
									op: '>',
									value: 0,
								},
							],
							legend: '{{device}}',
							limit: null,
							orderBy: [],
							queryName: 'A',
							reduceTo: 'avg',
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'max',
						},
					],
					queryFormulas: [],
					queryTraceOperator: [],
				},
				clickhouse_sql: [{ disabled: false, legend: '', name: 'A', query: '' }],
				id: 'f4cfc2a5-78fc-42cc-8f4a-194c8c916132',
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

export const podWidgetInfo = [
	{
		title: 'CPU usage',
		yAxisUnit: '',
	},
	{
		title: 'Memory Usage',
		yAxisUnit: 'bytes',
	},
	{
		title: 'Pod CPU usage [% of Request]',
		yAxisUnit: 'percent',
	},
	{
		title: 'Pod CPU usage [% of Limit]',
		yAxisUnit: 'percent',
	},
	{
		title: 'Pod memory usage [% of Request]',
		yAxisUnit: 'percent',
	},
	{
		title: 'Pod memory usage [% of Limit]',
		yAxisUnit: 'percent',
	},
	{
		title: 'Pod filesystem usage [%]',
		yAxisUnit: 'percentunit',
	},
	{
		title: 'Pod network IO',
		yAxisUnit: 'binBps',
	},
];

export const VIEW_TYPES = {
	NODE: 'node',
	POD: 'pod',
};

export const nodeWidgetInfo = [
	{
		title: 'Node CPU usage',
		yAxisUnit: 'percentunit',
	},
	{
		title: 'Node memory usage (WSS)',
		yAxisUnit: 'percentunit',
	},
	{
		title: 'Node network IO',
		yAxisUnit: 'binBps',
	},
	{
		title: 'Node filesystem usage',
		yAxisUnit: 'percentunit',
	},
];

export const hostWidgetInfo = [
	{ title: 'CPU Usage', yAxisUnit: 'percentunit' },
	{ title: 'Memory Usage', yAxisUnit: 'bytes' },
	{ title: 'System Load Average', yAxisUnit: '' },
	{ title: 'Network usage (bytes)', yAxisUnit: 'bytes' },
	{ title: 'Network usage (packet/s)', yAxisUnit: 'pps' },
	{ title: 'Network errors', yAxisUnit: 'short' },
	{ title: 'Network drops', yAxisUnit: 'short' },
	{ title: 'Network connections', yAxisUnit: 'short' },
	{ title: 'System disk io (bytes transferred)', yAxisUnit: 'bytes' },
	{ title: 'System disk operations/s', yAxisUnit: 'short' },
	{ title: 'Queue size', yAxisUnit: 'short' },
	{ title: 'Disk operations time', yAxisUnit: 's' },
];
