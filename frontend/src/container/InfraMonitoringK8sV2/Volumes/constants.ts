import { InframonitoringtypesVolumeRecordDTO } from 'api/generated/services/sigNoz.schemas';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { EQueryType } from 'types/common/dashboard';
import { DataSource, ReduceOperators } from 'types/common/queryBuilder';
import { v4 } from 'uuid';

import { K8sDetailsMetadataConfig } from '../Base/K8sBaseDetails';
import { INFRA_MONITORING_ATTR_KEYS } from '../constants';
import { SelectedItemParams } from '../hooks';
import {
	buildEventsExpression,
	buildExpressionFromSelectedItemParams,
	buildLogsTracesExpression,
} from 'container/InfraMonitoringK8sV2/Base/utils';

export const k8sVolumeGetSelectedItemExpression = (
	params: SelectedItemParams,
): string =>
	buildExpressionFromSelectedItemParams(
		params,
		INFRA_MONITORING_ATTR_KEYS.K8S_PERSISTENT_VOLUME_CLAIM_NAME,
	);

export const k8sVolumeDetailsMetadataConfig: K8sDetailsMetadataConfig<InframonitoringtypesVolumeRecordDTO>[] =
	[
		{
			label: 'PVC Name',
			getValue: (p): string => p.persistentVolumeClaimName || '',
		},
		{
			label: 'Cluster Name',
			getValue: (p): string =>
				p.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME] || '',
		},
		{
			label: 'Namespace Name',
			getValue: (p): string =>
				p.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME] || '',
		},
	];

export const k8sVolumeInitialEventsExpression = (
	item: InframonitoringtypesVolumeRecordDTO,
): string =>
	buildEventsExpression({
		objectKind: 'PersistentVolumeClaim',
		objectName: item.persistentVolumeClaimName || '',
		clusterName: item.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME],
		namespaceName: item.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME],
	});

export const k8sVolumeInitialLogTracesExpression = (
	item: InframonitoringtypesVolumeRecordDTO,
): string =>
	buildLogsTracesExpression({
		mainAttributeKey: INFRA_MONITORING_ATTR_KEYS.K8S_PERSISTENT_VOLUME_CLAIM_NAME,
		mainAttributeValue: item.persistentVolumeClaimName,
		clusterName: item.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME],
		namespaceName: item.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME],
	});

export const k8sVolumeGetEntityName = (
	item: InframonitoringtypesVolumeRecordDTO,
): string => item.persistentVolumeClaimName || '';

export const volumeWidgetInfo = [
	{
		title: 'Volume available',
		yAxisUnit: 'bytes',
		docPath: '/infrastructure-monitoring/kubernetes/volumes/#volume-available',
	},
	{
		title: 'Volume capacity',
		yAxisUnit: 'bytes',
		docPath: '/infrastructure-monitoring/kubernetes/volumes/#volume-capacity',
	},
	{
		title: 'Volume inodes used',
		yAxisUnit: 'short',
		docPath: '/infrastructure-monitoring/kubernetes/volumes/#volume-inodes-used',
	},
	{
		title: 'Volume inodes',
		yAxisUnit: 'short',
		docPath: '/infrastructure-monitoring/kubernetes/volumes/#volume-inodes',
	},
	{
		title: 'Volume inodes free',
		yAxisUnit: 'short',
		docPath: '/infrastructure-monitoring/kubernetes/volumes/#volume-inodes-free',
	},
];

