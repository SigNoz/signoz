/* eslint-disable sonarjs/no-duplicate-string */
import { K8sNodesData } from 'api/infraMonitoring/getK8sNodesList';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { EQueryType } from 'types/common/dashboard';
import { DataSource, ReduceOperators } from 'types/common/queryBuilder';
import { v4 } from 'uuid';

export const nodeWidgetInfo = [
	{
		title: 'CPU Usage (cores)',
		yAxisUnit: '',
	},
	{
		title: 'Memory Usage (bytes)',
		yAxisUnit: 'bytes',
	},
	{
		title: 'CPU Usage (%)',
		yAxisUnit: 'percentunit',
	},
	{
		title: 'Memory Usage (%)',
		yAxisUnit: 'percentunit',
	},
	{
		title: 'Pods by CPU (top 10)',
		yAxisUnit: '',
	},
	{
		title: 'Pods by Memory (top 10)',
		yAxisUnit: 'bytes',
	},
	{
		title: 'Network error count',
		yAxisUnit: '',
	},
	{
		title: 'Network IO rate',
		yAxisUnit: 'binBps',
	},
	{
		title: 'Filesystem usage (bytes)',
		yAxisUnit: 'bytes',
	},
	{
		title: 'Filesystem usage (%)',
		yAxisUnit: 'percentunit',
	},
];

