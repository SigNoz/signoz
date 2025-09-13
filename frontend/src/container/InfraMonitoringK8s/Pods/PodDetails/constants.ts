/* eslint-disable sonarjs/no-duplicate-string */
import { K8sPodsData } from 'api/infraMonitoring/getK8sPodsList';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';
import { v4 } from 'uuid';

export const podWidgetInfo = [
	{
		title: 'CPU Usage (cores)',
		yAxisUnit: '',
	},
	{
		title: 'CPU Request, Limit Utilization',
		yAxisUnit: 'percentunit',
	},
	{
		title: 'Memory Usage (bytes)',
		yAxisUnit: 'bytes',
	},
	{
		title: 'Memory Request, Limit Utilization',
		yAxisUnit: 'percentunit',
	},
	{
		title: 'Memory by State',
		yAxisUnit: 'bytes',
	},
	{
		title: 'Memory Major Page Faults',
		yAxisUnit: '',
	},
	{
		title: 'CPU Usage by Container (cores)',
		yAxisUnit: '',
	},
	{
		title: 'CPU Request, Limit Utilization by Container',
		yAxisUnit: 'percentunit',
	},
	{
		title: 'Memory Usage by Container (bytes)',
		yAxisUnit: 'bytes',
	},
	{
		title: 'Memory Request, Limit Utilization by Container',
		yAxisUnit: 'percentunit',
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
		title: 'File system (bytes)',
		yAxisUnit: 'bytes',
	},
];

