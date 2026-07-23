import { InframonitoringtypesNamespaceRecordDTO } from 'api/generated/services/sigNoz.schemas';
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
import {
	getPodUtilizationByPodQueryPayloads,
	INFRA_MONITORING_ATTR_KEYS,
	InfraMonitoringEntity,
} from '../constants';
import { SelectedItemParams } from '../hooks';
import { formatValueForExpression } from 'components/QueryBuilderV2/utils';
import {
	buildEventsExpression,
	buildExpressionFromSelectedItemParams,
	buildLogsTracesExpression,
} from 'container/InfraMonitoringK8sV2/Base/utils';

export const k8sNamespaceGetSelectedItemExpression = (
	params: SelectedItemParams,
): string =>
	buildExpressionFromSelectedItemParams(
		params,
		INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
	);

export const k8sNamespaceDetailsMetadataConfig: K8sDetailsMetadataConfig<InframonitoringtypesNamespaceRecordDTO>[] =
	[
		{ label: 'Namespace Name', getValue: (p): string => p.namespaceName || '' },
		{
			label: 'Cluster Name',
			getValue: (p): string =>
				p.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME] || '',
		},
	];

export const k8sNamespaceDetailsCountsConfig: K8sDetailsCountConfig<InframonitoringtypesNamespaceRecordDTO>[] =
	[
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

export const k8sNamespaceInitialEventsExpression = (
	item: InframonitoringtypesNamespaceRecordDTO,
): string =>
	buildEventsExpression({
		objectKind: 'Namespace',
		objectName: item.namespaceName || '',
		clusterName: item.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME],
	});

export const k8sNamespaceInitialLogTracesExpression = (
	item: InframonitoringtypesNamespaceRecordDTO,
): string =>
	buildLogsTracesExpression({
		mainAttributeKey: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
		mainAttributeValue: item.namespaceName,
		clusterName: item.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME],
	});

export const k8sNamespaceGetEntityName = (
	item: InframonitoringtypesNamespaceRecordDTO,
): string => item.namespaceName || '';

export const k8sNamespaceGetCountsFilterExpression = (
	item: InframonitoringtypesNamespaceRecordDTO,
): string => {
	const clusterName = item.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME];
	const clauses: string[] = [];

	if (clusterName) {
		clauses.push(
			`${INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME} = ${formatValueForExpression(clusterName)}`,
		);
	}
	if (item.namespaceName) {
		clauses.push(
			`${INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME} = ${formatValueForExpression(item.namespaceName)}`,
		);
	}

	return clauses.join(' AND ');
};

export const namespaceWidgetInfo = [
	{
		title: 'CPU Usage (cores)',
		yAxisUnit: '',
		docPath: '/infrastructure-monitoring/kubernetes/namespaces/#cpu-usage-cores',
	},
	{
		title: 'Memory Usage (bytes)',
		yAxisUnit: 'bytes',
		docPath:
			'/infrastructure-monitoring/kubernetes/namespaces/#memory-usage-bytes',
	},
	{
		title: 'Pods CPU (top 10)',
		yAxisUnit: '',
		docPath: '/infrastructure-monitoring/kubernetes/namespaces/#pods-cpu-top-10',
	},
	{
		title: 'Pods Memory (top 10)',
		yAxisUnit: 'bytes',
		docPath:
			'/infrastructure-monitoring/kubernetes/namespaces/#pods-memory-top-10',
	},
	{
		title: 'Network rate',
		yAxisUnit: 'binBps',
		docPath: '/infrastructure-monitoring/kubernetes/namespaces/#network-rate',
	},
	{
		title: 'Network errors',
		yAxisUnit: '',
		docPath: '/infrastructure-monitoring/kubernetes/namespaces/#network-errors',
	},
	{
		title: 'StatefulSets (pods)',
		yAxisUnit: '',
		docPath: '/infrastructure-monitoring/kubernetes/namespaces/#statefulsets',
	},
	{
		title: 'ReplicaSets (pods)',
		yAxisUnit: '',
		docPath: '/infrastructure-monitoring/kubernetes/namespaces/#replicasets',
	},
	{
		title: 'DaemonSets (nodes)',
		yAxisUnit: '',
		docPath: '/infrastructure-monitoring/kubernetes/namespaces/#daemonsets',
	},
	{
		title: 'Deployments (pods)',
		yAxisUnit: '',
		docPath: '/infrastructure-monitoring/kubernetes/namespaces/#deployments',
	},
];