export const getVolumeMetricsQueryPayload = (
	volume: InframonitoringtypesVolumeRecordDTO,
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
								id: 'k8s_volume_available--float64--Gauge--true',
								key: INFRA_MONITORING_ATTR_KEYS.K8S_VOLUME_AVAILABLE,
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
											key: INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME,
											type: 'tag',
										},
										op: '=',
										value:
											volume.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME] || '',
									},
									{
										id: 'c2',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_namespace_name--string--tag--false',
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
											type: 'tag',
										},
										op: 'in',
										value: [
											volume.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME] || '',
										],
									},
									{
										id: 'c3',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_volume_type--string--tag--false',
											key: INFRA_MONITORING_ATTR_KEYS.K8S_VOLUME_TYPE,
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
											key: INFRA_MONITORING_ATTR_KEYS.K8S_PERSISTENT_VOLUME_CLAIM_NAME,
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
							legend: 'Available',
							limit: null,
							orderBy: [],
							queryName: 'A',
							reduceTo: ReduceOperators.SUM,
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
								key: INFRA_MONITORING_ATTR_KEYS.K8S_VOLUME_CAPACITY,
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
											key: INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME,
											type: 'tag',
										},
										op: '=',
										value:
											volume.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME] || '',
									},
									{
										id: 'c2',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_namespace_name--string--tag--false',
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
											type: 'tag',
										},
										op: 'in',
										value: [
											volume.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME] || '',
										],
									},
									{
										id: 'c3',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_volume_type--string--tag--false',
											key: INFRA_MONITORING_ATTR_KEYS.K8S_VOLUME_TYPE,
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
											key: INFRA_MONITORING_ATTR_KEYS.K8S_PERSISTENT_VOLUME_CLAIM_NAME,
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
							legend: 'Capacity',
							limit: null,
							orderBy: [],
							queryName: 'A',
							reduceTo: ReduceOperators.SUM,
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
								id: 'k8s_volume_inodes_used--float64--Gauge--true',
								key: INFRA_MONITORING_ATTR_KEYS.K8S_VOLUME_INODES_USED,
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
											key: INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME,
											type: 'tag',
										},
										op: '=',
										value:
											volume.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME] || '',
									},
									{
										id: 'c2',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_namespace_name--string--tag--false',
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
											type: 'tag',
										},
										op: 'in',
										value: [
											volume.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME] || '',
										],
									},
									{
										id: 'c3',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_volume_type--string--tag--false',
											key: INFRA_MONITORING_ATTR_KEYS.K8S_VOLUME_TYPE,
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
											key: INFRA_MONITORING_ATTR_KEYS.K8S_PERSISTENT_VOLUME_CLAIM_NAME,
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
							legend: 'Inodes Used',
							limit: null,
							orderBy: [],
							queryName: 'A',
							reduceTo: ReduceOperators.SUM,
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
								id: 'k8s_volume_inodes--float64--Gauge--true',
								key: INFRA_MONITORING_ATTR_KEYS.K8S_VOLUME_INODES,
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
											key: INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME,
											type: 'tag',
										},
										op: '=',
										value:
											volume.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME] || '',
									},
									{
										id: 'c2',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_namespace_name--string--tag--false',
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
											type: 'tag',
										},
										op: 'in',
										value: [
											volume.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME] || '',
										],
									},
									{
										id: 'c3',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_volume_type--string--tag--false',
											key: INFRA_MONITORING_ATTR_KEYS.K8S_VOLUME_TYPE,
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
											key: INFRA_MONITORING_ATTR_KEYS.K8S_PERSISTENT_VOLUME_CLAIM_NAME,
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
							legend: 'Total Inodes',
							limit: null,
							orderBy: [],
							queryName: 'A',
							reduceTo: ReduceOperators.SUM,
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
								id: 'k8s_volume_inodes_free--float64--Gauge--true',
								key: INFRA_MONITORING_ATTR_KEYS.K8S_VOLUME_INODES_FREE,
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
											key: INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME,
											type: 'tag',
										},
										op: '=',
										value:
											volume.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME] || '',
									},
									{
										id: 'c2',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_namespace_name--string--tag--false',
											key: INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
											type: 'tag',
										},
										op: 'in',
										value: [
											volume.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME] || '',
										],
									},
									{
										id: 'c3',
										key: {
											dataType: DataTypes.String,
											id: 'k8s_volume_type--string--tag--false',
											key: INFRA_MONITORING_ATTR_KEYS.K8S_VOLUME_TYPE,
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
											key: INFRA_MONITORING_ATTR_KEYS.K8S_PERSISTENT_VOLUME_CLAIM_NAME,
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
							legend: 'Inodes Free',
							limit: null,
							orderBy: [],
							queryName: 'A',
							reduceTo: ReduceOperators.SUM,
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