export const getPodMetricsQueryPayload = (
	pod: K8sPodsData,
	start: number,
	end: number,
	dotMetricsEnabled: boolean,
): GetQueryResultsProps[] => {
	const getKey = (dotKey: string, underscoreKey: string): string =>
		dotMetricsEnabled ? dotKey : underscoreKey;
	const k8sContainerNameKey = getKey('k8s.container.name', 'k8s_container_name');

	const k8sPodCpuUtilKey = getKey('k8s.pod.cpu.usage', 'k8s_pod_cpu_usage');

	const k8sPodCpuReqUtilKey = getKey(
		'k8s.pod.cpu_request_utilization',
		'k8s_pod_cpu_request_utilization',
	);

	const k8sPodCpuLimitUtilKey = getKey(
		'k8s.pod.cpu_limit_utilization',
		'k8s_pod_cpu_limit_utilization',
	);

	const k8sPodMemUsageKey = getKey(
		'k8s.pod.memory.usage',
		'k8s_pod_memory_usage',
	);

	const k8sPodMemReqUtilKey = getKey(
		'k8s.pod.memory_request_utilization',
		'k8s_pod_memory_request_utilization',
	);

	const k8sPodMemLimitUtilKey = getKey(
		'k8s.pod.memory_limit_utilization',
		'k8s_pod_memory_limit_utilization',
	);

	const k8sPodMemRssKey = getKey('k8s.pod.memory.rss', 'k8s_pod_memory_rss');

	const k8sPodMemWorkingSetKey = getKey(
		'k8s.pod.memory.working_set',
		'k8s_pod_memory_working_set',
	);

	const k8sPodMemMajorPFKey = getKey(
		'k8s.pod.memory.major_page_faults',
		'k8s_pod_memory_major_page_faults',
	);

	const containerCpuUtilKey = getKey(
		'container.cpu.usage',
		'container_cpu_usage',
	);

	const k8sContainerCpuRequestKey = getKey(
		'k8s.container.cpu_request',
		'k8s_container_cpu_request',
	);

	const k8sContainerCpuLimitKey = getKey(
		'k8s.container.cpu_limit',
		'k8s_container_cpu_limit',
	);

	const k8sContainerMemoryLimitKey = getKey(
		'k8s.container.memory_limit',
		'k8s_container_memory_limit',
	);

	const k8sContainerMemoryRequestKey = getKey(
		'k8s.container.memory_request',
		'k8s_container_memory_request',
	);

	const containerMemUsageKey = getKey(
		'container.memory.usage',
		'container_memory_usage',
	);

	const containerMemWorkingSetKey = getKey(
		'container.memory.working_set',
		'container_memory_working_set',
	);

	const containerMemRssKey = getKey(
		'container.memory.rss',
		'container_memory_rss',
	);

	const k8sPodNetworkIoKey = getKey('k8s.pod.network.io', 'k8s_pod_network_io');

	const k8sPodNetworkErrorsKey = getKey(
		'k8s.pod.network.errors',
		'k8s_pod_network_errors',
	);

	const k8sPodFilesystemCapacityKey = getKey(
		'k8s.pod.filesystem.capacity',
		'k8s_pod_filesystem_capacity',
	);

	const k8sPodFilesystemAvailableKey = getKey(
		'k8s.pod.filesystem.available',
		'k8s_pod_filesystem_available',
	);

	const k8sPodFilesystemUsageKey = getKey(
		'k8s.pod.filesystem.usage',
		'k8s_pod_filesystem_usage',
	);

	const k8sPodNameKey = getKey('k8s.pod.name', 'k8s_pod_name');

	const k8sNamespaceNameKey = getKey('k8s.namespace.name', 'k8s_namespace_name');
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
										id: 'e812bfd9',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',
											key: k8sPodNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_pod_name,
									},
									{
										id: '067b2dc4',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_namespace_name--string--tag--false',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_namespace_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'Avg',
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
								id: 'k8s_pod_cpu_usage--float64--Gauge--true',
								key: k8sPodCpuUtilKey,
								type: 'Gauge',
							},
							aggregateOperator: 'max',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'B',
							filters: {
								items: [
									{
										id: '37729a44',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',
											key: k8sPodNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_pod_name,
									},
									{
										id: '379af416',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_namespace_name--string--tag--false',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_namespace_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'Max',
							limit: null,
							orderBy: [],
							queryName: 'B',
							reduceTo: 'avg',
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'max',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'k8s_pod_cpu_usage--float64--Gauge--true',
								key: k8sPodCpuUtilKey,
								type: 'Gauge',
							},
							aggregateOperator: 'min',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'C',
							filters: {
								items: [
									{
										id: '481db9b1',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',
											key: k8sPodNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_pod_name,
									},
									{
										id: '39ee0dbd',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_namespace_name--string--tag--false',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_namespace_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'Min',
							limit: null,
							orderBy: [],
							queryName: 'C',
							reduceTo: 'avg',
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
								id: 'k8s_pod_cpu_request_utilization--float64--Gauge--true',
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
										id: '2ea54c80',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_namespace_name--string--tag--false',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_namespace_name,
									},
									{
										id: '755c8a9d',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',
											key: k8sPodNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_pod_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'Request util % - Avg',
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
								id: 'k8s_pod_cpu_limit_utilization--float64--Gauge--true',
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
										id: '7243d538',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_namespace_name--string--tag--false',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_namespace_name,
									},
									{
										id: '1e3d01ee',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',
											key: k8sPodNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_pod_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'Limit util % - Avg',
							limit: null,
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
								id: 'k8s_pod_cpu_request_utilization--float64--Gauge--true',
								key: k8sPodCpuReqUtilKey,
								type: 'Gauge',
							},
							aggregateOperator: 'max',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'C',
							filters: {
								items: [
									{
										id: '3ec4e2b6',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_namespace_name--string--tag--false',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_namespace_name,
									},
									{
										id: '0c8b2662',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',
											key: k8sPodNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_pod_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'Request util % - Max',
							limit: null,
							orderBy: [],
							queryName: 'C',
							reduceTo: 'avg',
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'max',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'k8s_pod_cpu_request_utilization--float64--Gauge--true',
								key: k8sPodCpuReqUtilKey,
								type: 'Gauge',
							},
							aggregateOperator: 'min',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'D',
							filters: {
								items: [
									{
										id: 'abe996ed',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_namespace_name--string--tag--false',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_namespace_name,
									},
									{
										id: 'e915da76',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',
											key: k8sPodNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_pod_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'Request util % - Min',
							limit: null,
							orderBy: [],
							queryName: 'D',
							reduceTo: 'avg',
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'min',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'k8s_pod_cpu_limit_utilization--float64--Gauge--true',
								key: k8sPodCpuLimitUtilKey,
								type: 'Gauge',
							},
							aggregateOperator: 'max',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'E',
							filters: {
								items: [
									{
										id: '3addc70a',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_namespace_name--string--tag--false',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_namespace_name,
									},
									{
										id: '32c15c03',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',
											key: k8sPodNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_pod_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'Limit util % - Max',
							limit: null,
							orderBy: [],
							queryName: 'E',
							reduceTo: 'avg',
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'max',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'k8s_pod_cpu_limit_utilization--float64--Gauge--true',
								key: k8sPodCpuLimitUtilKey,
								type: 'Gauge',
							},
							aggregateOperator: 'min',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'F',
							filters: {
								items: [
									{
										id: 'da9de2a8',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_namespace_name--string--tag--false',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_namespace_name,
									},
									{
										id: '703fced1',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',
											key: k8sPodNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_pod_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'Limit util % - Min',
							limit: null,
							orderBy: [],
							queryName: 'F',
							reduceTo: 'avg',
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
								id: 'k8s_pod_memory_usage--float64--Gauge--true',
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
										id: 'e6ca88fe',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_namespace_name--string--tag--false',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_namespace_name,
									},
									{
										id: '5418405c',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',
											key: k8sPodNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_pod_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'Avg',
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
								id: 'k8s_pod_memory_usage--float64--Gauge--true',
								key: k8sPodMemUsageKey,
								type: 'Gauge',
							},
							aggregateOperator: 'max',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'B',
							filters: {
								items: [
									{
										id: 'cd9de239',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_namespace_name--string--tag--false',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_namespace_name,
									},
									{
										id: '1ea5c602',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',
											key: k8sPodNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_pod_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'Max',
							limit: null,
							orderBy: [],
							queryName: 'B',
							reduceTo: 'avg',
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'max',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'k8s_pod_memory_usage--float64--Gauge--true',
								key: k8sPodMemUsageKey,
								type: 'Gauge',
							},
							aggregateOperator: 'min',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'C',
							filters: {
								items: [
									{
										id: '952e535a',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_namespace_name--string--tag--false',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_namespace_name,
									},
									{
										id: 'd7632974',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',
											key: k8sPodNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_pod_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'Min',
							limit: null,
							orderBy: [],
							queryName: 'C',
							reduceTo: 'avg',
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
								id: 'k8s_pod_memory_request_utilization--float64--Gauge--true',
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
										id: '65969a40',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_namespace_name--string--tag--false',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_namespace_name,
									},
									{
										id: '5a822bec',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',
											key: k8sPodNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_pod_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'Request util % - Avg',
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
								id: 'k8s_pod_memory_limit_utilization--float64--Gauge--true',
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
										id: 'bd3dcfd4',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_namespace_name--string--tag--false',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_namespace_name,
									},
									{
										id: '3362c603',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',
											key: k8sPodNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_pod_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'Limit util % - Avg',
							limit: null,
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
								id: 'k8s_pod_memory_request_utilization--float64--Gauge--true',
								key: k8sPodMemReqUtilKey,
								type: 'Gauge',
							},
							aggregateOperator: 'max',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'C',
							filters: {
								items: [
									{
										id: '04f5aff6',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_namespace_name--string--tag--false',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_namespace_name,
									},
									{
										id: 'ce88008b',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',
											key: k8sPodNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_pod_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'Request util % - Max',
							limit: null,
							orderBy: [],
							queryName: 'C',
							reduceTo: 'avg',
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'max',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'k8s_pod_memory_limit_utilization--float64--Gauge--true',
								key: k8sPodMemLimitUtilKey,
								type: 'Gauge',
							},
							aggregateOperator: 'max',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'D',
							filters: {
								items: [
									{
										id: '8718a7d7',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_namespace_name--string--tag--false',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_namespace_name,
									},
									{
										id: '53fc92fd',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',
											key: k8sPodNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_pod_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'Limit util % - Max',
							limit: null,
							orderBy: [],
							queryName: 'D',
							reduceTo: 'avg',
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'max',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'k8s_pod_memory_request_utilization--float64--Gauge--true',
								key: k8sPodMemReqUtilKey,
								type: 'Gauge',
							},
							aggregateOperator: 'min',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'E',
							filters: {
								items: [
									{
										id: '990f8296',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_namespace_name--string--tag--false',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_namespace_name,
									},
									{
										id: '61dfa9f6',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',
											key: k8sPodNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_pod_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'Request util % - Min',
							limit: null,
							orderBy: [],
							queryName: 'E',
							reduceTo: 'avg',
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'min',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'k8s_pod_memory_limit_utilization--float64--Gauge--true',
								key: k8sPodMemLimitUtilKey,
								type: 'Gauge',
							},
							aggregateOperator: 'min',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'F',
							filters: {
								items: [
									{
										id: '4c78ab5c',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_namespace_name--string--tag--false',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_namespace_name,
									},
									{
										id: '508cdf26',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',
											key: k8sPodNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_pod_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'Limit util % - Min',
							limit: null,
							orderBy: [],
							queryName: 'F',
							reduceTo: 'avg',
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
								id: 'k8s_pod_memory_rss--float64--Gauge--true',
								key: k8sPodMemRssKey,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'A',
							filters: {
								items: [
									{
										id: 'f66ff082',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_namespace_name--string--tag--false',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_namespace_name,
									},
									{
										id: '80528f79',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',
											key: k8sPodNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_pod_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'RSS Memory',
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
								id: 'k8s_pod_memory_working_set--float64--Gauge--true',
								key: k8sPodMemWorkingSetKey,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'B',
							filters: {
								items: [
									{
										id: '2cae58e7',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_namespace_name--string--tag--false',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_namespace_name,
									},
									{
										id: '780cc786',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',
											key: k8sPodNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_pod_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'Working Set Memory',
							limit: null,
							orderBy: [],
							queryName: 'B',
							reduceTo: 'avg',
							spaceAggregation: 'avg',
							stepInterval: 60,
							timeAggregation: 'avg',
						},
					],
					queryFormulas: [
						{
							disabled: false,
							expression: 'B-A',
							legend: 'Cache Memory',
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
		{
			selectedTime: 'GLOBAL_TIME',
			graphType: PANEL_TYPES.TIME_SERIES,
			query: {
				builder: {
					queryData: [
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'k8s_pod_memory_major_page_faults--float64--Gauge--true',
								key: k8sPodMemMajorPFKey,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'A',
							filters: {
								items: [
									{
										id: '7ad40408',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_namespace_name--string--tag--false',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_namespace_name,
									},
									{
										id: '8b2a539b',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',
											key: k8sPodNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_pod_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'major page faults',
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
										id: 'fdf017be',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_namespace_name--string--tag--false',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_namespace_name,
									},
									{
										id: '4b4382be',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',
											key: k8sPodNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_pod_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'k8s_container_name--string--tag--false',
									key: k8sContainerNameKey,
									type: 'tag',
								},
							],
							having: [],
							legend: `{{${k8sContainerNameKey}}}`,
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
										id: 'f0c71cba',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_namespace_name--string--tag--false',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_namespace_name,
									},
									{
										id: '9301d7c0',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',
											key: k8sPodNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_pod_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'k8s_container_name--string--tag--false',
									key: k8sContainerNameKey,
									type: 'tag',
								},
							],
							having: [],
							legend: '',
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
								id: 'k8s_container_cpu_request--float64--Gauge--true',
								key: k8sContainerCpuRequestKey,
								type: 'Gauge',
							},
							aggregateOperator: 'latest',
							dataSource: DataSource.METRICS,
							disabled: true,
							expression: 'B',
							filters: {
								items: [
									{
										id: '9b14868b',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_namespace_name--string--tag--false',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_namespace_name,
									},
									{
										id: '92b99374',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',
											key: k8sPodNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_pod_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'k8s_container_name--string--tag--false',
									key: k8sContainerNameKey,
									type: 'tag',
								},
							],
							having: [],
							legend: '',
							limit: null,
							orderBy: [],
							queryName: 'B',
							reduceTo: 'avg',
							spaceAggregation: 'max',
							stepInterval: 60,
							timeAggregation: 'latest',
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
							expression: 'C',
							filters: {
								items: [
									{
										id: '1de8c8b9',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_namespace_name--string--tag--false',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_namespace_name,
									},
									{
										id: '1c7de95d',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',
											key: k8sPodNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_pod_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'k8s_container_name--string--tag--false',
									key: k8sContainerNameKey,
									type: 'tag',
								},
							],
							having: [],
							legend: '',
							limit: null,
							orderBy: [],
							queryName: 'C',
							reduceTo: 'avg',
							spaceAggregation: 'max',
							stepInterval: 60,
							timeAggregation: 'latest',
						},
					],
					queryFormulas: [
						{
							disabled: false,
							expression: 'A/B',
							legend: `Req % : {{${k8sContainerNameKey}}} `,
							queryName: 'F1',
						},
						{
							disabled: false,
							expression: 'A/C',
							legend: `Limit % : {{${k8sContainerNameKey}}}`,
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
										id: 'e8914a2d',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_namespace_name--string--tag--false',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_namespace_name,
									},
									{
										id: '964fd905',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',
											key: k8sPodNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_pod_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'k8s_container_name--string--tag--false',
									key: k8sContainerNameKey,
									type: 'tag',
								},
							],
							having: [],
							legend: `usage :: {{${k8sContainerNameKey}}}`,
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
								id: 'container_memory_working_set--float64--Gauge--true',
								key: containerMemWorkingSetKey,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'B',
							filters: {
								items: [
									{
										id: 'a2f69b5d',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_namespace_name--string--tag--false',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_namespace_name,
									},
									{
										id: '76a586be',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',
											key: k8sPodNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_pod_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'k8s_container_name--string--tag--false',
									key: k8sContainerNameKey,
									type: 'tag',
								},
							],
							having: [],
							legend: `working set :: {{${k8sContainerNameKey}}}`,
							limit: null,
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
								id: 'container_memory_rss--float64--Gauge--true',
								key: containerMemRssKey,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'C',
							filters: {
								items: [
									{
										id: '95fc86d1',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_namespace_name--string--tag--false',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_namespace_name,
									},
									{
										id: '7c5f875b',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',
											key: k8sPodNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_pod_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'k8s_container_name--string--tag--false',
									key: k8sContainerNameKey,
									type: 'tag',
								},
							],
							having: [],
							legend: `rss :: {{${k8sContainerNameKey}}}`,
							limit: null,
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
										id: 'c2d56c31',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_namespace_name--string--tag--false',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_namespace_name,
									},
									{
										id: '80216712',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',
											key: k8sPodNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_pod_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'k8s_container_name--string--tag--false',
									key: k8sContainerNameKey,
									type: 'tag',
								},
							],
							having: [],
							legend: '',
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
								id: 'k8s_container_memory_request--float64--Gauge--true',
								key: k8sContainerMemoryRequestKey,
								type: 'Gauge',
							},
							aggregateOperator: 'latest',
							dataSource: DataSource.METRICS,
							disabled: true,
							expression: 'B',
							filters: {
								items: [
									{
										id: 'c04e7733',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_namespace_name--string--tag--false',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_namespace_name,
									},
									{
										id: '84b59a9f',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',
											key: k8sPodNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_pod_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'k8s_container_name--string--tag--false',
									key: k8sContainerNameKey,
									type: 'tag',
								},
							],
							having: [],
							legend: '',
							limit: null,
							orderBy: [],
							queryName: 'B',
							reduceTo: 'avg',
							spaceAggregation: 'max',
							stepInterval: 60,
							timeAggregation: 'latest',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'k8s_container_memory_limit--float64--Gauge--true',
								key: k8sContainerMemoryLimitKey,
								type: 'Gauge',
							},
							aggregateOperator: 'latest',
							dataSource: DataSource.METRICS,
							disabled: true,
							expression: 'C',
							filters: {
								items: [
									{
										id: 'd1549857',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_namespace_name--string--tag--false',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_namespace_name,
									},
									{
										id: 'd649ad0c',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',
											key: k8sPodNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_pod_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'k8s_container_name--string--tag--false',
									key: k8sContainerNameKey,
									type: 'tag',
								},
							],
							having: [],
							legend: '',
							limit: null,
							orderBy: [],
							queryName: 'C',
							reduceTo: 'avg',
							spaceAggregation: 'max',
							stepInterval: 60,
							timeAggregation: 'latest',
						},
					],
					queryFormulas: [
						{
							disabled: false,
							expression: 'A/B',
							legend: `Req % : {{${k8sContainerNameKey}}} `,
							queryName: 'F1',
						},
						{
							disabled: false,
							expression: 'A/C',
							legend: `Limit % : {{${k8sContainerNameKey}}} `,
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
								id: 'k8s_pod_network_io--float64--Sum--true',
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
										id: '29bc6602',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_namespace_name--string--tag--false',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_namespace_name,
									},
									{
										id: 'bc9c5cf3',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',
											key: k8sPodNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_pod_name,
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
								id: 'k8s_pod_network_errors--float64--Sum--true',
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
										id: '200e722b',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_namespace_name--string--tag--false',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_namespace_name,
									},
									{
										id: 'b54a3d78',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',
											key: k8sPodNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_pod_name,
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
								id: 'k8s_pod_filesystem_capacity--float64--Gauge--true',
								key: k8sPodFilesystemCapacityKey,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'A',
							filters: {
								items: [
									{
										id: '779f7a2e',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_namespace_name--string--tag--false',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_namespace_name,
									},
									{
										id: '1a97cb95',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',
											key: k8sPodNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_pod_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'Capacity',
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
								id: 'k8s_pod_filesystem_available--float64--Gauge--true',
								key: k8sPodFilesystemAvailableKey,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'B',
							filters: {
								items: [
									{
										id: 'dd756bfe',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_namespace_name--string--tag--false',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_namespace_name,
									},
									{
										id: 'ddfbd379',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',
											key: k8sPodNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_pod_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'Available',
							limit: null,
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
								id: 'k8s_pod_filesystem_usage--float64--Gauge--true',
								key: k8sPodFilesystemUsageKey,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'C',
							filters: {
								items: [
									{
										id: 'a5ac4705',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_namespace_name--string--tag--false',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_namespace_name,
									},
									{
										id: '1963fc96',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',
											key: k8sPodNameKey,
											type: 'tag',
										},
										op: '=',
										value: pod.meta.k8s_pod_name,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: 'Uage',
							limit: null,
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