export const getNamespaceMetricsQueryPayload = (
	namespace: InframonitoringtypesNamespaceRecordDTO,
	start: number,
	end: number,
): GetQueryResultsProps[] => {
	const clusterName =
		namespace.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME] ?? '';

	const filters = [
		{
			id: 'f1',
			key: {
				dataType: DataTypes.String,
				id: 'k8s_cluster_name--string--tag--false',
				key: INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME,
				type: 'tag',
			},
			op: '=',
			value: clusterName,
		},
	];

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
								id: INFRA_MONITORING_ATTR_KEYS.K8S_POD_CPU_USAGE,
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
										id: '47b3adae',
										key: {
											dataType: DataTypes.String,
											id: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
											type: 'tag',
										},
										op: '=',
										value: namespace.namespaceName,
									},
									...filters,
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
								id: INFRA_MONITORING_ATTR_KEYS.K8S_CONTAINER_CPU_REQUEST,
								key: INFRA_MONITORING_ATTR_KEYS.K8S_CONTAINER_CPU_REQUEST,
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
											id: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
											type: 'tag',
										},
										op: '=',
										value: namespace.namespaceName,
									},
									...filters,
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
								id: INFRA_MONITORING_ATTR_KEYS.K8S_POD_CPU_USAGE,
								key: INFRA_MONITORING_ATTR_KEYS.K8S_POD_CPU_USAGE,
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
											id: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
											type: 'tag',
										},
										op: '=',
										value: namespace.namespaceName,
									},
									...filters,
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
								id: INFRA_MONITORING_ATTR_KEYS.K8S_POD_CPU_USAGE,
								key: INFRA_MONITORING_ATTR_KEYS.K8S_POD_CPU_USAGE,
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
											id: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
											type: 'tag',
										},
										op: '=',
										value: namespace.namespaceName,
									},
									...filters,
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
								id: INFRA_MONITORING_ATTR_KEYS.K8S_POD_MEMORY_USAGE,
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
										id: '10011298',
										key: {
											dataType: DataTypes.String,
											id: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
											type: 'tag',
										},
										op: '=',
										value: namespace.namespaceName,
									},
									...filters,
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
								id: INFRA_MONITORING_ATTR_KEYS.K8S_CONTAINER_MEMORY_REQUEST,
								key: INFRA_MONITORING_ATTR_KEYS.K8S_CONTAINER_MEMORY_REQUEST,
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
											id: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
											type: 'tag',
										},
										op: '=',
										value: namespace.namespaceName,
									},
									...filters,
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
								id: INFRA_MONITORING_ATTR_KEYS.K8S_POD_MEMORY_WORKING_SET,
								key: INFRA_MONITORING_ATTR_KEYS.K8S_POD_MEMORY_WORKING_SET,
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
											id: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
											type: 'tag',
										},
										op: '=',
										value: namespace.namespaceName,
									},
									...filters,
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
								id: INFRA_MONITORING_ATTR_KEYS.K8S_POD_MEMORY_RSS,
								key: INFRA_MONITORING_ATTR_KEYS.K8S_POD_MEMORY_RSS,
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
											id: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
											type: 'tag',
										},
										op: '=',
										value: namespace.namespaceName,
									},
									...filters,
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
								id: INFRA_MONITORING_ATTR_KEYS.K8S_POD_MEMORY_USAGE,
								key: INFRA_MONITORING_ATTR_KEYS.K8S_POD_MEMORY_USAGE,
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
											id: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
											type: 'tag',
										},
										op: '=',
										value: namespace.namespaceName,
									},
									...filters,
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
								id: INFRA_MONITORING_ATTR_KEYS.K8S_POD_MEMORY_USAGE,
								key: INFRA_MONITORING_ATTR_KEYS.K8S_POD_MEMORY_USAGE,
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
											id: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
											type: 'tag',
										},
										op: '=',
										value: namespace.namespaceName,
									},
									...filters,
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
								id: INFRA_MONITORING_ATTR_KEYS.K8S_POD_CPU_USAGE,
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
										id: 'c3a73f0a',
										key: {
											dataType: DataTypes.String,
											id: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
											type: 'tag',
										},
										op: '=',
										value: namespace.namespaceName,
									},
									...filters,
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: INFRA_MONITORING_ATTR_KEYS.K8S_POD_NAME,
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
								id: INFRA_MONITORING_ATTR_KEYS.K8S_POD_MEMORY_USAGE,
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
										id: '5cad3379',
										key: {
											dataType: DataTypes.String,
											id: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
											type: 'tag',
										},
										op: '=',
										value: namespace.namespaceName,
									},
									...filters,
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: INFRA_MONITORING_ATTR_KEYS.K8S_POD_NAME,
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
								id: INFRA_MONITORING_ATTR_KEYS.K8S_POD_NETWORK_IO,
								key: INFRA_MONITORING_ATTR_KEYS.K8S_POD_NETWORK_IO,
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
											id: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
											type: 'tag',
										},
										op: '=',
										value: namespace.namespaceName,
									},
									...filters,
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
								id: INFRA_MONITORING_ATTR_KEYS.K8S_POD_NETWORK_ERRORS,
								key: INFRA_MONITORING_ATTR_KEYS.K8S_POD_NETWORK_ERRORS,
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
											id: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
											type: 'tag',
										},
										op: '=',
										value: namespace.namespaceName,
									},
									...filters,
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
								id: INFRA_MONITORING_ATTR_KEYS.K8S_STATEFULSET_CURRENT_PODS,
								key: INFRA_MONITORING_ATTR_KEYS.K8S_STATEFULSET_CURRENT_PODS,
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
											id: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
											type: 'tag',
										},
										op: '=',
										value: namespace.namespaceName,
									},
									...filters,
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: INFRA_MONITORING_ATTR_KEYS.K8S_STATEFULSET_NAME,
									key: INFRA_MONITORING_ATTR_KEYS.K8S_STATEFULSET_NAME,
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
								id: INFRA_MONITORING_ATTR_KEYS.K8S_STATEFULSET_DESIRED_PODS,
								key: INFRA_MONITORING_ATTR_KEYS.K8S_STATEFULSET_DESIRED_PODS,
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
											id: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
											type: 'tag',
										},
										op: '=',
										value: namespace.namespaceName,
									},
									...filters,
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: INFRA_MONITORING_ATTR_KEYS.K8S_STATEFULSET_NAME,
									key: INFRA_MONITORING_ATTR_KEYS.K8S_STATEFULSET_NAME,
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
								id: INFRA_MONITORING_ATTR_KEYS.K8S_STATEFULSET_UPDATED_PODS,
								key: INFRA_MONITORING_ATTR_KEYS.K8S_STATEFULSET_UPDATED_PODS,
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
											id: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
											type: 'tag',
										},
										op: '=',
										value: namespace.namespaceName,
									},
									...filters,
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: INFRA_MONITORING_ATTR_KEYS.K8S_STATEFULSET_NAME,
									key: INFRA_MONITORING_ATTR_KEYS.K8S_STATEFULSET_NAME,
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
								id: INFRA_MONITORING_ATTR_KEYS.K8S_REPLICASET_DESIRED,
								key: INFRA_MONITORING_ATTR_KEYS.K8S_REPLICASET_DESIRED,
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
											id: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
											type: 'tag',
										},
										op: '=',
										value: namespace.namespaceName,
									},
									...filters,
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: INFRA_MONITORING_ATTR_KEYS.K8S_REPLICASET_NAME,
									key: INFRA_MONITORING_ATTR_KEYS.K8S_REPLICASET_NAME,
									type: 'tag',
								},
							],
							having: [
								{
									columnName: `MAX(${INFRA_MONITORING_ATTR_KEYS.K8S_REPLICASET_DESIRED})`,
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
								id: INFRA_MONITORING_ATTR_KEYS.K8S_REPLICASET_AVAILABLE,
								key: INFRA_MONITORING_ATTR_KEYS.K8S_REPLICASET_AVAILABLE,
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
											id: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
											type: 'tag',
										},
										op: '=',
										value: namespace.namespaceName,
									},
									...filters,
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: INFRA_MONITORING_ATTR_KEYS.K8S_REPLICASET_NAME,
									key: INFRA_MONITORING_ATTR_KEYS.K8S_REPLICASET_NAME,
									type: 'tag',
								},
							],
							having: [
								{
									columnName: `MAX(${INFRA_MONITORING_ATTR_KEYS.K8S_REPLICASET_DESIRED})`,
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
								id: INFRA_MONITORING_ATTR_KEYS.K8S_DAEMONSET_DESIRED_SCHEDULED_NODES,
								key: INFRA_MONITORING_ATTR_KEYS.K8S_DAEMONSET_DESIRED_SCHEDULED_NODES,
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
											id: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
											type: 'tag',
										},
										op: '=',
										value: namespace.namespaceName,
									},
									...filters,
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: INFRA_MONITORING_ATTR_KEYS.K8S_DAEMONSET_NAME,
									key: INFRA_MONITORING_ATTR_KEYS.K8S_DAEMONSET_NAME,
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
								id: INFRA_MONITORING_ATTR_KEYS.K8S_DAEMONSET_CURRENT_SCHEDULED_NODES,
								key: INFRA_MONITORING_ATTR_KEYS.K8S_DAEMONSET_CURRENT_SCHEDULED_NODES,
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
											id: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
											type: 'tag',
										},
										op: '=',
										value: namespace.namespaceName,
									},
									...filters,
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: INFRA_MONITORING_ATTR_KEYS.K8S_DAEMONSET_NAME,
									key: INFRA_MONITORING_ATTR_KEYS.K8S_DAEMONSET_NAME,
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
								id: INFRA_MONITORING_ATTR_KEYS.K8S_DAEMONSET_READY_NODES,
								key: INFRA_MONITORING_ATTR_KEYS.K8S_DAEMONSET_READY_NODES,
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
											id: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
											type: 'tag',
										},
										op: '=',
										value: namespace.namespaceName,
									},
									...filters,
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: INFRA_MONITORING_ATTR_KEYS.K8S_DAEMONSET_NAME,
									key: INFRA_MONITORING_ATTR_KEYS.K8S_DAEMONSET_NAME,
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
								id: INFRA_MONITORING_ATTR_KEYS.K8S_DAEMONSET_MISSCHEDULED_NODES,
								key: INFRA_MONITORING_ATTR_KEYS.K8S_DAEMONSET_MISSCHEDULED_NODES,
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
											id: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
											type: 'tag',
										},
										op: '=',
										value: namespace.namespaceName,
									},
									...filters,
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: INFRA_MONITORING_ATTR_KEYS.K8S_DAEMONSET_NAME,
									key: INFRA_MONITORING_ATTR_KEYS.K8S_DAEMONSET_NAME,
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
								id: INFRA_MONITORING_ATTR_KEYS.K8S_DEPLOYMENT_DESIRED,
								key: INFRA_MONITORING_ATTR_KEYS.K8S_DEPLOYMENT_DESIRED,
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
											id: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
											type: 'tag',
										},
										op: '=',
										value: namespace.namespaceName,
									},
									...filters,
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: INFRA_MONITORING_ATTR_KEYS.K8S_DEPLOYMENT_NAME,
									key: INFRA_MONITORING_ATTR_KEYS.K8S_DEPLOYMENT_NAME,
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
								id: INFRA_MONITORING_ATTR_KEYS.K8S_DEPLOYMENT_AVAILABLE,
								key: INFRA_MONITORING_ATTR_KEYS.K8S_DEPLOYMENT_AVAILABLE,
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
											id: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
											type: 'tag',
										},
										op: '=',
										value: namespace.namespaceName,
									},
									...filters,
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: DataTypes.String,
									id: INFRA_MONITORING_ATTR_KEYS.K8S_DEPLOYMENT_NAME,
									key: INFRA_MONITORING_ATTR_KEYS.K8S_DEPLOYMENT_NAME,
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

export const getNamespacePodMetricsQueryPayload = (
	namespace: InframonitoringtypesNamespaceRecordDTO,
	start: number,
	end: number,
): GetQueryResultsProps[] =>
	getPodUtilizationByPodQueryPayloads(
		{
			workloadNameKey: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
			workloadNameValue: namespace.namespaceName ?? '',
			clusterName:
				namespace.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME] ?? '',
		},
		start,
		end,
	);
