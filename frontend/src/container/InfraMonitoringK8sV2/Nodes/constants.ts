import { InframonitoringtypesNodeRecordDTO } from 'api/generated/services/sigNoz.schemas';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { EQueryType } from 'types/common/dashboard';
import { DataSource, ReduceOperators } from 'types/common/queryBuilder';
import { v4 } from 'uuid';

import { formatValueForExpression } from 'components/QueryBuilderV2/utils';
import {
	buildEventsExpression,
	buildLogsTracesExpression,
} from 'container/InfraMonitoringK8sV2/Base/utils';

import { K8sDetailsMetadataConfig } from '../Base/K8sBaseDetails';
import { INFRA_MONITORING_ATTR_KEYS } from '../constants';
import { SelectedItemParams } from '../hooks';

export const k8sNodeGetSelectedItemExpression = (
	params: SelectedItemParams,
): string =>
	`${INFRA_MONITORING_ATTR_KEYS.K8S_NODE_NAME} = ${formatValueForExpression(params.selectedItem ?? '')}`;

export const k8sNodeDetailsMetadataConfig: K8sDetailsMetadataConfig<InframonitoringtypesNodeRecordDTO>[] =
	[
		{ label: 'Node Name', getValue: (p): string => p.nodeName || '' },
		{
			label: 'Cluster Name',
			getValue: (p): string =>
				p.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME] || '',
		},
	];

export const k8sNodeInitialEventsExpression = (
	item: InframonitoringtypesNodeRecordDTO,
): string =>
	buildEventsExpression({
		objectKind: 'Node',
		objectName: item.nodeName || '',
		clusterName: item.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME],
	});

export const k8sNodeInitialLogTracesExpression = (
	item: InframonitoringtypesNodeRecordDTO,
): string =>
	buildLogsTracesExpression({
		mainAttributeKey: INFRA_MONITORING_ATTR_KEYS.K8S_NODE_NAME,
		mainAttributeValue: item.nodeName,
		clusterName: item.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME],
	});

export const k8sNodeGetEntityName = (
	item: InframonitoringtypesNodeRecordDTO,
): string => item.nodeName || '';

export const nodeWidgetInfo = [
	{
		title: 'CPU Usage (cores)',
		yAxisUnit: '',
		docPath: '/infrastructure-monitoring/kubernetes/nodes/#cpu-usage-cores',
	},
	{
		title: 'Memory Usage (bytes)',
		yAxisUnit: 'bytes',
		docPath: '/infrastructure-monitoring/kubernetes/nodes/#memory-usage-bytes',
	},
	{
		title: 'CPU Usage (%)',
		yAxisUnit: 'percentunit',
		docPath: '/infrastructure-monitoring/kubernetes/nodes/#cpu-usage-',
	},
	{
		title: 'Memory Usage (%)',
		yAxisUnit: 'percentunit',
		docPath: '/infrastructure-monitoring/kubernetes/nodes/#memory-usage-',
	},
	{
		title: 'Pods by CPU (top 10)',
		yAxisUnit: '',
		docPath: '/infrastructure-monitoring/kubernetes/nodes/#pods-by-cpu-top-10',
	},
	{
		title: 'Pods by Memory (top 10)',
		yAxisUnit: 'bytes',
		docPath: '/infrastructure-monitoring/kubernetes/nodes/#pods-by-memory-top-10',
	},
	{
		title: 'Network error count',
		yAxisUnit: '',
		docPath: '/infrastructure-monitoring/kubernetes/nodes/#network-error-count',
	},
	{
		title: 'Network IO rate',
		yAxisUnit: 'binBps',
		docPath: '/infrastructure-monitoring/kubernetes/nodes/#network-io-rate',
	},
	{
		title: 'Filesystem usage (bytes)',
		yAxisUnit: 'bytes',
		docPath:
			'/infrastructure-monitoring/kubernetes/nodes/#filesystem-usage-bytes',
	},
	{
		title: 'Filesystem usage (%)',
		yAxisUnit: 'percentunit',
		docPath: '/infrastructure-monitoring/kubernetes/nodes/#filesystem-usage-',
	},
];

