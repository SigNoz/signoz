import { InframonitoringtypesDeploymentRecordDTO } from 'api/generated/services/sigNoz.schemas';
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

export const k8sDeploymentGetSelectedItemExpression = (
	params: SelectedItemParams,
): string =>
	buildExpressionFromSelectedItemParams(
		params,
		INFRA_MONITORING_ATTR_KEYS.K8S_DEPLOYMENT_NAME,
	);

export const k8sDeploymentDetailsMetadataConfig: K8sDetailsMetadataConfig<InframonitoringtypesDeploymentRecordDTO>[] =
	[
		{
			label: 'Deployment Name',
			getValue: (p): string =>
				p.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_DEPLOYMENT_NAME] ?? '',
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

export const k8sDeploymentInitialEventsExpression = (
	item: InframonitoringtypesDeploymentRecordDTO,
): string =>
	buildEventsExpression({
		objectKind: 'Deployment',
		objectName: item.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_DEPLOYMENT_NAME] ?? '',
		clusterName: item.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME],
		namespaceName: item.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME],
	});

export const k8sDeploymentInitialLogTracesExpression = (
	item: InframonitoringtypesDeploymentRecordDTO,
): string =>
	buildLogsTracesExpression({
		mainAttributeKey: INFRA_MONITORING_ATTR_KEYS.K8S_DEPLOYMENT_NAME,
		mainAttributeValue:
			item.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_DEPLOYMENT_NAME],
		clusterName: item.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME],
		namespaceName: item.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME],
	});

export const k8sDeploymentGetEntityName = (
	item: InframonitoringtypesDeploymentRecordDTO,
): string => item.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_DEPLOYMENT_NAME] ?? '';

export const deploymentWidgetInfo = [
	{
		title: 'CPU usage, request, limits',
		yAxisUnit: '',
		docPath:
			'/infrastructure-monitoring/kubernetes/deployments/#cpu-usage-request-limits',
	},
	{
		title: 'Memory usage, request, limits',
		yAxisUnit: 'bytes',
		docPath:
			'/infrastructure-monitoring/kubernetes/deployments/#memory-usage-request-limits',
	},
	{
		title: 'Network IO',
		yAxisUnit: 'binBps',
		docPath: '/infrastructure-monitoring/kubernetes/deployments/#network-io',
	},
	{
		title: 'Network error count',
		yAxisUnit: '',
		docPath:
			'/infrastructure-monitoring/kubernetes/deployments/#network-error-count',
	},
];

export const getDeploymentMetricsQueryPayload = (
	deployment: InframonitoringtypesDeploymentRecordDTO,
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

	const k8sDeploymentNameKey = dotMetricsEnabled
		? 'k8s.deployment.name'
		: 'k8s_deployment_name';

	const k8sPodNameKey = dotMetricsEnabled ? 'k8s.pod.name' : 'k8s_pod_name';
	const k8sClusterNameKey = dotMetricsEnabled
		? 'k8s.cluster.name'
		: 'k8s_cluster_name';
	const k8sNamespaceNameKey = dotMetricsEnabled
		? 'k8s.namespace.name'
		: 'k8s_namespace_name';

	const clusterName =
		deployment.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME] ?? '';

	const namespaceName =
		deployment.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME] ?? '';

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
										id: 'aec60cba',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_deployment_name--string--tag--false',
											key: k8sDeploymentNameKey,
											type: 'tag',
										},
										op: '=',
										value:
											deployment.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_DEPLOYMENT_NAME] ??
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
										id: 'd047ec14',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',
											key: k8sPodNameKey,
											type: 'tag',
										},
										op: 'contains',
										value:
											deployment.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_DEPLOYMENT_NAME] ??
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
										id: '750b7856',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',
											key: k8sPodNameKey,
											type: 'tag',
										},
										op: 'contains',
										value:
											deployment.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_DEPLOYMENT_NAME] ??
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
										id: '768c2f47',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_deployment_name--string--tag--false',
											key: k8sDeploymentNameKey,
											type: 'tag',
										},
										op: '=',
										value:
											deployment.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_DEPLOYMENT_NAME] ??
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
										id: '1a96fa81',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',
											key: k8sPodNameKey,
											type: 'tag',
										},
										op: 'contains',
										value:
											deployment.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_DEPLOYMENT_NAME] ??
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
										id: 'e69a2b7e',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_pod_name--string--tag--false',
											key: k8sPodNameKey,
											type: 'tag',
										},
										op: 'contains',
										value:
											deployment.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_DEPLOYMENT_NAME] ??
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
										id: '8b550f6d',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_deployment_name--string--tag--false',
											key: k8sDeploymentNameKey,
											type: 'tag',
										},
										op: '=',
										value:
											deployment.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_DEPLOYMENT_NAME] ??
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
										id: 'e16c1e4a',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_deployment_name--string--tag--false',
											key: k8sDeploymentNameKey,
											type: 'tag',
										},
										op: '=',
										value:
											deployment.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_DEPLOYMENT_NAME] ??
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

export const getDeploymentPodMetricsQueryPayload = (
	deployment: InframonitoringtypesDeploymentRecordDTO,
	start: number,
	end: number,
	dotMetricsEnabled: boolean,
): GetQueryResultsProps[] => {
	const k8sDeploymentNameKey = dotMetricsEnabled
		? 'k8s.deployment.name'
		: 'k8s_deployment_name';

	return getPodUtilizationByPodQueryPayloads(
		{
			workloadNameKey: k8sDeploymentNameKey,
			workloadNameValue:
				deployment.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_DEPLOYMENT_NAME] ?? '',
			clusterName:
				deployment.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME] ?? '',
			namespaceName:
				deployment.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME] ?? '',
		},
		start,
		end,
		dotMetricsEnabled,
	);
};
