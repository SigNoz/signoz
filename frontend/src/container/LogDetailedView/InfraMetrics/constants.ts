/* eslint-disable sonarjs/no-duplicate-string */
import { PANEL_TYPES } from 'constants/queryBuilder';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';

export const getQueryPayload = (
	clusterName: string,
	podName: string,
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
							id: 'k8s_pod_cpu_utilization--float64----true',
							isColumn: true,
							key: 'k8s_pod_cpu_utilization',
							type: '',
						},
						aggregateOperator: 'avg',
						dataSource: DataSource.METRICS,
						disabled: false,
						expression: 'A',
						filters: {
							items: [
								{
									id: '9a0ffaf3',
									key: {
										dataType: DataTypes.String,
										id: 'k8s_cluster_name--string--tag--false',
										isColumn: false,
										key: 'k8s_cluster_name',
										type: 'tag',
									},
									op: '=',
									value: clusterName,
								},
								{
									id: '9a0ffaf3',
									key: {
										dataType: DataTypes.String,
										id: 'k8s_pod_name--string--tag--false',
										isColumn: false,
										key: 'k8s_pod_name',
										type: 'tag',
									},
									op: '=',
									value: podName,
								},
							],
							op: 'AND',
						},
						groupBy: [
							{
								dataType: DataTypes.String,
								id: 'k8s_pod_name--string--tag--false',
								isColumn: false,
								key: 'k8s_pod_name',
								type: 'tag',
							},
						],
						having: [],
						legend: '{{k8s_pod_name}}',
						limit: null,
						orderBy: [],
						queryName: 'A',
						reduceTo: 'sum',
						spaceAggregation: 'sum',
						stepInterval: 60,
						timeAggregation: 'avg',
						functions: [],
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
			id: '3fe84db4-8f8b-44ba-b903-2daaab59c756',
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
		globalSelectedInterval: '3h',
		variables: {},
		formatForWeb: false,
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
							id: 'k8s_pod_memory_usage--float64----true',
							isColumn: true,
							key: 'k8s_pod_memory_usage',
							type: '',
						},
						aggregateOperator: 'avg',
						dataSource: DataSource.METRICS,
						disabled: false,
						expression: 'A',
						filters: {
							items: [
								{
									id: '9a0ffaf3',
									key: {
										dataType: DataTypes.String,
										id: 'k8s_cluster_name--string--tag--false',
										isColumn: false,
										key: 'k8s_cluster_name',
										type: 'tag',
									},
									op: '=',
									value: 'saas-us-central1-c',
								},
								{
									id: '2d8022f6',
									key: {
										dataType: DataTypes.String,
										id: 'k8s_pod_name--string--tag--false',
										isColumn: false,
										key: 'k8s_pod_name',
										type: 'tag',
									},
									op: '=',
									value: 'signoz-otel-collector-595b45477c-9wt2h',
								},
							],
							op: 'AND',
						},
						groupBy: [
							{
								dataType: DataTypes.String,
								id: 'k8s_pod_name--string--tag--false',
								isColumn: false,
								key: 'k8s_pod_name',
								type: 'tag',
							},
						],
						having: [],
						legend: '{{k8s_pod_name}}',
						limit: null,
						orderBy: [],
						queryName: 'A',
						reduceTo: 'sum',
						spaceAggregation: 'sum',
						stepInterval: 60,
						timeAggregation: 'avg',
						functions: [],
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
			id: '59c73365-4180-4ddd-9406-2e2d8cfbc0d9',
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
		globalSelectedInterval: '3h',
		variables: {},
		formatForWeb: false,
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
							id: 'k8s_pod_network_io--float64----true',
							isColumn: true,
							key: 'k8s_pod_network_io',
							type: '',
						},
						aggregateOperator: 'sum_rate',
						dataSource: DataSource.METRICS,
						disabled: false,
						expression: 'A',
						filters: {
							items: [
								{
									id: '9a0ffaf3',
									key: {
										dataType: DataTypes.String,
										id: 'k8s_cluster_name--string--tag--false',
										isColumn: false,
										key: 'k8s_cluster_name',
										type: 'tag',
									},
									op: '=',
									value: 'saas-us-central1-c',
								},
								{
									id: 'c32821ed',
									key: {
										dataType: DataTypes.String,
										id: 'k8s_pod_name--string--tag--false',
										isColumn: false,
										key: 'k8s_pod_name',
										type: 'tag',
									},
									op: '=',
									value: 'signoz-otel-collector-595b45477c-9wt2h',
								},
							],
							op: 'AND',
						},
						groupBy: [
							{
								dataType: DataTypes.String,
								id: 'direction--string--tag--false',
								isColumn: false,
								key: 'direction',
								type: 'tag',
							},
							{
								dataType: DataTypes.String,
								id: 'interface--string--tag--false',
								isColumn: false,
								key: 'interface',
								type: 'tag',
							},
							{
								dataType: DataTypes.String,
								id: 'k8s_pod_name--string--tag--false',
								isColumn: false,
								key: 'k8s_pod_name',
								type: 'tag',
							},
						],
						having: [],
						legend: '{{k8s_pod_name}}-{{interface}}-{{direction}}',
						limit: null,
						orderBy: [],
						queryName: 'A',
						reduceTo: 'sum',
						spaceAggregation: 'sum',
						stepInterval: 60,
						timeAggregation: 'rate',
						functions: [],
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
			id: '534b461d-d992-4a30-ba17-ed7aac95a55b',
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
		globalSelectedInterval: '3h',
		variables: {},
		formatForWeb: false,
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
							id: 'k8s_pod_filesystem_usage--float64----true',
							isColumn: true,
							key: 'k8s_pod_filesystem_usage',
							type: '',
						},
						aggregateOperator: 'avg',
						dataSource: DataSource.METRICS,
						disabled: false,
						expression: 'A',
						filters: {
							items: [
								{
									id: '9a0ffaf3',
									key: {
										dataType: DataTypes.String,
										id: 'k8s_cluster_name--string--tag--false',
										isColumn: false,
										key: 'k8s_cluster_name',
										type: 'tag',
									},
									op: '=',
									value: '$k8s_cluster_name',
								},
								{
									id: 'ba47cf47',
									key: {
										dataType: DataTypes.String,
										id: 'k8s_pod_name--string--tag--false',
										isColumn: false,
										key: 'k8s_pod_name',
										type: 'tag',
									},
									op: '=',
									value: '$k8s_pod_name',
								},
							],
							op: 'AND',
						},
						groupBy: [
							{
								dataType: DataTypes.String,
								id: 'k8s_pod_name--string--tag--false',
								isColumn: false,
								key: 'k8s_pod_name',
								type: 'tag',
							},
						],
						having: [],
						legend: '{{k8s_pod_name}}',
						limit: null,
						orderBy: [],
						queryName: 'A',
						reduceTo: 'sum',
						spaceAggregation: 'sum',
						stepInterval: 60,
						timeAggregation: 'avg',
						functions: [],
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
			id: '5a709367-ad0b-4a0a-9f7e-884e555f7686',
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
		globalSelectedInterval: '3h',
		variables: {
			k8s_cluster_name: clusterName,
			k8s_pod_name: podName,
		},
		formatForWeb: false,
	},
];

export const cardTitles: string[] = [
	'Pod CPU usage',
	'Pod memory usage (WSS)',
	'Pod network IO',
	'Pod filesystem usage',
];