export const getNodeMetricsQueryPayload = (
	node: InframonitoringtypesNodeRecordDTO,
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
								id: 'k8s_node_cpu_usage--float64--Gauge--true',
								key: INFRA_MONITORING_ATTR_KEYS.K8S_NODE_CPU_USAGE,
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
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NODE_NAME,
											type: 'tag',
										},
										op: '=',
										value: node.nodeName,
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
								key: INFRA_MONITORING_ATTR_KEYS.K8S_NODE_ALLOCATABLE_CPU,
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
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NODE_NAME,
											type: 'tag',
										},
										op: '=',
										value: node.nodeName,
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
								key: INFRA_MONITORING_ATTR_KEYS.K8S_CONTAINER_CPU_REQUEST,
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
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NODE_NAME,
											type: 'tag',
										},
										op: '=',
										value: node.nodeName,
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
								key: INFRA_MONITORING_ATTR_KEYS.K8S_NODE_CPU_USAGE,
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
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NODE_NAME,
											type: 'tag',
										},
										op: '=',
										value: node.nodeName,
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
								key: INFRA_MONITORING_ATTR_KEYS.K8S_NODE_CPU_USAGE,
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
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NODE_NAME,
											type: 'tag',
										},
										op: '=',
										value: node.nodeName,
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
								key: INFRA_MONITORING_ATTR_KEYS.K8S_NODE_MEMORY_USAGE,
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
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NODE_NAME,
											type: 'tag',
										},
										op: '=',
										value: node.nodeName,
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
								key: INFRA_MONITORING_ATTR_KEYS.K8S_NODE_ALLOCATABLE_MEMORY,
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
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NODE_NAME,
											type: 'tag',
										},
										op: '=',
										value: node.nodeName,
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
								key: INFRA_MONITORING_ATTR_KEYS.K8S_CONTAINER_MEMORY_REQUEST,
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
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NODE_NAME,
											type: 'tag',
										},
										op: '=',
										value: node.nodeName,
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
								key: INFRA_MONITORING_ATTR_KEYS.K8S_NODE_MEMORY_USAGE,
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
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NODE_NAME,
											type: 'tag',
										},
										op: '=',
										value: node.nodeName,
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
								key: INFRA_MONITORING_ATTR_KEYS.K8S_NODE_MEMORY_USAGE,
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
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NODE_NAME,
											type: 'tag',
										},
										op: '=',
										value: node.nodeName,
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
								key: INFRA_MONITORING_ATTR_KEYS.K8S_NODE_MEMORY_WORKING_SET,
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
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NODE_NAME,
											type: 'tag',
										},
										op: '=',
										value: node.nodeName,
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
								key: INFRA_MONITORING_ATTR_KEYS.K8S_NODE_MEMORY_RSS,
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
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NODE_NAME,
											type: 'tag',
										},
										op: '=',
										value: node.nodeName,
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
								key: INFRA_MONITORING_ATTR_KEYS.K8S_NODE_CPU_USAGE,
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
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NODE_NAME,
											type: 'tag',
										},
										op: '=',
										value: node.nodeName,
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
								key: INFRA_MONITORING_ATTR_KEYS.K8S_NODE_ALLOCATABLE_CPU,
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
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NODE_NAME,
											type: 'tag',
										},
										op: '=',
										value: node.nodeName,
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
								key: INFRA_MONITORING_ATTR_KEYS.K8S_CONTAINER_CPU_REQUEST,
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
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NODE_NAME,
											type: 'tag',
										},
										op: '=',
										value: node.nodeName,
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
								key: INFRA_MONITORING_ATTR_KEYS.K8S_NODE_MEMORY_USAGE,
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
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NODE_NAME,
											type: 'tag',
										},
										op: '=',
										value: node.nodeName,
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
								key: INFRA_MONITORING_ATTR_KEYS.K8S_NODE_ALLOCATABLE_MEMORY,
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
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NODE_NAME,
											type: 'tag',
										},
										op: '=',
										value: node.nodeName,
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
								key: INFRA_MONITORING_ATTR_KEYS.K8S_CONTAINER_MEMORY_REQUEST,
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
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NODE_NAME,
											type: 'tag',
										},
										op: '=',
										value: node.nodeName,
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
										id: '88d38c06',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_node_name--string--tag--false',
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NODE_NAME,
											type: 'tag',
										},
										op: '=',
										value: node.nodeName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'k8s_pod_name--string--tag--false',
									key: INFRA_MONITORING_ATTR_KEYS.K8S_POD_NAME,
									type: 'tag',
								},
							],
							having: [],
							legend: `{{${INFRA_MONITORING_ATTR_KEYS.K8S_POD_NAME}}}`,
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
										id: '43033387',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_node_name--string--tag--false',
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NODE_NAME,
											type: 'tag',
										},
										op: '=',
										value: node.nodeName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: 'k8s_pod_name--string--tag--false',
									key: INFRA_MONITORING_ATTR_KEYS.K8S_POD_NAME,
									type: 'tag',
								},
							],
							having: [],
							legend: `{{${INFRA_MONITORING_ATTR_KEYS.K8S_POD_NAME}}}`,
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
								key: INFRA_MONITORING_ATTR_KEYS.K8S_NODE_NETWORK_ERRORS,
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
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NODE_NAME,
											type: 'tag',
										},
										op: '=',
										value: node.nodeName,
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
								key: INFRA_MONITORING_ATTR_KEYS.K8S_NODE_NETWORK_IO,
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
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NODE_NAME,
											type: 'tag',
										},
										op: '=',
										value: node.nodeName,
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
								key: INFRA_MONITORING_ATTR_KEYS.K8S_NODE_FILESYSTEM_USAGE,
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
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NODE_NAME,
											type: 'tag',
										},
										op: '=',
										value: node.nodeName,
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
								key: INFRA_MONITORING_ATTR_KEYS.K8S_NODE_FILESYSTEM_CAPACITY,
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
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NODE_NAME,
											type: 'tag',
										},
										op: '=',
										value: node.nodeName,
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
								key: INFRA_MONITORING_ATTR_KEYS.K8S_NODE_FILESYSTEM_AVAILABLE,
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
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NODE_NAME,
											type: 'tag',
										},
										op: '=',
										value: node.nodeName,
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
								key: INFRA_MONITORING_ATTR_KEYS.K8S_NODE_FILESYSTEM_USAGE,
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
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NODE_NAME,
											type: 'tag',
										},
										op: '=',
										value: node.nodeName,
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
								key: INFRA_MONITORING_ATTR_KEYS.K8S_NODE_FILESYSTEM_CAPACITY,
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
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NODE_NAME,
											type: 'tag',
										},
										op: '=',
										value: node.nodeName,
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
