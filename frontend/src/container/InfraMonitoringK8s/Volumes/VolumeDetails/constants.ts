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
							id: 'k8s_volume_available--float64--Gauge--true',
							isColumn: true,
							isJSON: false,
							key: 'k8s_volume_available',
							type: 'Gauge',
						},
						aggregateOperator: 'avg',
						dataSource: DataSource.METRICS,
						disabled: false,
						expression: 'A',
						filters: {
							items: [
								{
									id: '6077fbc2',
									key: {
										dataType: DataTypes.String,
										id: 'k8s_cluster_name--string--tag--false',
										isColumn: false,
										key: 'k8s_cluster_name',
										type: 'tag',
									},
									op: '=',
									value: volume.meta.k8s_cluster_name,
								},
								{
									id: '6077fbc2',
									key: {
										dataType: DataTypes.String,
										id: 'k8s_namespace_name--string--tag--false',
										isColumn: false,
										key: 'k8s_namespace_name',
										type: 'tag',
									},
									op: 'in',
									value: [volume.meta.k8s_namespace_name],
								},
								{
									id: '217757e9',
									key: {
										dataType: DataTypes.String,
										id: 'k8s_volume_type--string--tag--false',
										isColumn: false,
										key: 'k8s_volume_type',
										type: 'tag',
									},
									op: 'in',
									value: ['persistentVolumeClaim'],
								},
								{
									id: '34754bda',
									key: {
										key: 'k8s_persistentvolumeclaim_name',
										dataType: DataTypes.String,
										type: 'tag',
										isColumn: false,
										isJSON: false,
										id: 'k8s_persistentvolumeclaim_name--string--tag--false',
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
						legend: '{{k8s_namespace_name}}-{{k8s_pod_name}}',
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
							id: 'k8s_volume_capacity--float64--Gauge--true',
							isColumn: true,
							isJSON: false,
							key: 'k8s_volume_capacity',
							type: 'Gauge',
						},
						aggregateOperator: 'avg',
						dataSource: DataSource.METRICS,
						disabled: false,
						expression: 'A',
						filters: {
							items: [
								{
									id: '6077fbc2',
									key: {
										dataType: DataTypes.String,
										id: 'k8s_cluster_name--string--tag--false',
										isColumn: false,
										key: 'k8s_cluster_name',
										type: 'tag',
									},
									op: '=',
									value: volume.meta.k8s_cluster_name,
								},
								{
									id: '0cdebb88',
									key: {
										dataType: DataTypes.String,
										id: 'k8s_namespace_name--string--tag--false',
										isColumn: false,
										key: 'k8s_namespace_name',
										type: 'tag',
									},
									op: 'in',
									value: [volume.meta.k8s_namespace_name],
								},
								{
									id: 'e0e880ce',
									key: {
										dataType: DataTypes.String,
										id: 'k8s_volume_type--string--tag--false',
										isColumn: false,
										key: 'k8s_volume_type',
										type: 'tag',
									},
									op: 'in',
									value: ['persistentVolumeClaim'],
								},
								{
									id: '34754bda',
									key: {
										key: 'k8s_persistentvolumeclaim_name',
										dataType: DataTypes.String,
										type: 'tag',
										isColumn: false,
										isJSON: false,
										id: 'k8s_persistentvolumeclaim_name--string--tag--false',
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
						legend: '{{k8s_namespace_name}}-{{k8s_pod_name}}',
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
							id: 'k8s_volume_inodes_used--float64----true',
							isColumn: true,
							key: 'k8s_volume_inodes_used',
							type: '',
						},
						aggregateOperator: 'avg',
						dataSource: DataSource.METRICS,
						disabled: false,
						expression: 'A',
						filters: {
							items: [
								{
									id: '6077fbc2',
									key: {
										dataType: DataTypes.String,
										id: 'k8s_cluster_name--string--tag--false',
										isColumn: false,
										key: 'k8s_cluster_name',
										type: 'tag',
									},
									op: '=',
									value: volume.meta.k8s_cluster_name,
								},
								{
									id: '46393c61',
									key: {
										dataType: DataTypes.String,
										id: 'k8s_namespace_name--string--tag--false',
										isColumn: false,
										key: 'k8s_namespace_name',
										type: 'tag',
									},
									op: 'in',
									value: [volume.meta.k8s_namespace_name],
								},
								{
									id: '450ee3cb',
									key: {
										dataType: DataTypes.String,
										id: 'k8s_volume_type--string--tag--false',
										isColumn: false,
										key: 'k8s_volume_type',
										type: 'tag',
									},
									op: 'in',
									value: ['persistentVolumeClaim'],
								},
								{
									id: '34754bda',
									key: {
										key: 'k8s_persistentvolumeclaim_name',
										dataType: DataTypes.String,
										type: 'tag',
										isColumn: false,
										isJSON: false,
										id: 'k8s_persistentvolumeclaim_name--string--tag--false',
									},
									op: '=',
									value: volume.persistentVolumeClaimName,
								},
							],
							op: 'AND',
						},
						groupBy: [],
						having: [],
						legend: '{{k8s_namespace_name}}-{{k8s_pod_name}}',
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
							id: 'k8s_volume_inodes--float64----true',
							isColumn: true,
							key: 'k8s_volume_inodes',
							type: '',
						},
						aggregateOperator: 'avg',
						dataSource: DataSource.METRICS,
						disabled: false,
						expression: 'A',
						filters: {
							items: [
								{
									id: '6077fbc2',
									key: {
										dataType: DataTypes.String,
										id: 'k8s_cluster_name--string--tag--false',
										isColumn: false,
										key: 'k8s_cluster_name',
										type: 'tag',
									},
									op: '=',
									value: volume.meta.k8s_cluster_name,
								},
								{
									id: '5a604bad',
									key: {
										dataType: DataTypes.String,
										id: 'k8s_namespace_name--string--tag--false',
										isColumn: false,
										key: 'k8s_namespace_name',
										type: 'tag',
									},
									op: 'in',
									value: [volume.meta.k8s_namespace_name],
								},
								{
									id: '24b074f3',
									key: {
										dataType: DataTypes.String,
										id: 'k8s_volume_type--string--tag--false',
										isColumn: false,
										key: 'k8s_volume_type',
										type: 'tag',
									},
									op: 'in',
									value: ['persistentVolumeClaim'],
								},
								{
									id: '34754bda',
									key: {
										key: 'k8s_persistentvolumeclaim_name',
										dataType: DataTypes.String,
										type: 'tag',
										isColumn: false,
										isJSON: false,
										id: 'k8s_persistentvolumeclaim_name--string--tag--false',
									},
									op: '=',
									value: volume.persistentVolumeClaimName,
								},
							],
							op: 'AND',
						},
						groupBy: [],
						having: [],
						legend: '{{k8s_namespace_name}}-{{k8s_pod_name}}',
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
							id: 'k8s_volume_inodes_free--float64----true',
							isColumn: true,
							key: 'k8s_volume_inodes_free',
							type: '',
						},
						aggregateOperator: 'avg',
						dataSource: DataSource.METRICS,
						disabled: false,
						expression: 'A',
						filters: {
							items: [
								{
									id: '6077fbc2',
									key: {
										dataType: DataTypes.String,
										id: 'k8s_cluster_name--string--tag--false',
										isColumn: false,
										key: 'k8s_cluster_name',
										type: 'tag',
									},
									op: '=',
									value: volume.meta.k8s_cluster_name,
								},
								{
									id: '8f01b14d',
									key: {
										dataType: DataTypes.String,
										id: 'k8s_namespace_name--string--tag--false',
										isColumn: false,
										key: 'k8s_namespace_name',
										type: 'tag',
									},
									op: 'in',
									value: [volume.meta.k8s_namespace_name],
								},
								{
									id: 'a72c99da',
									key: {
										dataType: DataTypes.String,
										id: 'k8s_volume_type--string--tag--false',
										isColumn: false,
										key: 'k8s_volume_type',
										type: 'tag',
									},
									op: 'in',
									value: ['persistentVolumeClaim'],
								},
								{
									id: '34754bda',
									key: {
										key: 'k8s_persistentvolumeclaim_name',
										dataType: DataTypes.String,
										type: 'tag',
										isColumn: false,
										isJSON: false,
										id: 'k8s_persistentvolumeclaim_name--string--tag--false',
									},
									op: '=',
									value: volume.persistentVolumeClaimName,
								},
							],
							op: 'AND',
						},
						groupBy: [],
						having: [],
						legend: '{{k8s_namespace_name}}-{{k8s_pod_name}}',
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
