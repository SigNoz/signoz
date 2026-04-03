import { PANEL_TYPES } from 'constants/queryBuilder';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { DataSource, ReduceOperators } from 'types/common/queryBuilder';
import { v4 } from 'uuid';

import {
	createFilterItem,
	K8sDetailsMetadataConfig,
} from '../Base/K8sBaseDetails';
import { QUERY_KEYS } from '../EntityDetailsUtils/utils';
import { K8sJobsData } from './api';

export const k8sJobGetSelectedItemFilters = (
	selectedItemId: string,
): TagFilter => ({
	op: 'AND',
	items: [
		{
			id: 'k8s_job_name',
			key: {
				key: 'k8s_job_name',
				type: null,
			},
			op: '=',
			value: selectedItemId,
		},
	],
});

export const k8sJobDetailsMetadataConfig: K8sDetailsMetadataConfig<K8sJobsData>[] = [
	{
		label: 'Job Name',
		getValue: (p): string => p.meta.k8s_job_name,
	},
	{
		label: 'Cluster Name',
		getValue: (p): string => p.meta.k8s_cluster_name,
	},
	{
		label: 'Namespace Name',
		getValue: (p): string => p.meta.k8s_namespace_name,
	},
];

export const k8sJobInitialFilters = [
	QUERY_KEYS.K8S_JOB_NAME,
	QUERY_KEYS.K8S_NAMESPACE_NAME,
];

export const k8sJobInitialEventsFilter = (
	item: K8sJobsData,
): ReturnType<typeof createFilterItem>[] => [
	createFilterItem(QUERY_KEYS.K8S_OBJECT_KIND, 'Job'),
	createFilterItem(QUERY_KEYS.K8S_OBJECT_NAME, item.meta.k8s_job_name),
];

export const k8sJobInitialLogTracesFilter = (
	item: K8sJobsData,
): ReturnType<typeof createFilterItem>[] => [
	createFilterItem(QUERY_KEYS.K8S_JOB_NAME, item.meta.k8s_job_name),
	createFilterItem(QUERY_KEYS.K8S_NAMESPACE_NAME, item.meta.k8s_namespace_name),
];

export const k8sJobGetEntityName = (item: K8sJobsData): string =>
	item.meta.k8s_job_name;

export const jobWidgetInfo = [
	{
		title: 'CPU usage',
		yAxisUnit: '',
	},
	{
		title: 'Memory usage, request, limits',
		yAxisUnit: 'bytes',
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

export const getJobMetricsQueryPayload = (
	job: K8sJobsData,
	start: number,
	end: number,
	dotMetricsEnabled: boolean,
): GetQueryResultsProps[] => {
	const k8sPodCpuUtilizationKey = dotMetricsEnabled
		? 'k8s.pod.cpu.usage'
		: 'k8s_pod_cpu_usage';
	const k8sPodMemoryUsageKey = dotMetricsEnabled
		? 'k8s.pod.memory.usage'
		: 'k8s_pod_memory_usage';
	const k8sPodNetworkIoKey = dotMetricsEnabled
		? 'k8s.pod.network.io'
		: 'k8s_pod_network_io';
	const k8sPodNetworkErrorsKey = dotMetricsEnabled
		? 'k8s.pod.network.errors'
		: 'k8s_pod_network_errors';
	const k8sJobNameKey = dotMetricsEnabled ? 'k8s.job.name' : 'k8s_job_name';
	const k8sNamespaceNameKey = dotMetricsEnabled
		? 'k8s.namespace.name'
		: 'k8s_namespace_name';

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
										id: '6b59b690',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_job_name--string--tag--false',
											key: k8sJobNameKey,
											type: 'tag',
										},
										op: '=',
										value: job.jobName,
									},
									{
										id: '47b3adae',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_namespace_name--string--tag--false',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: job.meta.k8s_namespace_name,
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
										id: '8c217f4d',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_job_name--string--tag--false',
											key: k8sJobNameKey,
											type: 'tag',
										},
										op: '=',
										value: job.jobName,
									},
									{
										id: '47b3adae',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_namespace_name--string--tag--false',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: job.meta.k8s_namespace_name,
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
										id: '2bbf9d0c',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_job_name--string--tag--false',
											key: k8sJobNameKey,
											type: 'tag',
										},
										op: '=',
										value: job.jobName,
									},
									{
										id: '47b3adae',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_namespace_name--string--tag--false',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: job.meta.k8s_namespace_name,
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
										id: '448e6cf7',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_job_name--string--tag--false',
											key: k8sJobNameKey,
											type: 'tag',
										},
										op: '=',
										value: job.jobName,
									},
									{
										id: '47b3adae',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_namespace_name--string--tag--false',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: '=',
										value: job.meta.k8s_namespace_name,
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
	];
};
