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
import { K8sDeploymentsData } from './api';

export const k8sDeploymentGetSelectedItemFilters = (
	selectedItemId: string,
): TagFilter => ({
	op: 'AND',
	items: [
		{
			id: 'k8s_deployment_name',
			key: {
				key: 'k8s_deployment_name',
				type: null,
			},
			op: '=',
			value: selectedItemId,
		},
	],
});

export const k8sDeploymentDetailsMetadataConfig: K8sDetailsMetadataConfig<K8sDeploymentsData>[] = [
	{
		label: 'Deployment Name',
		getValue: (p): string => p.meta.k8s_deployment_name,
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

export const k8sDeploymentInitialFilters = [
	QUERY_KEYS.K8S_DEPLOYMENT_NAME,
	QUERY_KEYS.K8S_NAMESPACE_NAME,
];

export const k8sDeploymentInitialEventsFilter = (
	item: K8sDeploymentsData,
): ReturnType<typeof createFilterItem>[] => [
	createFilterItem(QUERY_KEYS.K8S_OBJECT_KIND, 'Deployment'),
	createFilterItem(QUERY_KEYS.K8S_OBJECT_NAME, item.meta.k8s_deployment_name),
];

export const k8sDeploymentInitialLogTracesFilter = (
	item: K8sDeploymentsData,
): ReturnType<typeof createFilterItem>[] => [
	createFilterItem(
		QUERY_KEYS.K8S_DEPLOYMENT_NAME,
		item.meta.k8s_deployment_name,
	),
	createFilterItem(QUERY_KEYS.K8S_NAMESPACE_NAME, item.meta.k8s_namespace_name),
];

export const k8sDeploymentGetEntityName = (item: K8sDeploymentsData): string =>
	item.meta.k8s_deployment_name;

export const deploymentWidgetInfo = [
	{
		title: 'CPU usage, request, limits',
		yAxisUnit: '',
	},
	{
		title: 'Memory usage, request, limits)',
		yAxisUnit: 'bytes',
	},
	{
		title: 'Network IO',
		yAxisUnit: 'binBps',
	},
	{
		title: 'Network error count',
		yAxisUnit: '',
	},
];

export const getDeploymentMetricsQueryPayload = (
	deployment: K8sDeploymentsData,
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
										value: deployment.meta.k8s_deployment_name,
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
										value: deployment.meta.k8s_deployment_name,
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
										value: deployment.meta.k8s_deployment_name,
									},
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
										value: deployment.meta.k8s_deployment_name,
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
										value: deployment.meta.k8s_deployment_name,
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
										value: deployment.meta.k8s_deployment_name,
									},
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
										value: deployment.meta.k8s_deployment_name,
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
										id: 'e16c1e4a',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_deployment_name--string--tag--false',
											key: k8sDeploymentNameKey,
											type: 'tag',
										},
										op: '=',
										value: deployment.meta.k8s_deployment_name,
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
