import { InframonitoringtypesDaemonSetRecordDTO } from 'api/generated/services/sigNoz.schemas';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { EQueryType } from 'types/common/dashboard';
import { DataSource, ReduceOperators } from 'types/common/queryBuilder';
import { v4 } from 'uuid';

import { K8sDetailsMetadataConfig } from '../Base/K8sBaseDetails';
import {
	getPodUtilizationByPodQueryPayloads,
	INFRA_MONITORING_ATTR_KEYS,
} from '../constants';
import { SelectedItemParams } from '../hooks';
import {
	buildEventsExpression,
	buildExpressionFromSelectedItemParams,
	buildLogsTracesExpression,
} from 'container/InfraMonitoringK8sV2/Base/utils';

export const k8sDaemonSetGetSelectedItemExpression = (
	params: SelectedItemParams,
): string =>
	buildExpressionFromSelectedItemParams(
		params,
		INFRA_MONITORING_ATTR_KEYS.K8S_DAEMONSET_NAME,
	);

export const k8sDaemonSetDetailsMetadataConfig: K8sDetailsMetadataConfig<InframonitoringtypesDaemonSetRecordDTO>[] =
	[
		{
			label: 'Daemonset Name',
			getValue: (p): string =>
				p.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_DAEMONSET_NAME] ?? '',
		},
		{
			label: 'Cluster Name',
			getValue: (p): string =>
				p.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME] ?? '',
		},
		{
			label: 'Namespace Name',
			getValue: (p): string =>
				p.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME] ?? '',
		},
	];

export const k8sDaemonSetInitialEventsExpression = (
	item: InframonitoringtypesDaemonSetRecordDTO,
): string =>
	buildEventsExpression({
		objectKind: 'DaemonSet',
		objectName: item.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_DAEMONSET_NAME] ?? '',
		clusterName: item.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME],
		namespaceName: item.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME],
	});

export const k8sDaemonSetInitialLogTracesExpression = (
	item: InframonitoringtypesDaemonSetRecordDTO,
): string =>
	buildLogsTracesExpression({
		mainAttributeKey: INFRA_MONITORING_ATTR_KEYS.K8S_DAEMONSET_NAME,
		mainAttributeValue:
			item.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_DAEMONSET_NAME],
		clusterName: item.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME],
		namespaceName: item.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME],
	});

export const k8sDaemonSetGetEntityName = (
	item: InframonitoringtypesDaemonSetRecordDTO,
): string => item.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_DAEMONSET_NAME] ?? '';

export const daemonSetWidgetInfo = [
	{
		title: 'CPU usage, request, limits',
		yAxisUnit: '',
		docPath:
			'/infrastructure-monitoring/kubernetes/daemonsets/#cpu-usage-request-limits',
	},
	{
		title: 'Memory usage, request, limits',
		yAxisUnit: 'bytes',
		docPath:
			'/infrastructure-monitoring/kubernetes/daemonsets/#memory-usage-request-limits',
	},
	{
		title: 'Network IO',
		yAxisUnit: 'binBps',
		docPath: '/infrastructure-monitoring/kubernetes/daemonsets/#network-io',
	},
	{
		title: 'Network errors count',
		yAxisUnit: '',
		docPath:
			'/infrastructure-monitoring/kubernetes/daemonsets/#network-errors-count',
	},
];

