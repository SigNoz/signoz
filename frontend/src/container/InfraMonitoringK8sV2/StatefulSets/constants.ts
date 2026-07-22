import { InframonitoringtypesStatefulSetRecordDTO } from 'api/generated/services/sigNoz.schemas';
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

export const k8sStatefulSetGetSelectedItemExpression = (
	params: SelectedItemParams,
): string =>
	buildExpressionFromSelectedItemParams(
		params,
		INFRA_MONITORING_ATTR_KEYS.K8S_STATEFULSET_NAME,
	);

export const k8sStatefulSetDetailsMetadataConfig: K8sDetailsMetadataConfig<InframonitoringtypesStatefulSetRecordDTO>[] =
	[
		{
			label: 'Statefulset Name',
			getValue: (p): string =>
				p.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_STATEFULSET_NAME] ?? '',
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

export const k8sStatefulSetInitialEventsExpression = (
	item: InframonitoringtypesStatefulSetRecordDTO,
): string =>
	buildEventsExpression({
		objectKind: 'StatefulSet',
		objectName:
			item.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_STATEFULSET_NAME] ?? '',
		clusterName: item.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME],
		namespaceName: item.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME],
	});

export const k8sStatefulSetInitialLogTracesExpression = (
	item: InframonitoringtypesStatefulSetRecordDTO,
): string =>
	buildLogsTracesExpression({
		mainAttributeKey: INFRA_MONITORING_ATTR_KEYS.K8S_STATEFULSET_NAME,
		mainAttributeValue:
			item.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_STATEFULSET_NAME],
		clusterName: item.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME],
		namespaceName: item.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME],
	});

export const k8sStatefulSetGetEntityName = (
	item: InframonitoringtypesStatefulSetRecordDTO,
): string => item.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_STATEFULSET_NAME] ?? '';

export const statefulSetWidgetInfo = [
	{
		title: 'CPU usage, request, limits',
		yAxisUnit: '',
		docPath:
			'/infrastructure-monitoring/kubernetes/statefulsets/#cpu-usage-request-limits',
	},
	{
		title: 'CPU request, limit util (%)',
		yAxisUnit: 'percentunit',
		docPath:
			'/infrastructure-monitoring/kubernetes/statefulsets/#cpu-request-limit-utilization-',
	},
	{
		title: 'Memory usage, request, limits',
		yAxisUnit: 'bytes',
		docPath:
			'/infrastructure-monitoring/kubernetes/statefulsets/#memory-usage-request-limits',
	},
	{
		title: 'Memory request, limit util (%)',
		yAxisUnit: 'percentunit',
		docPath:
			'/infrastructure-monitoring/kubernetes/statefulsets/#memory-request-limit-utilization-',
	},
	{
		title: 'Network IO',
		yAxisUnit: 'binBps',
		docPath: '/infrastructure-monitoring/kubernetes/statefulsets/#network-io',
	},
	{
		title: 'Network errors count',
		yAxisUnit: '',
		docPath:
			'/infrastructure-monitoring/kubernetes/statefulsets/#network-errors-count',
	},
];