export const getNodeMetricsQueryPayload = (
	node: K8sNodesData,
	start: number,
	end: number,
): GetQueryResultsProps[] => {
	const k8sNodeCpuUtilizationKey = 'k8s.node.cpu.usage';

	const k8sNodeAllocatableCpuKey = 'k8s.node.allocatable_cpu';

	const k8sContainerCpuRequestKey = 'k8s.container.cpu_request';

	const k8sNodeMemoryUsageKey = 'k8s.node.memory.usage';

	const k8sNodeAllocatableMemoryKey = 'k8s.node.allocatable_memory';

	const k8sContainerMemoryRequestKey = 'k8s.container.memory_request';

	const k8sNodeMemoryWorkingSetKey = 'k8s.node.memory.working_set';

	const k8sNodeMemoryRssKey = 'k8s.node.memory.rss';

	const k8sPodCpuUtilizationKey = 'k8s.pod.cpu.usage';

	const k8sPodMemoryUsageKey = 'k8s.pod.memory.usage';

	const k8sNodeNetworkErrorsKey = 'k8s.node.network.errors';

	const k8sNodeNetworkIoKey = 'k8s.node.network.io';

	const k8sNodeFilesystemUsageKey = 'k8s.node.filesystem.usage';

	const k8sNodeFilesystemCapacityKey = 'k8s.node.filesystem.capacity';

	const k8sNodeFilesystemAvailableKey = 'k8s.node.filesystem.available';

	const k8sNodeNameKey = 'k8s.node.name';

	const k8sPodNameKey = 'k8s.pod.name';

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
								id: 'k8s_node_cpu_usage--float64--Gauge--true',
								key: k8sNodeCpuUtilizationKey,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'A',
							filters: {
								items: [
									{
										id: '441b62d7',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_node_name--string--tag--false',
											key: k8sNodeNameKey,
											type: 'tag',
										},
										op: '=',
										value: node.meta.k8s_node_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'used (avg)',
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
								id: 'k8s_node_allocatable_cpu--float64--Gauge--true',
								key: k8sNodeAllocatableCpuKey,
								type: 'Gauge',
							},
							aggregateOperator: 'latest',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'B',
							filters: {
								items: [
									{
										id: 'b205b1a3',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_node_name--string--tag--false',
											key: k8sNodeNameKey,
											type: 'tag',
										},
										op: '=',
										value: node.meta.k8s_node_name,
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
							queryName: 'B',
							reduceTo: ReduceOperators.AVG,
							spaceAggregation: 'max',
							stepInterval: 60,
							timeAggregation: 'latest',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'k8s_container_cpu_request--float64--Gauge--true',
								key: k8sContainerCpuRequestKey,
								type: 'Gauge',
							},
							aggregateOperator: 'latest',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'C',
							filters: {
								items: [
									{
										id: '884c2bf3',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_node_name--string--tag--false',
											key: k8sNodeNameKey,
											type: 'tag',
										},
										op: '=',
										value: node.meta.k8s_node_name,
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
							queryName: 'C',
							reduceTo: ReduceOperators.AVG,
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'latest',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'k8s_node_cpu_usage--float64--Gauge--true',
								key: k8sNodeCpuUtilizationKey,
								type: 'Gauge',
							},
							aggregateOperator: 'max',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'D',
							filters: {
								items: [
									{
										id: '98be9da1',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_node_name--string--tag--false',
											key: k8sNodeNameKey,
											type: 'tag',
										},
										op: '=',
										value: node.meta.k8s_node_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'used (max)',
							limit: null,
							orderBy: [],
							queryName: 'D',
							reduceTo: ReduceOperators.AVG,
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'max',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'k8s_node_cpu_usage--float64--Gauge--true',
								key: k8sNodeCpuUtilizationKey,
								type: 'Gauge',
							},
							aggregateOperator: 'min',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'E',
							filters: {
								items: [
									{
										id: 'ce97dd7b',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_node_name--string--tag--false',
											key: k8sNodeNameKey,
											type: 'tag',
										},
										op: '=',
										value: node.meta.k8s_node_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'used (min)',
							limit: null,
							orderBy: [],
							queryName: 'E',
							reduceTo: ReduceOperators.AVG,
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'min',
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
								id: 'k8s_node_memory_usage--float64--Gauge--true',
								key: k8sNodeMemoryUsageKey,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'A',
							filters: {
								items: [
									{
										id: 'fdffcbb2',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_node_name--string--tag--false',
											key: k8sNodeNameKey,
											type: 'tag',
										},
										op: '=',
										value: node.meta.k8s_node_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'used (avg)',
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
								id: 'k8s_node_allocatable_memory--float64--Gauge--true',
								key: k8sNodeAllocatableMemoryKey,
								type: 'Gauge',
							},
							aggregateOperator: 'latest',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'B',
							filters: {
								items: [
									{
										id: '9b79a8bd',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_node_name--string--tag--false',
											key: k8sNodeNameKey,
											type: 'tag',
										},
										op: '=',
										value: node.meta.k8s_node_name,
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
							queryName: 'B',
							reduceTo: ReduceOperators.AVG,
							spaceAggregation: 'max',
							stepInterval: 60,
							timeAggregation: 'latest',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'k8s_container_memory_request--float64--Gauge--true',
								key: k8sContainerMemoryRequestKey,
								type: 'Gauge',
							},
							aggregateOperator: 'latest',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'C',
							filters: {
								items: [
									{
										id: '3387fb4a',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_node_name--string--tag--false',
											key: k8sNodeNameKey,
											type: 'tag',
										},
										op: '=',
										value: node.meta.k8s_node_name,
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
							queryName: 'C',
							reduceTo: ReduceOperators.AVG,
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'latest',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'k8s_node_memory_usage--float64--Gauge--true',
								key: k8sNodeMemoryUsageKey,
								type: 'Gauge',
							},
							aggregateOperator: 'max',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'D',
							filters: {
								items: [
									{
										id: 'd1ad7ccb',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_node_name--string--tag--false',
											key: k8sNodeNameKey,
											type: 'tag',
										},
										op: '=',
										value: node.meta.k8s_node_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'used (max)',
							limit: null,
							orderBy: [],
							queryName: 'D',
							reduceTo: ReduceOperators.AVG,
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'max',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'k8s_node_memory_usage--float64--Gauge--true',
								key: k8sNodeMemoryUsageKey,
								type: 'Gauge',
							},
							aggregateOperator: 'min',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'E',
							filters: {
								items: [
									{
										id: '5e578329',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_node_name--string--tag--false',
											key: k8sNodeNameKey,
											type: 'tag',
										},
										op: '=',
										value: node.meta.k8s_node_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'used (min)',
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
								id: 'k8s_node_memory_working_set--float64--Gauge--true',
								key: k8sNodeMemoryWorkingSetKey,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'F',
							filters: {
								items: [
									{
										id: '6ab3ec98',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_node_name--string--tag--false',
											key: k8sNodeNameKey,
											type: 'tag',
										},
										op: '=',
										value: node.meta.k8s_node_name,
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
							queryName: 'F',
							reduceTo: ReduceOperators.AVG,
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'avg',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'k8s_node_memory_rss--float64--Gauge--true',
								key: k8sNodeMemoryRssKey,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'G',
							filters: {
								items: [
									{
										id: '80c9a1db',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_node_name--string--tag--false',
											key: k8sNodeNameKey,
											type: 'tag',
										},
										op: '=',
										value: node.meta.k8s_node_name,
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
							queryName: 'G',
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
								id: 'k8s_node_cpu_usage--float64--Gauge--true',
								key: k8sNodeCpuUtilizationKey,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: true,
							expression: 'A',
							filters: {
								items: [
									{
										id: '752765ef',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_node_name--string--tag--false',
											key: k8sNodeNameKey,
											type: 'tag',
										},
										op: '=',
										value: node.meta.k8s_node_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'used',
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
								id: 'k8s_node_allocatable_cpu--float64--Gauge--true',
								key: k8sNodeAllocatableCpuKey,
								type: 'Gauge',
							},
							aggregateOperator: 'latest',
							dataSource: DataSource.METRICS,
							disabled: true,
							expression: 'B',
							filters: {
								items: [
									{
										id: 'f0c5c1ed',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_node_name--string--tag--false',
											key: k8sNodeNameKey,
											type: 'tag',
										},
										op: '=',
										value: node.meta.k8s_node_name,
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
							queryName: 'B',
							reduceTo: ReduceOperators.AVG,
							spaceAggregation: 'max',
							stepInterval: 60,
							timeAggregation: 'latest',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'k8s_container_cpu_request--float64--Gauge--true',
								key: k8sContainerCpuRequestKey,
								type: 'Gauge',
							},
							aggregateOperator: 'latest',
							dataSource: DataSource.METRICS,
							disabled: true,
							expression: 'C',
							filters: {
								items: [
									{
										id: 'b952b389',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_node_name--string--tag--false',
											key: k8sNodeNameKey,
											type: 'tag',
										},
										op: '=',
										value: node.meta.k8s_node_name,
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
							queryName: 'C',
							reduceTo: ReduceOperators.AVG,
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'latest',
						},
					],
					queryFormulas: [
						{
							disabled: false,
							expression: 'A/B',
							legend: 'used/allocatable',
							queryName: 'F1',
						},
						{
							disabled: false,
							expression: 'A/C',
							legend: 'used/request',
							queryName: 'F2',
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
								id: 'k8s_node_memory_usage--float64--Gauge--true',
								key: k8sNodeMemoryUsageKey,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: true,
							expression: 'A',
							filters: {
								items: [
									{
										id: 'c2a2c926',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_node_name--string--tag--false',
											key: k8sNodeNameKey,
											type: 'tag',
										},
										op: '=',
										value: node.meta.k8s_node_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'used',
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
								id: 'k8s_node_allocatable_memory--float64--Gauge--true',
								key: k8sNodeAllocatableMemoryKey,
								type: 'Gauge',
							},
							aggregateOperator: 'latest',
							dataSource: DataSource.METRICS,
							disabled: true,
							expression: 'B',
							filters: {
								items: [
									{
										id: '20e6760c',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_node_name--string--tag--false',
											key: k8sNodeNameKey,
											type: 'tag',
										},
										op: '=',
										value: node.meta.k8s_node_name,
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
							queryName: 'B',
							reduceTo: ReduceOperators.AVG,
							spaceAggregation: 'max',
							stepInterval: 60,
							timeAggregation: 'latest',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'k8s_container_memory_request--float64--Gauge--true',
								key: k8sContainerMemoryRequestKey,
								type: 'Gauge',
							},
							aggregateOperator: 'latest',
							dataSource: DataSource.METRICS,
							disabled: true,
							expression: 'C',
							filters: {
								items: [
									{
										id: 'fcc4d5e8',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_node_name--string--tag--false',
											key: k8sNodeNameKey,
											type: 'tag',
										},
										op: '=',
										value: node.meta.k8s_node_name,
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
							queryName: 'C',
							reduceTo: ReduceOperators.AVG,
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'latest',
						},
					],
					queryFormulas: [
						{
							disabled: false,
							expression: 'A/B',
							legend: 'used/allocatable',
							queryName: 'F1',
						},
						{
							disabled: false,
							expression: 'A/C',
							legend: 'used/request',
							queryName: 'F2',
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
								id: 'k8s_pod_cpu_usage--float64--Gauge--true',
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
										id: '88d38c06',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_node_name--string--tag--false',
											key: k8sNodeNameKey,
											type: 'tag',
										},
										op: '=',
										value: node.meta.k8s_node_name,
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
								id: 'k8s_pod_memory_usage--float64--Gauge--true',
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
										id: '43033387',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_node_name--string--tag--false',
											key: k8sNodeNameKey,
											type: 'tag',
										},
										op: '=',
										value: node.meta.k8s_node_name,
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
								id: 'k8s_node_network_errors--float64--Sum--true',
								key: k8sNodeNetworkErrorsKey,
								type: 'Sum',
							},
							aggregateOperator: 'increase',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'A',
							filters: {
								items: [
									{
										id: 'e9ce8079',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_node_name--string--tag--false',
											key: k8sNodeNameKey,
											type: 'tag',
										},
										op: '=',
										value: node.meta.k8s_node_name,
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
									id: 'interface--string--tag--false',
									key: 'interface',
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
			graphType: PANEL_TYPES.TIME_SERIES,
			query: {
				builder: {
					queryData: [
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'k8s_node_network_io--float64--Sum--true',
								key: k8sNodeNetworkIoKey,
								type: 'Sum',
							},
							aggregateOperator: 'rate',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'A',
							filters: {
								items: [
									{
										id: 'd62d103f',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_node_name--string--tag--false',
											key: k8sNodeNameKey,
											type: 'tag',
										},
										op: '=',
										value: node.meta.k8s_node_name,
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
									id: 'interface--string--tag--false',
									key: 'interface',
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
								dataType: DataTypes.Float64,
								id: 'k8s_node_filesystem_usage--float64--Gauge--true',
								key: k8sNodeFilesystemUsageKey,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'A',
							filters: {
								items: [
									{
										id: 'b85d3580',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_node_name--string--tag--false',
											key: k8sNodeNameKey,
											type: 'tag',
										},
										op: '=',
										value: node.meta.k8s_node_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'used',
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
								id: 'k8s_node_filesystem_capacity--float64--Gauge--true',
								key: k8sNodeFilesystemCapacityKey,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'B',
							filters: {
								items: [
									{
										id: '23f502e1',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_node_name--string--tag--false',
											key: k8sNodeNameKey,
											type: 'tag',
										},
										op: '=',
										value: node.meta.k8s_node_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'capacity',
							limit: null,
							orderBy: [],
							queryName: 'B',
							reduceTo: ReduceOperators.AVG,
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'avg',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'k8s_node_filesystem_available--float64--Gauge--true',
								key: k8sNodeFilesystemAvailableKey,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'C',
							filters: {
								items: [
									{
										id: 'b80650ec',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_node_name--string--tag--false',
											key: k8sNodeNameKey,
											type: 'tag',
										},
										op: '=',
										value: node.meta.k8s_node_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'available',
							limit: null,
							orderBy: [],
							queryName: 'C',
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
								id: 'k8s_node_filesystem_usage--float64--Gauge--true',
								key: k8sNodeFilesystemUsageKey,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: true,
							expression: 'A',
							filters: {
								items: [
									{
										id: 'b85d3580',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_node_name--string--tag--false',
											key: k8sNodeNameKey,
											type: 'tag',
										},
										op: '=',
										value: node.meta.k8s_node_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'used',
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
								id: 'k8s_node_filesystem_capacity--float64--Gauge--true',
								key: k8sNodeFilesystemCapacityKey,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: true,
							expression: 'B',
							filters: {
								items: [
									{
										id: '23f502e1',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_node_name--string--tag--false',
											key: k8sNodeNameKey,
											type: 'tag',
										},
										op: '=',
										value: node.meta.k8s_node_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'capacity',
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
			formatForWeb: false,
			start,
			end,
		},
	];
};