export const getDaemonSetMetricsQueryPayload = (
	daemonSet: InframonitoringtypesDaemonSetRecordDTO,
	start: number,
	end: number,
	dotMetricsEnabled: boolean,
): GetQueryResultsProps[] => {
	const k8sPodCpuUtilizationKey = dotMetricsEnabled
		? 'k8s.pod.cpu.usage'
		: 'k8s_pod_cpu_usage';

	const k8sContainerCpuRequestKey = dotMetricsEnabled
		? 'k8s.container.cpu_request'
		: 'k8s_container_cpu_request';

	const k8sContainerCpuLimitKey = dotMetricsEnabled
		? 'k8s.container.cpu_limit'
		: 'k8s_container_cpu_limit';

	const k8sPodMemoryUsageKey = dotMetricsEnabled
		? 'k8s.pod.memory.usage'
		: 'k8s_pod_memory_usage';

	const k8sContainerMemoryRequestKey = dotMetricsEnabled
		? 'k8s.container.memory_request'
		: 'k8s_container_memory_request';

	const k8sContainerMemoryLimitKey = dotMetricsEnabled
		? 'k8s.container.memory_limit'
		: 'k8s_container_memory_limit';

	const k8sPodNetworkIoKey = dotMetricsEnabled
		? 'k8s.pod.network.io'
		: 'k8s_pod_network_io';

	const k8sPodNetworkErrorsKey = dotMetricsEnabled
		? 'k8s.pod.network.errors'
		: 'k8s_pod_network_errors';

	const k8sDaemonSetNameKey = dotMetricsEnabled
		? 'k8s.daemonset.name'
		: 'k8s_daemonset_name';

	const k8sPodNameKey = dotMetricsEnabled ? 'k8s.pod.name' : 'k8s_pod_name';

	const k8sNamespaceNameKey = dotMetricsEnabled
		? 'k8s.namespace.name'
		: 'k8s_namespace_name';

	const k8sClusterNameKey = dotMetricsEnabled
		? 'k8s.cluster.name'
		: 'k8s_cluster_name';

	const clusterName =
		daemonSet.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME] ?? '';
	const namespaceName =
		daemonSet.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME] ?? '';

	const filters = [
		{
			id: 'f1',
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
			id: 'f2',
			key: {
				dataType: DataTypes.String,
				id: 'k8s_namespace_name--string--tag--false',
				key: k8sNamespaceNameKey,
				type: 'tag',
			},
			op: '=',
			value: namespaceName,
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
										id: '745a486f',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_daemonset_name--string--tag--false',
											key: k8sDaemonSetNameKey,
											type: 'tag',
										},
										op: '=',
										value:
											daemonSet.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_DAEMONSET_NAME] ??
											'',
									},
									...filters,
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
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'k8s_container_cpu_request--float64--Gauge--true',
								key: k8sContainerCpuRequestKey,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'B',
							filters: {
								items: [
									{
										id: '148dffa7',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',
											key: k8sPodNameKey,
											type: 'tag',
										},
										op: 'contains',
										value:
											daemonSet.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_DAEMONSET_NAME] ??
											'',
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
							timeAggregation: 'avg',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'k8s_container_cpu_limit--float64--Gauge--true',
								key: k8sContainerCpuLimitKey,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'C',
							filters: {
								items: [
									{
										id: 'd420a02b',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',
											key: k8sPodNameKey,
											type: 'tag',
										},
										op: 'contains',
										value:
											daemonSet.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_DAEMONSET_NAME] ??
											'',
									},
									...filters,
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
										id: '6d3283ce',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_daemonset_name--string--tag--false',
											key: k8sDaemonSetNameKey,
											type: 'tag',
										},
										op: '=',
										value:
											daemonSet.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_DAEMONSET_NAME] ??
											'',
									},
									...filters,
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
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'k8s_container_memory_request--float64--Gauge--true',
								key: k8sContainerMemoryRequestKey,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'B',
							filters: {
								items: [
									{
										id: 'a334f5c2',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',
											key: k8sPodNameKey,
											type: 'tag',
										},
										op: 'contains',
										value:
											daemonSet.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_DAEMONSET_NAME] ??
											'',
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
							timeAggregation: 'avg',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'k8s_container_memory_limit--float64--Gauge--true',
								key: k8sContainerMemoryLimitKey,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'C',
							filters: {
								items: [
									{
										id: 'fde3c631',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',
											key: k8sPodNameKey,
											type: 'tag',
										},
										op: 'contains',
										value:
											daemonSet.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_DAEMONSET_NAME] ??
											'',
									},
									...filters,
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
										id: 'ccbdbd6a',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_daemonset_name--string--tag--false',
											key: k8sDaemonSetNameKey,
											type: 'tag',
										},
										op: '=',
										value:
											daemonSet.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_DAEMONSET_NAME] ??
											'',
									},
									...filters,
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
										id: '581a85fb',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_daemonset_name--string--tag--false',
											key: k8sDaemonSetNameKey,
											type: 'tag',
										},
										op: '=',
										value:
											daemonSet.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_DAEMONSET_NAME] ??
											'',
									},
									...filters,
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

export const getDaemonSetPodMetricsQueryPayload = (
	daemonSet: InframonitoringtypesDaemonSetRecordDTO,
	start: number,
	end: number,
	dotMetricsEnabled: boolean,
): GetQueryResultsProps[] => {
	const k8sDaemonSetNameKey = dotMetricsEnabled
		? 'k8s.daemonset.name'
		: 'k8s_daemonset_name';

	return getPodUtilizationByPodQueryPayloads(
		{
			workloadNameKey: k8sDaemonSetNameKey,
			workloadNameValue:
				daemonSet.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_DAEMONSET_NAME] ?? '',
			clusterName:
				daemonSet.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME] ?? '',
			namespaceName:
				daemonSet.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME] ?? '',
		},
		start,
		end,
		dotMetricsEnabled,
	);
};
