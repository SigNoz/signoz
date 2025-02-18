import { Color } from '@signozhq/design-tokens';
import { Typography } from 'antd';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import { Ghost } from 'lucide-react';
import {
	BaseAutocompleteData,
	DataTypes,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import {
	IBuilderQuery,
	TagFilterItem,
} from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';
import { nanoToMilli } from 'utils/timeUtils';
import { v4 as uuidv4 } from 'uuid';

import { K8sCategory } from '../constants';

export const QUERY_KEYS = {
	K8S_OBJECT_KIND: 'k8s.object.kind',
	K8S_OBJECT_NAME: 'k8s.object.name',
	K8S_POD_NAME: 'k8s.pod.name',
	K8S_NAMESPACE_NAME: 'k8s.namespace.name',
	K8S_CLUSTER_NAME: 'k8s.cluster.name',
	K8S_NODE_NAME: 'k8s.node.name',
	K8S_DEPLOYMENT_NAME: 'k8s.deployment.name',
	K8S_STATEFUL_SET_NAME: 'k8s.statefulset.name',
	K8S_JOB_NAME: 'k8s.job.name',
	K8S_DAEMON_SET_NAME: 'k8s.daemonset.name',
};

/**
 * Returns the payload configuration to fetch events for a K8s entity
 */
export const getEntityEventsOrLogsQueryPayload = (
	start: number,
	end: number,
	filters: IBuilderQuery['filters'],
): GetQueryResultsProps => ({
	graphType: PANEL_TYPES.LIST,
	selectedTime: 'GLOBAL_TIME',
	query: {
		clickhouse_sql: [],
		promql: [],
		builder: {
			queryData: [
				{
					dataSource: DataSource.LOGS,
					queryName: 'A',
					aggregateOperator: 'noop',
					aggregateAttribute: {
						id: '------false',
						dataType: DataTypes.String,
						key: '',
						isColumn: false,
						type: '',
						isJSON: false,
					},
					timeAggregation: 'rate',
					spaceAggregation: 'sum',
					functions: [],
					filters,
					expression: 'A',
					disabled: false,
					stepInterval: 60,
					having: [],
					limit: null,
					orderBy: [
						{
							columnName: 'timestamp',
							order: 'desc',
						},
					],
					groupBy: [],
					legend: '',
					reduceTo: 'avg',
					offset: 0,
					pageSize: 100,
				},
			],
			queryFormulas: [],
		},
		id: uuidv4(),
		queryType: EQueryType.QUERY_BUILDER,
	},
	params: {
		lastLogLineTimestamp: null,
	},
	start,
	end,
});

/**
 * Empty state container for entity details
 */
export function EntityDetailsEmptyContainer({
	view,
	category,
}: {
	view: 'logs' | 'traces' | 'events';
	category: K8sCategory;
}): React.ReactElement {
	const label = category.slice(0, category.length);

	return (
		<div className="no-logs-found">
			<Typography.Text type="secondary">
				<Ghost size={24} color={Color.BG_AMBER_500} />
				{`No ${view} found for this ${label}
				in the selected time range.`}
			</Typography.Text>
		</div>
	);
}

export const entityTracesColumns = [
	{
		dataIndex: 'timestamp',
		key: 'timestamp',
		title: 'Timestamp',
		width: 200,
		render: (timestamp: string): string => new Date(timestamp).toLocaleString(),
	},
	{
		title: 'Service Name',
		dataIndex: ['data', 'serviceName'],
		key: 'serviceName-string-tag',
		width: 150,
	},
	{
		title: 'Name',
		dataIndex: ['data', 'name'],
		key: 'name-string-tag',
		width: 145,
	},
	{
		title: 'Duration',
		dataIndex: ['data', 'durationNano'],
		key: 'durationNano-float64-tag',
		width: 145,
		render: (duration: number): string => `${nanoToMilli(duration)}ms`,
	},
	{
		title: 'HTTP Method',
		dataIndex: ['data', 'httpMethod'],
		key: 'httpMethod-string-tag',
		width: 145,
	},
	{
		title: 'Status Code',
		dataIndex: ['data', 'responseStatusCode'],
		key: 'responseStatusCode-string-tag',
		width: 145,
	},
];

export const selectedEntityTracesColumns: BaseAutocompleteData[] = [
	{
		key: 'timestamp',
		dataType: DataTypes.String,
		type: 'tag',
		isColumn: true,
	},
	{
		key: 'serviceName',
		dataType: DataTypes.String,
		type: 'tag',
		isColumn: true,
	},
	{
		key: 'name',
		dataType: DataTypes.String,
		type: 'tag',
		isColumn: true,
	},
	{
		key: 'durationNano',
		dataType: DataTypes.Float64,
		type: 'tag',
		isColumn: true,
	},
	{
		key: 'httpMethod',
		dataType: DataTypes.String,
		type: 'tag',
		isColumn: true,
	},
	{
		key: 'responseStatusCode',
		dataType: DataTypes.String,
		type: 'tag',
		isColumn: true,
	},
];

export const getEntityTracesQueryPayload = (
	start: number,
	end: number,
	offset = 0,
	filters: IBuilderQuery['filters'],
): GetQueryResultsProps => ({
	query: {
		promql: [],
		clickhouse_sql: [],
		builder: {
			queryData: [
				{
					dataSource: DataSource.TRACES,
					queryName: 'A',
					aggregateOperator: 'noop',
					aggregateAttribute: {
						id: '------false',
						dataType: DataTypes.EMPTY,
						key: '',
						isColumn: false,
						type: '',
						isJSON: false,
					},
					timeAggregation: 'rate',
					spaceAggregation: 'sum',
					functions: [],
					filters,
					expression: 'A',
					disabled: false,
					stepInterval: 60,
					having: [],
					limit: null,
					orderBy: [
						{
							columnName: 'timestamp',
							order: 'desc',
						},
					],
					groupBy: [],
					legend: '',
					reduceTo: 'avg',
				},
			],
			queryFormulas: [],
		},
		id: '572f1d91-6ac0-46c0-b726-c21488b34434',
		queryType: EQueryType.QUERY_BUILDER,
	},
	graphType: PANEL_TYPES.LIST,
	selectedTime: 'GLOBAL_TIME',
	start,
	end,
	params: {
		dataSource: DataSource.TRACES,
	},
	tableParams: {
		pagination: {
			limit: 10,
			offset,
		},
		selectColumns: [
			{
				key: 'serviceName',
				dataType: 'string',
				type: 'tag',
				isColumn: true,
				isJSON: false,
				id: 'serviceName--string--tag--true',
				isIndexed: false,
			},
			{
				key: 'name',
				dataType: 'string',
				type: 'tag',
				isColumn: true,
				isJSON: false,
				id: 'name--string--tag--true',
				isIndexed: false,
			},
			{
				key: 'durationNano',
				dataType: 'float64',
				type: 'tag',
				isColumn: true,
				isJSON: false,
				id: 'durationNano--float64--tag--true',
				isIndexed: false,
			},
			{
				key: 'httpMethod',
				dataType: 'string',
				type: 'tag',
				isColumn: true,
				isJSON: false,
				id: 'httpMethod--string--tag--true',
				isIndexed: false,
			},
			{
				key: 'responseStatusCode',
				dataType: 'string',
				type: 'tag',
				isColumn: true,
				isJSON: false,
				id: 'responseStatusCode--string--tag--true',
				isIndexed: false,
			},
		],
	},
});

export const filterOutPrimaryFilters = (
	filters: TagFilterItem[],
	primaryKeys: string[],
): TagFilterItem[] =>
	filters.filter(
		(filter) =>
			!primaryKeys.includes(filter.key?.key ?? '') && filter.key?.key !== 'id',
	);
