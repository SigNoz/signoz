/* eslint-disable sonarjs/no-duplicate-string */
import { K8sVolumesData } from 'api/infraMonitoring/getK8sVolumesList';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';
import { v4 } from 'uuid';

export const volumeWidgetInfo = [
	{
		title: 'Volume available',
		yAxisUnit: 'bytes',
	},
	{
		title: 'Volume capacity',
		yAxisUnit: 'bytes',
	},
	{
		title: 'Volume inodes used',
		yAxisUnit: 'short',
	},
	{
		title: 'Volume inodes',
		yAxisUnit: 'short',
	},
	{
		title: 'Volume inodes free',
		yAxisUnit: 'short',
	},
];

export const getVolumeQueryPayload = (
	volume: K8sVolumesData,
	start: number,
	end: number,
	dotMetricsEnabled: boolean,
): GetQueryResultsProps[] => {
	const k8sClusterNameKey = dotMetricsEnabled
		? 'k8s.cluster.name'
		: 'k8s_cluster_name';
	const k8sNamespaceNameKey = dotMetricsEnabled
		? 'k8s.namespace.name'
		: 'k8s_namespace_name';
	const k8sVolumeAvailableKey = dotMetricsEnabled
		? 'k8s.volume.available'
		: 'k8s_volume_available';
	const k8sVolumeCapacityKey = dotMetricsEnabled
		? 'k8s.volume.capacity'
		: 'k8s_volume_capacity';
	const k8sVolumeInodesUsedKey = dotMetricsEnabled
		? 'k8s.volume.inodes.used'
		: 'k8s_volume_inodes_used';
	const k8sVolumeInodesKey = dotMetricsEnabled
		? 'k8s.volume.inodes'
		: 'k8s_volume_inodes';
	const k8sVolumeInodesFreeKey = dotMetricsEnabled
		? 'k8s.volume.inodes.free'
		: 'k8s_volume_inodes_free';
	const k8sVolumeTypeKey = dotMetricsEnabled
		? 'k8s.volume.type'
		: 'k8s_volume_type';
	const k8sPVCNameKey = dotMetricsEnabled
		? 'k8s.persistentvolumeclaim.name'
		: 'k8s_persistentvolumeclaim_name';
	const legendTemplate = dotMetricsEnabled
		? '{{k8s.namespace.name}}-{{k8s.pod.name}}'
		: '{{k8s_namespace_name}}-{{k8s_pod_name}}';

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
								id: 'k8s_volume_available--float64--Gauge--true',
								key: k8sVolumeAvailableKey,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'A',
							filters: {
								items: [
									{
										id: 'c1',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_cluster_name--string--tag--false',
											key: k8sClusterNameKey,
											type: 'tag',
										},
										op: '=',
										value: volume.meta.k8s_cluster_name,
									},
									{
										id: 'c2',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_namespace_name--string--tag--false',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: 'in',
										value: [volume.meta.k8s_namespace_name],
									},
									{
										id: 'c3',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_volume_type--string--tag--false',
											key: k8sVolumeTypeKey,
											type: 'tag',
										},
										op: 'in',
										value: ['persistentVolumeClaim'],
									},
									{
										id: 'c4',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_persistentvolumeclaim_name--string--tag--false',
											key: k8sPVCNameKey,
											type: 'tag',
										},
										op: '=',
										value: volume.persistentVolumeClaimName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: legendTemplate,
							limit: null,
							orderBy: [],
							queryName: 'A',
							reduceTo: 'sum',
							spaceAggregation: 'sum',
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
								id: 'k8s_volume_capacity--float64--Gauge--true',
								key: k8sVolumeCapacityKey,
								type: 'Gauge',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'A',
							filters: {
								items: [
									{
										id: 'c1',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_cluster_name--string--tag--false',
											key: k8sClusterNameKey,
											type: 'tag',
										},
										op: '=',
										value: volume.meta.k8s_cluster_name,
									},
									{
										id: 'c2',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_namespace_name--string--tag--false',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: 'in',
										value: [volume.meta.k8s_namespace_name],
									},
									{
										id: 'c3',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_volume_type--string--tag--false',
											key: k8sVolumeTypeKey,
											type: 'tag',
										},
										op: 'in',
										value: ['persistentVolumeClaim'],
									},
									{
										id: 'c4',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_persistentvolumeclaim_name--string--tag--false',
											key: k8sPVCNameKey,
											type: 'tag',
										},
										op: '=',
										value: volume.persistentVolumeClaimName,
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: [],
							having: [],
							legend: legendTemplate,
							limit: null,
							orderBy: [],
							queryName: 'A',
							reduceTo: 'sum',
							spaceAggregation: 'sum',
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
								id: 'k8s_volume_inodes_used--float64----true',
								key: k8sVolumeInodesUsedKey,
								type: '',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'A',
							filters: {
								items: [
									{
										id: 'c1',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_cluster_name--string--tag--false',
											key: k8sClusterNameKey,
											type: 'tag',
										},
										op: '=',
										value: volume.meta.k8s_cluster_name,
									},
									{
										id: 'c2',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_namespace_name--string--tag--false',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: 'in',
										value: [volume.meta.k8s_namespace_name],
									},
									{
										id: 'c3',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_volume_type--string--tag--false',
											key: k8sVolumeTypeKey,
											type: 'tag',
										},
										op: 'in',
										value: ['persistentVolumeClaim'],
									},
									{
										id: 'c4',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_persistentvolumeclaim_name--string--tag--false',
											key: k8sPVCNameKey,
											type: 'tag',
										},
										op: '=',
										value: volume.persistentVolumeClaimName,
									},
								],
								op: 'AND',
							},
							groupBy: [],
							having: [],
							legend: legendTemplate,
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
								id: 'k8s_volume_inodes--float64----true',
								key: k8sVolumeInodesKey,
								type: '',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'A',
							filters: {
								items: [
									{
										id: 'c1',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_cluster_name--string--tag--false',
											key: k8sClusterNameKey,
											type: 'tag',
										},
										op: '=',
										value: volume.meta.k8s_cluster_name,
									},
									{
										id: 'c2',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_namespace_name--string--tag--false',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: 'in',
										value: [volume.meta.k8s_namespace_name],
									},
									{
										id: 'c3',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_volume_type--string--tag--false',
											key: k8sVolumeTypeKey,
											type: 'tag',
										},
										op: 'in',
										value: ['persistentVolumeClaim'],
									},
									{
										id: 'c4',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_persistentvolumeclaim_name--string--tag--false',
											key: k8sPVCNameKey,
											type: 'tag',
										},
										op: '=',
										value: volume.persistentVolumeClaimName,
									},
								],
								op: 'AND',
							},
							groupBy: [],
							having: [],
							legend: legendTemplate,
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
								id: 'k8s_volume_inodes_free--float64----true',
								key: k8sVolumeInodesFreeKey,
								type: '',
							},
							aggregateOperator: 'avg',
							dataSource: DataSource.METRICS,
							disabled: false,
							expression: 'A',
							filters: {
								items: [
									{
										id: 'c1',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_cluster_name--string--tag--false',
											key: k8sClusterNameKey,
											type: 'tag',
										},
										op: '=',
										value: volume.meta.k8s_cluster_name,
									},
									{
										id: 'c2',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_namespace_name--string--tag--false',
											key: k8sNamespaceNameKey,
											type: 'tag',
										},
										op: 'in',
										value: [volume.meta.k8s_namespace_name],
									},
									{
										id: 'c3',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_volume_type--string--tag--false',
											key: k8sVolumeTypeKey,
											type: 'tag',
										},
										op: 'in',
										value: ['persistentVolumeClaim'],
									},
									{
										id: 'c4',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_persistentvolumeclaim_name--string--tag--false',
											key: k8sPVCNameKey,
											type: 'tag',
										},
										op: '=',
										value: volume.persistentVolumeClaimName,
									},
								],
								op: 'AND',
							},
							groupBy: [],
							having: [],
							legend: legendTemplate,
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
