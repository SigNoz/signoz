/* eslint-disable sonarjs/no-duplicate-string */
import { K8sJobsData } from 'api/infraMonitoring/getK8sJobsList';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';
import { v4 } from 'uuid';

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
): GetQueryResultsProps[] => [
	{
		selectedTime: 'GLOBAL_TIME',
		graphType: PANEL_TYPES.TIME_SERIES,
		query: {
			builder: {
				queryData: [
					{
						aggregateAttribute: {
							dataType: DataTypes.Float64,
							id: 'k8s_pod_cpu_utilization--float64--Gauge--true',
							isColumn: true,
							isJSON: false,
							key: 'k8s_pod_cpu_utilization',
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
										isColumn: false,
										isJSON: false,
										key: 'k8s_job_name',
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
										isColumn: false,
										isJSON: false,
										key: 'k8s_namespace_name',
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
						reduceTo: 'avg',
						spaceAggregation: 'sum',
						stepInterval: 60,
						timeAggregation: 'avg',
					},
				],
				queryFormulas: [],
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
							isColumn: true,
							isJSON: false,
							key: 'k8s_pod_memory_usage',
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
										isColumn: false,
										isJSON: false,
										key: 'k8s_job_name',
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
										isColumn: false,
										isJSON: false,
										key: 'k8s_namespace_name',
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
						reduceTo: 'avg',
						spaceAggregation: 'sum',
						stepInterval: 60,
						timeAggregation: 'avg',
					},
				],
				queryFormulas: [],
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
							isColumn: true,
							isJSON: false,
							key: 'k8s_pod_network_io',
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
										isColumn: false,
										isJSON: false,
										key: 'k8s_job_name',
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
										isColumn: false,
										isJSON: false,
										key: 'k8s_namespace_name',
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
								isColumn: false,
								isJSON: false,
								key: 'direction',
								type: 'tag',
							},
							{
								dataType: DataTypes.String,
								id: 'interface--string--tag--false',
								isColumn: false,
								isJSON: false,
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
							isColumn: true,
							isJSON: false,
							key: 'k8s_pod_network_errors',
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
										isColumn: false,
										isJSON: false,
										key: 'k8s_job_name',
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
										isColumn: false,
										isJSON: false,
										key: 'k8s_namespace_name',
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
								isColumn: false,
								isJSON: false,
								key: 'direction',
								type: 'tag',
							},
							{
								dataType: DataTypes.String,
								id: 'interface--string--tag--false',
								isColumn: false,
								isJSON: false,
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