export const getStatefulSetMetricsQueryPayload = (
	statefulSet: InframonitoringtypesStatefulSetRecordDTO,
	start: number,
	end: number,
	dotMetricsEnabled: boolean,
): GetQueryResultsProps[] => {
	const k8sStatefulSetNameKey = dotMetricsEnabled
		? INFRA_MONITORING_ATTR_KEYS.K8S_STATEFULSET_NAME
		: 'k8s_statefulset_name';
	const k8sNamespaceNameKey = dotMetricsEnabled
		? INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME
		: 'k8s_namespace_name';
	const k8sPodNameKey = dotMetricsEnabled
		? INFRA_MONITORING_ATTR_KEYS.K8S_POD_NAME
		: 'k8s_pod_name';
	const k8sClusterNameKey = dotMetricsEnabled
		? INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME
		: 'k8s_cluster_name';

	const clusterName =
		statefulSet.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME] ?? '';
	const namespaceName =
		statefulSet.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME] ?? '';

	const filters = [
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
		{
			id: 'f3',
			key: {
				dataType: DataTypes.String,
				id: 'k8s_cluster_name--string--tag--false',
				key: k8sClusterNameKey,
				type: 'tag',
			},
			op: '=',
			value: clusterName,
		},
	];

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
										value:
											statefulSet.meta?.[
												INFRA_MONITORING_ATTR_KEYS.K8S_STATEFULSET_NAME
											] ?? '',
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
										value:
											statefulSet.meta?.[
												INFRA_MONITORING_ATTR_KEYS.K8S_STATEFULSET_NAME
											] ?? '',
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
										value:
											statefulSet.meta?.[
												INFRA_MONITORING_ATTR_KEYS.K8S_STATEFULSET_NAME
											] ?? '',
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
										value:
											statefulSet.meta?.[
												INFRA_MONITORING_ATTR_KEYS.K8S_STATEFULSET_NAME
											] ?? '',
									},
									...filters,
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
							reduceTo: ReduceOperators.AVG,
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
										value:
											statefulSet.meta?.[
												INFRA_MONITORING_ATTR_KEYS.K8S_STATEFULSET_NAME
											] ?? '',
									},
									...filters,
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
							reduceTo: ReduceOperators.AVG,
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
										value:
											statefulSet.meta?.[
												INFRA_MONITORING_ATTR_KEYS.K8S_STATEFULSET_NAME
											] ?? '',
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
										id: 'f1',
										key: {
											dataType: DataTypes.String,
											id: 'pod_name',
											key: k8sPodNameKey,
											type: 'tag',
										},
										op: 'contains',
										value:
											statefulSet.meta?.[
												INFRA_MONITORING_ATTR_KEYS.K8S_STATEFULSET_NAME
											] ?? '',
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
										value:
											statefulSet.meta?.[
												INFRA_MONITORING_ATTR_KEYS.K8S_STATEFULSET_NAME
											] ?? '',
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
										value:
											statefulSet.meta?.[
												INFRA_MONITORING_ATTR_KEYS.K8S_STATEFULSET_NAME
											] ?? '',
									},
									...filters,
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
							reduceTo: ReduceOperators.AVG,
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
										value:
											statefulSet.meta?.[
												INFRA_MONITORING_ATTR_KEYS.K8S_STATEFULSET_NAME
											] ?? '',
									},
									...filters,
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
							reduceTo: ReduceOperators.AVG,
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
										value:
											statefulSet.meta?.[
												INFRA_MONITORING_ATTR_KEYS.K8S_STATEFULSET_NAME
											] ?? '',
									},
									...filters,
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
							reduceTo: ReduceOperators.AVG,
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
										value:
											statefulSet.meta?.[
												INFRA_MONITORING_ATTR_KEYS.K8S_STATEFULSET_NAME
											] ?? '',
									},
									...filters,
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
							reduceTo: ReduceOperators.AVG,
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

export const getStatefulSetPodMetricsQueryPayload = (
	statefulSet: InframonitoringtypesStatefulSetRecordDTO,
	start: number,
	end: number,
	dotMetricsEnabled: boolean,
): GetQueryResultsProps[] => {
	const k8sStatefulSetNameKey = dotMetricsEnabled
		? INFRA_MONITORING_ATTR_KEYS.K8S_STATEFULSET_NAME
		: 'k8s_statefulset_name';

	return getPodUtilizationByPodQueryPayloads(
		{
			workloadNameKey: k8sStatefulSetNameKey,
			workloadNameValue:
				statefulSet.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_STATEFULSET_NAME] ?? '',
			clusterName:
				statefulSet.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME] ?? '',
			namespaceName:
				statefulSet.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME] ?? '',
		},
		start,
		end,
		dotMetricsEnabled,
	);
};
