/* eslint-disable sonarjs/no-duplicate-string */
import { Color } from '@signozhq/design-tokens';
import { Progress, Tag, Tooltip } from 'antd';
import { ColumnType } from 'antd/es/table';
import {
	FiltersType,
	IQuickFiltersConfig,
} from 'components/QuickFilters/types';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { GraphClickMetaData } from 'container/GridCardLayout/useNavigateToExplorerPages';
import { getWidgetQueryBuilder } from 'container/MetricsApplication/MetricsApplication.factory';
import dayjs from 'dayjs';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import { cloneDeep } from 'lodash-es';
import { ArrowUpDown, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { getWidgetQuery } from 'pages/MessagingQueues/MQDetails/MetricPage/MetricPageUtil';
import { ReactNode } from 'react';
import { Widgets } from 'types/api/dashboard/getAll';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import {
	BaseAutocompleteData,
	DataTypes,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import {
	IBuilderQuery,
	OrderByPayload,
	TagFilterItem,
} from 'types/api/queryBuilder/queryBuilderData';
import { QueryData } from 'types/api/widgets/getQuery';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';
import { v4 } from 'uuid';

import { SPAN_ATTRIBUTES } from './Explorer/Domains/DomainDetails/constants';

export const ApiMonitoringQuickFiltersConfig: IQuickFiltersConfig[] = [
	{
		type: FiltersType.CHECKBOX,
		title: 'Environment',

		attributeKey: {
			key: 'deployment.environment',
			dataType: DataTypes.String,
			type: 'resource',
			isColumn: false,
			isJSON: false,
		},
		dataSource: DataSource.TRACES,
		defaultOpen: true,
	},
	{
		type: FiltersType.CHECKBOX,
		title: 'Service Name',
		attributeKey: {
			key: 'service.name',
			dataType: DataTypes.String,
			type: 'resource',
			isColumn: true,
			isJSON: false,
		},
		dataSource: DataSource.TRACES,
		defaultOpen: true,
	},
	{
		type: FiltersType.CHECKBOX,
		title: 'RPC Method',
		attributeKey: {
			key: 'rpc.method',
			dataType: DataTypes.String,
			type: 'tag',
			isColumn: true,
			isJSON: false,
		},
		dataSource: DataSource.TRACES,
		defaultOpen: true,
	},
];

export const getLastUsedRelativeTime = (lastRefresh: number): string => {
	const currentTime = dayjs();

	const secondsDiff = currentTime.diff(lastRefresh, 'seconds');

	const minutedDiff = currentTime.diff(lastRefresh, 'minutes');
	const hoursDiff = currentTime.diff(lastRefresh, 'hours');
	const daysDiff = currentTime.diff(lastRefresh, 'days');
	const monthsDiff = currentTime.diff(lastRefresh, 'months');

	if (monthsDiff > 0) {
		return `${monthsDiff} ${monthsDiff === 1 ? 'month' : 'months'} ago`;
	}

	if (daysDiff > 0) {
		return `${daysDiff} ${daysDiff === 1 ? 'day' : 'days'} ago`;
	}

	if (hoursDiff > 0) {
		return `${hoursDiff}h ago`;
	}

	if (minutedDiff > 0) {
		return `${minutedDiff}m ago`;
	}

	return `${secondsDiff}s ago`;
};

// Rename this to a proper name
export const columnsConfig: ColumnType<APIDomainsRowData>[] = [
	{
		title: <div className="domain-list-name-col-header">Domain</div>,
		dataIndex: 'domainName',
		key: 'domainName',
		width: '23.7%',
		ellipsis: true,
		sorter: false,
		className: 'column column-domain-name',
		align: 'left',
		render: (domainName: string): React.ReactNode => (
			<div className="domain-list-name-col-value">{domainName}</div>
		),
	},
	{
		title: <div>Endpoints in use</div>,
		dataIndex: 'endpointCount',
		key: 'endpointCount',
		width: '14.2%',
		ellipsis: true,
		sorter: (rowA: APIDomainsRowData, rowB: APIDomainsRowData): number => {
			const endpointA =
				rowA.endpointCount === '-' || rowA.endpointCount === 'n/a'
					? ''
					: rowA.endpointCount;
			const endpointB =
				rowB.endpointCount === '-' || rowB.endpointCount === 'n/a'
					? ''
					: rowB.endpointCount;

			// Handle cases where one or both values are empty
			if (!endpointA && !endpointB) return 0;
			if (!endpointA) return 1;
			if (!endpointB) return -1;

			return Number(endpointA) - Number(endpointB);
		},
		align: 'right',
		className: `column`,
	},
	{
		title: <div>Last used</div>,
		dataIndex: 'lastUsed',
		key: 'lastUsed',
		width: '14.2%',
		align: 'right',
		className: `column`,
		sorter: (rowA: APIDomainsRowData, rowB: APIDomainsRowData): number => {
			const dateA =
				rowA.lastUsed === '-' || rowA.lastUsed === 'n/a'
					? new Date(0).toISOString()
					: rowA.lastUsed;
			const dateB =
				rowB.lastUsed === '-' || rowB.lastUsed === 'n/a'
					? new Date(0).toISOString()
					: rowB.lastUsed;

			return new Date(dateB).getTime() - new Date(dateA).getTime();
		},
		render: (lastUsed: string): string =>
			lastUsed === 'n/a' || lastUsed === '-'
				? '-'
				: getLastUsedRelativeTime(new Date(lastUsed).getTime()),
	},
	{
		title: (
			<div>
				Rate <span className="round-metric-tag">ops/s</span>
			</div>
		),
		dataIndex: 'rate',
		key: 'rate',
		width: '14.2%',
		sorter: (rowA: APIDomainsRowData, rowB: APIDomainsRowData): number => {
			const rateA = rowA.rate === '-' || rowA.rate === 'n/a' ? 0 : rowA.rate;
			const rateB = rowB.rate === '-' || rowB.rate === 'n/a' ? 0 : rowB.rate;
			return Number(rateA) - Number(rateB);
		},
		align: 'right',
		className: `column`,
	},
	{
		title: (
			<div>
				Error <span className="round-metric-tag">%</span>
			</div>
		),
		dataIndex: 'errorRate',
		key: 'errorRate',
		width: '14.2%',
		sorter: (rowA: APIDomainsRowData, rowB: APIDomainsRowData): number => {
			const errorRateA =
				rowA.errorRate === '-' || rowA.errorRate === 'n/a' ? 0 : rowA.errorRate;
			const errorRateB =
				rowB.errorRate === '-' || rowB.errorRate === 'n/a' ? 0 : rowB.errorRate;

			return Number(errorRateA) - Number(errorRateB);
		},
		align: 'right',
		className: `column`,
		render: (errorRate: number | string): React.ReactNode => {
			const errorRateValue =
				errorRate === 'n/a' || errorRate === '-' ? 0 : errorRate;
			return (
				<Progress
					status="active"
					percent={Number((errorRateValue as number).toFixed(2))}
					strokeLinecap="butt"
					size="small"
					strokeColor={((): string => {
						const errorRatePercent = Number((errorRateValue as number).toFixed(2));
						if (errorRatePercent >= 90) return Color.BG_SAKURA_500;
						if (errorRatePercent >= 60) return Color.BG_AMBER_500;
						return Color.BG_FOREST_500;
					})()}
					className="progress-bar error-rate"
				/>
			);
		},
	},
	{
		title: (
			<div>
				Avg. Latency <span className="round-metric-tag">ms</span>
			</div>
		),
		dataIndex: 'latency',
		key: 'latency',
		width: '14.2%',
		sorter: (rowA: APIDomainsRowData, rowB: APIDomainsRowData): number => {
			const latencyA =
				rowA.latency === '-' || rowA.latency === 'n/a' ? 0 : rowA.latency;
			const latencyB =
				rowB.latency === '-' || rowB.latency === 'n/a' ? 0 : rowB.latency;

			return Number(latencyA) - Number(latencyB);
		},
		align: 'right',
		className: `column`,
	},
];

// Rename this to a proper name
export const hardcodedAttributeKeys: BaseAutocompleteData[] = [
	{
		key: 'deployment.environment',
		dataType: DataTypes.String,
		type: 'resource',
		isColumn: false,
		isJSON: false,
	},
	{
		key: 'service.name',
		dataType: DataTypes.String,
		type: 'resource',
		isColumn: true,
		isJSON: false,
	},
	{
		key: 'rpc.method',
		dataType: DataTypes.String,
		type: 'tag',
		isColumn: true,
		isJSON: false,
	},
];

const domainNameKey = SPAN_ATTRIBUTES.SERVER_NAME;

interface APIMonitoringResponseRow {
	data: {
		endpoints: number | string;
		error_rate: number | string;
		lastseen: number | string;
		[domainNameKey]: string;
		p99: number | string;
		rps: number | string;
	};
}

interface EndPointsResponseRow {
	data: {
		[key: string]: string | number | undefined;
	};
}

export interface APIDomainsRowData {
	key: string;
	domainName: string;
	endpointCount: number | string;
	rate: number | string;
	errorRate: number | string;
	latency: number | string;
	lastUsed: string;
}

// Rename this to a proper name
export const formatDataForTable = (
	data: APIMonitoringResponseRow[],
): APIDomainsRowData[] =>
	data?.map((domain) => ({
		key: v4(),
		domainName: domain?.data[domainNameKey] || '-',
		endpointCount:
			domain?.data?.endpoints === 'n/a' || domain?.data?.endpoints === undefined
				? 0
				: domain?.data?.endpoints,
		rate:
			domain?.data?.rps === 'n/a' || domain?.data?.rps === undefined
				? '-'
				: domain?.data?.rps,
		errorRate:
			domain?.data?.error_rate === 'n/a' || domain?.data?.error_rate === undefined
				? 0
				: domain?.data?.error_rate,
		latency:
			domain?.data?.p99 === 'n/a' || domain?.data?.p99 === undefined
				? '-'
				: Math.round(Number(domain?.data?.p99) / 1000000), // Convert from nanoseconds to milliseconds
		lastUsed:
			domain?.data?.lastseen === 'n/a' || domain?.data?.lastseen === undefined
				? '-'
				: new Date(
						Math.floor(Number(domain?.data?.lastseen) / 1000000),
				  ).toISOString(), // Convert from nanoseconds to milliseconds
	}));

export const getDomainMetricsQueryPayload = (
	domainName: string,
	start: number,
	end: number,
	filters: IBuilderQuery['filters'],
): GetQueryResultsProps[] => [
	{
		selectedTime: 'GLOBAL_TIME',
		graphType: PANEL_TYPES.TABLE,
		query: {
			builder: {
				queryData: [
					{
						dataSource: DataSource.TRACES,
						queryName: 'A',
						aggregateOperator: 'count',
						aggregateAttribute: {
							dataType: DataTypes.String,
							isColumn: false,
							isJSON: false,
							key: SPAN_ATTRIBUTES.URL_PATH,
							type: 'tag',
						},
						timeAggregation: 'rate',
						spaceAggregation: 'sum',
						functions: [],
						filters: {
							items: [
								{
									id: '4c57937c',
									key: {
										dataType: DataTypes.String,
										isColumn: false,
										isJSON: false,
										key: SPAN_ATTRIBUTES.SERVER_NAME,
										type: 'tag',
									},
									op: '=',
									value: domainName,
								},
								...filters.items,
							],
							op: 'AND',
						},
						expression: 'A',
						disabled: false,
						stepInterval: 60,
						having: [],
						limit: null,
						orderBy: [],
						groupBy: [],
						legend: '',
						reduceTo: 'avg',
					},
					{
						dataSource: DataSource.TRACES,
						queryName: 'B',
						aggregateOperator: 'p99',
						aggregateAttribute: {
							dataType: DataTypes.Float64,
							isColumn: true,
							isJSON: false,
							key: 'duration_nano',
							type: '',
						},
						timeAggregation: 'p99',
						spaceAggregation: 'sum',
						functions: [],
						filters: {
							items: [
								{
									id: '2cf675cd',
									key: {
										dataType: DataTypes.String,
										isColumn: false,
										isJSON: false,
										key: SPAN_ATTRIBUTES.SERVER_NAME,
										type: 'tag',
									},
									op: '=',
									value: domainName,
								},
								...filters.items,
							],
							op: 'AND',
						},
						expression: 'B',
						disabled: false,
						stepInterval: 60,
						having: [],
						limit: null,
						orderBy: [],
						groupBy: [],
						legend: '',
						reduceTo: 'avg',
					},
					{
						dataSource: DataSource.TRACES,
						queryName: 'C',
						aggregateOperator: 'count',
						aggregateAttribute: {
							dataType: DataTypes.String,
							id: '------false',
							isColumn: false,
							key: '',
							type: '',
						},
						timeAggregation: 'count',
						spaceAggregation: 'sum',
						functions: [],
						filters: {
							items: [
								{
									id: '3db0f605',
									key: {
										dataType: DataTypes.String,
										isColumn: false,
										isJSON: false,
										key: SPAN_ATTRIBUTES.SERVER_NAME,
										type: 'tag',
									},
									op: '=',
									value: domainName,
								},
								{
									id: '6096f745',
									key: {
										dataType: DataTypes.bool,
										isColumn: true,
										isJSON: false,
										key: 'has_error',
										type: '',
									},
									op: '=',
									value: 'true',
								},
								...filters.items,
							],
							op: 'AND',
						},
						expression: 'C',
						disabled: true,
						stepInterval: 60,
						having: [],
						limit: null,
						orderBy: [],
						groupBy: [],
						legend: '',
						reduceTo: 'avg',
					},
					{
						dataSource: DataSource.TRACES,
						queryName: 'D',
						aggregateOperator: 'max',
						aggregateAttribute: {
							dataType: DataTypes.String,
							id: 'timestamp------false',
							isColumn: false,
							key: 'timestamp',
							type: '',
						},
						timeAggregation: 'max',
						spaceAggregation: 'sum',
						functions: [],
						filters: {
							items: [
								{
									id: '8ff8dea1',
									key: {
										dataType: DataTypes.String,
										isColumn: false,
										isJSON: false,
										key: SPAN_ATTRIBUTES.SERVER_NAME,
										type: 'tag',
									},
									op: '=',
									value: domainName,
								},
								...filters.items,
							],
							op: 'AND',
						},
						expression: 'D',
						disabled: false,
						stepInterval: 60,
						having: [],
						limit: null,
						orderBy: [],
						groupBy: [],
						legend: '',
						reduceTo: 'avg',
					},
				],
				queryFormulas: [
					{
						queryName: 'F1',
						expression: '(C/A)*100',
						disabled: false,
						legend: '',
					},
				],
			},
			clickhouse_sql: [
				{
					disabled: false,
					legend: '',
					name: 'A',
					query: '',
				},
			],
			id: '315b15fa-ff0c-442f-89f8-2bf4fb1af2f2',
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
		step: 60,
	},
];

export interface DomainMetricsData {
	endpointCount: number | string;
	latency: number | string;
	errorRate: number | string;
	lastUsed: number | string;
}

export interface DomainMetricsResponseRow {
	data: {
		A: number | string;
		B: number | string;
		D: number | string;
		F1: number | string;
	};
}

export const formatDomainMetricsDataForTable = (
	row: DomainMetricsResponseRow | undefined,
): DomainMetricsData => {
	if (!row) {
		return {
			endpointCount: '-',
			latency: '-',
			errorRate: 0,
			lastUsed: '-',
		};
	}
	return {
		endpointCount: row.data.A === 'n/a' || !row.data.A ? '-' : Number(row.data.A),
		latency:
			row.data.B === 'n/a' || row.data.B === undefined
				? '-'
				: Math.round(Number(row.data.B) / 1000000),
		errorRate: row.data.F1 === 'n/a' || !row.data.F1 ? 0 : Number(row.data.F1),
		lastUsed:
			row.data.D === 'n/a' || !row.data.D
				? '-'
				: getLastUsedRelativeTime(Math.floor(Number(row.data.D) / 1000000)),
	};
};

// Rename this to a proper name
const defaultGroupBy = [
	{
		dataType: DataTypes.String,
		isColumn: false,
		isJSON: false,
		key: SPAN_ATTRIBUTES.URL_PATH,
		type: 'tag',
	},
	// {
	// 	key: SPAN_ATTRIBUTES.SERVER_PORT,
	// 	dataType: DataTypes.Float64,
	// 	type: 'tag',
	// 	isColumn: false,
	// 	isJSON: false,
	// },
];

export const getEndPointsQueryPayload = (
	groupBy: BaseAutocompleteData[],
	domainName: string,
	start: number,
	end: number,
): GetQueryResultsProps[] => {
	const isGroupedByAttribute = groupBy.length > 0;
	return [
		{
			selectedTime: 'GLOBAL_TIME',
			graphType: PANEL_TYPES.TABLE,
			query: {
				builder: {
					queryData: [
						{
							aggregateAttribute: {
								dataType: DataTypes.String,
								isColumn: true,
								isJSON: false,
								key: 'span_id',
								type: '',
							},
							aggregateOperator: 'count',
							dataSource: DataSource.TRACES,
							disabled: false,
							expression: 'A',
							filters: {
								items: [
									{
										id: 'ec316e57',
										key: {
											dataType: DataTypes.String,
											isColumn: false,
											isJSON: false,
											key: SPAN_ATTRIBUTES.SERVER_NAME,
											type: 'tag',
										},
										op: '=',
										value: domainName,
									},
									{
										id: '212678b9',
										key: {
											key: 'kind_string',
											dataType: DataTypes.String,
											type: '',
											isColumn: true,
											isJSON: false,
										},
										op: '=',
										value: 'Client',
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: isGroupedByAttribute ? groupBy : defaultGroupBy,
							having: [],
							legend: '',
							limit: 1000,
							orderBy: [],
							queryName: 'A',
							reduceTo: 'avg',
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'count',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								isColumn: true,
								isJSON: false,
								key: 'duration_nano',
								type: '',
							},
							aggregateOperator: 'p99',
							dataSource: DataSource.TRACES,
							disabled: false,
							expression: 'B',
							filters: {
								items: [
									{
										id: '46d57857',
										key: {
											dataType: DataTypes.String,
											isColumn: false,
											isJSON: false,
											key: SPAN_ATTRIBUTES.SERVER_NAME,
											type: 'tag',
										},
										op: '=',
										value: domainName,
									},
									{
										id: '212678b9',
										key: {
											key: 'kind_string',
											dataType: DataTypes.String,
											type: '',
											isColumn: true,
											isJSON: false,
										},
										op: '=',
										value: 'Client',
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: isGroupedByAttribute ? groupBy : defaultGroupBy,
							having: [],
							legend: '',
							limit: 1000,
							orderBy: [],
							queryName: 'B',
							reduceTo: 'avg',
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'p99',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.String,
								id: 'timestamp------false',
								isColumn: false,
								key: 'timestamp',
								type: '',
							},
							aggregateOperator: 'max',
							dataSource: DataSource.TRACES,
							disabled: false,
							expression: 'C',
							filters: {
								items: [
									{
										id: '4a237616',
										key: {
											dataType: DataTypes.String,
											isColumn: false,
											isJSON: false,
											key: SPAN_ATTRIBUTES.SERVER_NAME,
											type: 'tag',
										},
										op: '=',
										value: domainName,
									},
									{
										id: '212678b9',
										key: {
											key: 'kind_string',
											dataType: DataTypes.String,
											type: '',
											isColumn: true,
											isJSON: false,
										},
										op: '=',
										value: 'Client',
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: isGroupedByAttribute ? groupBy : defaultGroupBy,
							having: [],
							legend: '',
							limit: 1000,
							orderBy: [],
							queryName: 'C',
							reduceTo: 'avg',
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'max',
						},
						{
							aggregateAttribute: {
								dataType: DataTypes.String,
								isColumn: true,
								isJSON: false,
								key: 'span_id',
								type: '',
							},
							aggregateOperator: 'count',
							dataSource: DataSource.TRACES,
							disabled: true,
							expression: 'D',
							filters: {
								items: [
									{
										id: 'f162de1e',
										key: {
											dataType: DataTypes.String,
											isColumn: false,
											isJSON: false,
											key: SPAN_ATTRIBUTES.SERVER_NAME,
											type: 'tag',
										},
										op: '=',
										value: domainName,
									},
									{
										id: '3df0ac1d',
										key: {
											dataType: DataTypes.bool,
											isColumn: true,
											isJSON: false,
											key: 'has_error',
											type: '',
										},
										op: '=',
										value: 'true',
									},
									{
										id: '212678b9',
										key: {
											key: 'kind_string',
											dataType: DataTypes.String,
											type: '',
											isColumn: true,
											isJSON: false,
										},
										op: '=',
										value: 'Client',
									},
								],
								op: 'AND',
							},
							functions: [],
							groupBy: isGroupedByAttribute ? groupBy : defaultGroupBy,
							having: [],
							legend: '',
							limit: 1000,
							orderBy: [],
							queryName: 'D',
							reduceTo: 'avg',
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'count',
						},
					],
					queryFormulas: [
						{
							queryName: 'F1',
							expression: '(D/A)*100',
							disabled: false,
							legend: 'error percentage',
						},
					],
				},
				clickhouse_sql: [
					{
						disabled: false,
						legend: '',
						name: 'A',
						query: '',
					},
				],
				id: '315b15fa-ff0c-442f-89f8-2bf4fb1af2f2',
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
			step: 60,
		},
	];
};

export const getTopErrorsQueryPayload = (
	domainName: string,
	start: number,
	end: number,
	filters: IBuilderQuery['filters'],
	showStatusCodeErrors = true,
): GetQueryResultsProps[] => [
	{
		selectedTime: 'GLOBAL_TIME',
		graphType: PANEL_TYPES.TABLE,
		query: {
			builder: {
				queryData: [
					{
						dataSource: DataSource.TRACES,
						queryName: 'A',
						aggregateOperator: 'count',
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
						filters: {
							op: 'AND',
							items: [
								{
									id: '04da97bd',
									key: {
										key: 'kind_string',
										dataType: DataTypes.String,
										type: '',
										isColumn: true,
										isJSON: false,
									},
									op: '=',
									value: 'Client',
								},
								{
									id: 'b1af6bdb',
									key: {
										key: SPAN_ATTRIBUTES.URL_PATH,
										dataType: DataTypes.String,
										type: 'tag',
										isColumn: false,
										isJSON: false,
									},
									op: 'exists',
									value: '',
								},
								...(showStatusCodeErrors
									? [
											{
												id: '75d65388',
												key: {
													key: 'status_message',
													dataType: DataTypes.String,
													type: '',
													isColumn: true,
													isJSON: false,
												},
												op: 'exists',
												value: '',
											},
									  ]
									: []),
								{
									id: '4872bf91',
									key: {
										key: SPAN_ATTRIBUTES.SERVER_NAME,
										dataType: DataTypes.String,
										type: 'tag',
										isColumn: false,
										isJSON: false,
									},
									op: '=',
									value: domainName,
								},
								{
									id: 'ab4c885d',
									key: {
										key: 'has_error',
										dataType: DataTypes.bool,
										type: '',
										isColumn: true,
										isJSON: false,
									},
									op: '=',
									value: true,
								},
								...filters.items,
							],
						},
						expression: 'A',
						disabled: false,
						stepInterval: 60,
						having: [],
						limit: 10,
						orderBy: [
							{
								columnName: 'timestamp',
								order: 'desc',
							},
						],
						groupBy: [
							{
								key: SPAN_ATTRIBUTES.URL_PATH,
								dataType: DataTypes.String,
								type: 'tag',
								isColumn: false,
								isJSON: false,
							},
							{
								dataType: DataTypes.String,
								isColumn: true,
								isJSON: false,
								key: 'response_status_code',
								type: '',
								id: 'response_status_code--string----true',
							},
							{
								key: 'status_message',
								dataType: DataTypes.String,
								type: '',
								isColumn: true,
								isJSON: false,
							},
						],
						legend: '',
						reduceTo: 'avg',
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
			id: '315b15fa-ff0c-442f-89f8-2bf4fb1af2f2',
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
		start,
		end,
		step: 240,
	},
];

export interface EndPointsTableRowData {
	key: string;
	endpointName: string;
	callCount: number | string;
	latency: number | string;
	errorRate: number | string;
	lastUsed: string | number;
	groupedByMeta?: Record<string, string | number>;
}

export const extractPortAndEndpoint = (
	url: string,
): { port: string; endpoint: string } => {
	try {
		// Create a URL object to parse the URL
		const parsedUrl = new URL(url);

		// Extract the port (will be empty string if not specified)
		const port = parsedUrl.port || '-';

		// Extract the pathname (endpoint) + query params
		const endpoint = parsedUrl.pathname + parsedUrl.search;

		return { port, endpoint };
	} catch (error) {
		// If URL parsing fails, return default values
		return { port: '-', endpoint: url };
	}
};

export const getEndPointsColumnsConfig = (
	isGroupedByAttribute: boolean,
	expandedRowKeys: React.Key[],
	// eslint-disable-next-line sonarjs/cognitive-complexity
): ColumnType<EndPointsTableRowData>[] => [
	{
		title: (
			<div className="endpoint-name-header">
				{isGroupedByAttribute ? 'Endpoint group' : 'Endpoint'}
			</div>
		),
		dataIndex: 'endpointName',
		key: 'endpointName',
		width: 180,
		ellipsis: true,
		sorter: false,
		className: 'column',
		render: (text: string, record: EndPointsTableRowData): React.ReactNode => {
			const endPointName = isGroupedByAttribute
				? text
				: extractPortAndEndpoint(record.endpointName).endpoint;
			return (
				<div className="endpoint-name-value">
					{((): React.ReactNode => {
						if (!isGroupedByAttribute) return null;
						return expandedRowKeys.includes(record.key) ? (
							<ChevronDown size={14} />
						) : (
							<ChevronRight size={14} />
						);
					})()}
					{isGroupedByAttribute
						? text.split(',').map((value) => (
								<Tag
									key={value}
									color={Color.BG_SLATE_100}
									className="endpoint-group-tag-item"
								>
									{value === '' ? '<no-value>' : value}
								</Tag>
						  ))
						: endPointName}
				</div>
			);
		},
	},
	{
		title: <div className="column-header">Port</div>,
		dataIndex: 'port',
		key: 'port',
		width: 180,
		ellipsis: true,
		sorter: false,
		align: 'right',
		className: `column`,
	},
	{
		title: (
			<div className="column-header">
				Num of calls <ArrowUpDown size={14} />
			</div>
		),
		dataIndex: 'callCount',
		key: 'callCount',
		width: 180,
		ellipsis: true,
		align: 'right',
		className: `column`,
	},
	{
		title: (
			<div>
				Error <span className="round-metric-tag">%</span>
			</div>
		),
		dataIndex: 'errorRate',
		key: 'errorRate',
		width: 120,
		sorter: true,
		align: 'right',
		className: `column`,
		render: (
			errorRate: number | string,
			// eslint-disable-next-line sonarjs/no-identical-functions
		): React.ReactNode => (
			<Progress
				status="active"
				percent={Number(
					((errorRate === 'n/a' || errorRate === '-'
						? 0
						: errorRate) as number).toFixed(1),
				)}
				strokeLinecap="butt"
				size="small"
				strokeColor={((): // eslint-disable-next-line sonarjs/no-identical-functions
				string => {
					const errorRatePercent = Number((errorRate as number).toFixed(1));
					if (errorRatePercent >= 90) return Color.BG_SAKURA_500;
					if (errorRatePercent >= 60) return Color.BG_AMBER_500;
					return Color.BG_FOREST_500;
				})()}
				className="progress-bar error-rate"
			/>
		),
	},
	{
		title: (
			<div>
				Latency <span className="round-metric-tag">ms</span>
			</div>
		),
		dataIndex: 'latency',
		key: 'latency',
		width: 120,
		sorter: true,
		align: 'right',
		className: `column`,
	},
	{
		title: <div>Last used</div>,
		dataIndex: 'lastUsed',
		key: 'lastUsed',
		width: 120,
		sorter: true,
		align: 'right',
		className: `column`,
		// eslint-disable-next-line sonarjs/no-identical-functions
		render: (lastUsed: string): string =>
			lastUsed === 'n/a' || lastUsed === '-'
				? '-'
				: getLastUsedRelativeTime(new Date(lastUsed).getTime()),
	},
];

export const formatEndPointsDataForTable = (
	data: EndPointsResponseRow[] | undefined,
	groupBy: BaseAutocompleteData[],
	orderBy?: OrderByPayload | null,
	// eslint-disable-next-line sonarjs/cognitive-complexity
): EndPointsTableRowData[] => {
	if (!data) return [];
	const isGroupedByAttribute = groupBy.length > 0;

	let formattedData: EndPointsTableRowData[] = [];

	if (!isGroupedByAttribute) {
		formattedData = data?.map((endpoint) => {
			const { port } = extractPortAndEndpoint(
				(endpoint.data[SPAN_ATTRIBUTES.URL_PATH] as string) || '',
			);
			return {
				key: v4(),
				endpointName: (endpoint.data[SPAN_ATTRIBUTES.URL_PATH] as string) || '-',
				port,
				callCount:
					endpoint.data.A === 'n/a' || endpoint.data.A === undefined
						? '-'
						: endpoint.data.A,
				latency:
					endpoint.data.B === 'n/a' || endpoint.data.B === undefined
						? '-'
						: Math.round(Number(endpoint.data.B) / 1000000), // Convert from nanoseconds to milliseconds
				lastUsed:
					endpoint.data.C === 'n/a' || endpoint.data.C === undefined
						? '-'
						: new Date(Math.floor(Number(endpoint.data.C) / 1000000)).toISOString(), // Convert from nanoseconds to milliseconds

				errorRate:
					endpoint.data.F1 === undefined || endpoint.data.F1 === 'n/a'
						? 0
						: Number(endpoint.data.F1),
			};
		});
	} else {
		const groupedByAttributeData = groupBy.map((attribute) => attribute.key);

		formattedData = data?.map((endpoint) => {
			const newEndpointName = groupedByAttributeData
				.map((attribute) => endpoint.data[attribute])
				.join(',');
			return {
				key: v4(),
				endpointName: newEndpointName,
				callCount:
					endpoint.data.A === 'n/a' || endpoint.data.A === undefined
						? '-'
						: endpoint.data.A,
				latency:
					endpoint.data.B === 'n/a' || endpoint.data.B === undefined
						? '-'
						: Math.round(Number(endpoint.data.B) / 1000000), // Convert from nanoseconds to milliseconds
				lastUsed:
					endpoint.data.C === 'n/a' || endpoint.data.C === undefined
						? '-'
						: getLastUsedRelativeTime(Math.floor(Number(endpoint.data.C) / 1000000)), // Convert from nanoseconds to milliseconds
				errorRate:
					endpoint.data.D === 'n/a' || endpoint.data.D === undefined
						? 0
						: Number(endpoint.data.D),
				groupedByMeta: groupedByAttributeData.reduce((acc, attribute) => {
					acc[attribute] = endpoint.data[attribute] || '';
					return acc;
				}, {} as Record<string, string | number>),
			};
		});
	}

	// Apply sorting if orderBy is provided
	if (orderBy) {
		formattedData.sort((a, b) => {
			let valueA: number | string = a[
				orderBy.columnName as keyof EndPointsTableRowData
			] as number | string;
			let valueB: number | string = b[
				orderBy.columnName as keyof EndPointsTableRowData
			] as number | string;

			// Handle special cases for each column type
			if (
				orderBy.columnName === 'callCount' ||
				orderBy.columnName === 'latency' ||
				orderBy.columnName === 'errorRate'
			) {
				valueA = valueA === '-' || valueA === 'n/a' ? 0 : Number(valueA);
				valueB = valueB === '-' || valueB === 'n/a' ? 0 : Number(valueB);
			} else if (orderBy.columnName === 'lastUsed') {
				// confirm once the implication of this
				valueA =
					valueA === '-' || valueA === 'n/a'
						? new Date(0).getTime()
						: new Date(valueA as string).getTime();
				valueB =
					valueB === '-' || valueB === 'n/a'
						? new Date(0).getTime()
						: new Date(valueB as string).getTime();
			}

			// Apply sort direction
			if (orderBy.order === 'asc') {
				return valueA > valueB ? 1 : -1;
			}
			return valueA < valueB ? 1 : -1;
		});
	}

	return formattedData;
};

export interface TopErrorsResponseRow {
	metric: {
		[SPAN_ATTRIBUTES.URL_PATH]: string;
		[SPAN_ATTRIBUTES.RESPONSE_STATUS_CODE]: string;
		status_message: string;
	};
	values: [number, string][];
	queryName: string;
	legend: string;
}

export interface TopErrorsTableRowData {
	key: string;
	endpointName: string;
	statusCode: string;
	statusMessage: string;
	count: number | string;
}

export const formatTopErrorsDataForTable = (
	data: TopErrorsResponseRow[] | undefined,
): TopErrorsTableRowData[] => {
	if (!data) return [];

	return data.map((row) => ({
		key: v4(),
		endpointName:
			row.metric[SPAN_ATTRIBUTES.URL_PATH] === 'n/a' ||
			row.metric[SPAN_ATTRIBUTES.URL_PATH] === undefined
				? '-'
				: row.metric[SPAN_ATTRIBUTES.URL_PATH],
		statusCode:
			row.metric[SPAN_ATTRIBUTES.RESPONSE_STATUS_CODE] === 'n/a' ||
			row.metric[SPAN_ATTRIBUTES.RESPONSE_STATUS_CODE] === undefined
				? '-'
				: row.metric[SPAN_ATTRIBUTES.RESPONSE_STATUS_CODE],
		statusMessage:
			row.metric.status_message === 'n/a' ||
			row.metric.status_message === undefined
				? '-'
				: row.metric.status_message,
		count:
			row.values &&
			row.values[0] &&
			row.values[0][1] !== undefined &&
			row.values[0][1] !== 'n/a'
				? row.values[0][1]
				: '-',
	}));
};

export const getTopErrorsCoRelationQueryFilters = (
	domainName: string,
	endPointName: string,
	statusCode: string,
): IBuilderQuery['filters'] => ({
	items: [
		{
			id: 'ea16470b',
			key: {
				key: 'http.url',
				dataType: DataTypes.String,
				type: 'tag',
				isColumn: false,
				isJSON: false,
				id: 'http.url--string--tag--false',
			},
			op: '=',
			value: endPointName,
		},
		{
			id: 'b0ef3799',
			key: {
				key: 'has_error',
				dataType: DataTypes.bool,
				type: '',
				isColumn: false,
				isJSON: false,
			},
			op: '=',
			value: 'true',
		},
		{
			id: 'e8a043b7',
			key: {
				key: 'net.peer.name',
				dataType: DataTypes.String,
				type: '',
				isColumn: false,
				isJSON: false,
			},
			op: '=',
			value: domainName,
		},
		{
			id: 'f6891e27',
			key: {
				key: 'response_status_code',
				dataType: DataTypes.String,
				type: '',
				isColumn: true,
				isJSON: false,
				id: 'response_status_code--string----true',
			},
			op: '=',
			value: statusCode,
		},
	],
	op: 'AND',
});

export const getTopErrorsColumnsConfig = (): ColumnType<TopErrorsTableRowData>[] => [
	{
		title: <div className="endpoint-name-header">Endpoint</div>,
		dataIndex: 'endpointName',
		key: 'endpointName',
		width: 180,
		ellipsis: true,
		sorter: false,
		className: 'column',
		render: (text: string, record: TopErrorsTableRowData): React.ReactNode => {
			const { endpoint } = extractPortAndEndpoint(record.endpointName);
			return (
				<Tooltip title="Click to open traces">
					<div className="endpoint-name-value">{endpoint}</div>
				</Tooltip>
			);
		},
	},
	{
		title: <div className="column-header">Status code</div>,
		dataIndex: 'statusCode',
		key: 'statusCode',
		width: 180,
		ellipsis: true,
		sorter: false,
		align: 'right',
		className: `column`,
	},
	{
		title: <div className="column-header">Status message</div>,
		dataIndex: 'statusMessage',
		key: 'statusMessage',
		width: 180,
		ellipsis: true,
		align: 'right',
		className: `column`,
	},
	{
		title: <div>Count</div>,
		dataIndex: 'count',
		key: 'count',
		width: 120,
		sorter: false,
		align: 'right',
		className: `column`,
	},
];

export const createFiltersForSelectedRowData = (
	selectedRowData: EndPointsTableRowData,
	currentFilters?: IBuilderQuery['filters'],
): IBuilderQuery['filters'] => {
	const baseFilters: IBuilderQuery['filters'] = {
		items: [...(currentFilters?.items || [])],
		op: 'and',
	};

	if (!selectedRowData) return baseFilters;

	const { groupedByMeta = {} } = selectedRowData;

	// Replace for...of with Object.keys().map()
	baseFilters.items.push(
		...Object.keys(groupedByMeta).map((key) => ({
			key: {
				key,
				type: null,
			},
			op: '=',
			value: groupedByMeta[key] || '',
			id: key,
		})),
	);

	return baseFilters;
};

// First query payload for endpoint metrics
// Second query payload for endpoint status code table
// Third query payload for endpoint dropdown selection
// Fourth query payload for endpoint dependant services
// Fifth query payload for endpoint response status count bar chart
// Sixth query payload for endpoint response status code latency bar chart
export const getEndPointDetailsQueryPayload = (
	domainName: string,
	start: number,
	end: number,
	filters: IBuilderQuery['filters'],
): GetQueryResultsProps[] => [
	{
		selectedTime: 'GLOBAL_TIME',
		graphType: PANEL_TYPES.TABLE,
		query: {
			builder: {
				queryData: [
					{
						aggregateAttribute: {
							dataType: DataTypes.String,
							id: '------false',
							isColumn: false,
							isJSON: false,
							key: '',
							type: '',
						},
						aggregateOperator: 'rate',
						dataSource: DataSource.TRACES,
						disabled: false,
						expression: 'A',
						filters: {
							items: [
								{
									id: '874562e1',
									key: {
										dataType: DataTypes.String,
										isColumn: false,
										isJSON: false,
										key: SPAN_ATTRIBUTES.SERVER_NAME,
										type: 'tag',
									},
									op: '=',
									value: domainName,
								},
								{
									id: '212678b9',
									key: {
										key: 'kind_string',
										dataType: DataTypes.String,
										type: '',
										isColumn: true,
										isJSON: false,
									},
									op: '=',
									value: 'Client',
								},
								...filters.items,
							],
							op: 'AND',
						},
						functions: [],
						groupBy: [],
						having: [],
						legend: 'Rate',
						limit: null,
						orderBy: [],
						queryName: 'A',
						reduceTo: 'avg',
						spaceAggregation: 'sum',
						stepInterval: 60,
						timeAggregation: 'rate',
					},
					{
						aggregateAttribute: {
							dataType: DataTypes.Float64,
							isColumn: true,
							isJSON: false,
							key: 'duration_nano',
							type: '',
						},
						aggregateOperator: 'p99',
						dataSource: DataSource.TRACES,
						disabled: false,
						expression: 'B',
						filters: {
							items: [
								{
									id: '0c5564e0',
									key: {
										dataType: DataTypes.String,
										isColumn: false,
										isJSON: false,
										key: SPAN_ATTRIBUTES.SERVER_NAME,
										type: 'tag',
									},
									op: '=',
									value: domainName,
								},
								{
									id: '212678b9',
									key: {
										key: 'kind_string',
										dataType: DataTypes.String,
										type: '',
										isColumn: true,
										isJSON: false,
									},
									op: '=',
									value: 'Client',
								},
								...filters.items,
							],
							op: 'AND',
						},
						functions: [],
						groupBy: [],
						having: [],
						legend: 'P99',
						limit: null,
						orderBy: [],
						queryName: 'B',
						reduceTo: 'avg',
						spaceAggregation: 'sum',
						stepInterval: 60,
						timeAggregation: 'p99',
					},
					{
						aggregateAttribute: {
							dataType: DataTypes.String,
							isColumn: true,
							isJSON: false,
							key: 'span_id',
							type: '',
						},
						aggregateOperator: 'count',
						dataSource: DataSource.TRACES,
						disabled: true,
						expression: 'C',
						filters: {
							items: [
								{
									id: '0d656701',
									key: {
										dataType: DataTypes.String,
										isColumn: false,
										isJSON: false,
										key: SPAN_ATTRIBUTES.SERVER_NAME,
										type: 'tag',
									},
									op: '=',
									value: domainName,
								},
								{
									id: '83ef9a1b',
									key: {
										dataType: DataTypes.bool,
										isColumn: true,
										isJSON: false,
										key: 'has_error',
										type: '',
									},
									op: '=',
									value: 'true',
								},
								{
									id: '212678b9',
									key: {
										key: 'kind_string',
										dataType: DataTypes.String,
										type: '',
										isColumn: true,
										isJSON: false,
									},
									op: '=',
									value: 'Client',
								},
								...filters.items,
							],
							op: 'AND',
						},
						functions: [],
						groupBy: [],
						having: [],
						legend: '',
						limit: null,
						orderBy: [],
						queryName: 'C',
						reduceTo: 'avg',
						spaceAggregation: 'sum',
						stepInterval: 60,
						timeAggregation: 'count',
					},
					{
						aggregateAttribute: {
							dataType: DataTypes.String,
							id: 'timestamp------false',
							isColumn: false,
							key: 'timestamp',
							type: '',
						},
						aggregateOperator: 'max',
						dataSource: DataSource.TRACES,
						disabled: false,
						expression: 'D',
						filters: {
							items: [
								{
									id: '918f5b99',
									key: {
										dataType: DataTypes.String,
										isColumn: false,
										isJSON: false,
										key: SPAN_ATTRIBUTES.SERVER_NAME,
										type: 'tag',
									},
									op: '=',
									value: domainName,
								},
								{
									id: '212678b9',
									key: {
										key: 'kind_string',
										dataType: DataTypes.String,
										type: '',
										isColumn: true,
										isJSON: false,
									},
									op: '=',
									value: 'Client',
								},
								...filters.items,
							],
							op: 'AND',
						},
						functions: [],
						groupBy: [],
						having: [],
						legend: 'Last seen',
						limit: null,
						orderBy: [],
						queryName: 'D',
						reduceTo: 'avg',
						spaceAggregation: 'sum',
						stepInterval: 60,
						timeAggregation: 'max',
					},
					{
						aggregateAttribute: {
							dataType: DataTypes.String,
							isColumn: true,
							isJSON: false,
							key: 'span_id',
							type: '',
						},
						aggregateOperator: 'count',
						dataSource: DataSource.TRACES,
						disabled: true,
						expression: 'E',
						filters: {
							items: [
								{
									id: 'b355d1aa',
									key: {
										dataType: DataTypes.String,
										isColumn: false,
										isJSON: false,
										key: SPAN_ATTRIBUTES.SERVER_NAME,
										type: 'tag',
									},
									op: '=',
									value: domainName,
								},
								{
									id: '212678b9',
									key: {
										key: 'kind_string',
										dataType: DataTypes.String,
										type: '',
										isColumn: true,
										isJSON: false,
									},
									op: '=',
									value: 'Client',
								},
								...filters.items,
							],
							op: 'AND',
						},
						functions: [],
						groupBy: [],
						having: [],
						legend: 'total',
						limit: null,
						orderBy: [],
						queryName: 'E',
						reduceTo: 'avg',
						spaceAggregation: 'sum',
						stepInterval: 60,
						timeAggregation: 'count',
					},
				],
				queryFormulas: [
					{
						queryName: 'F1',
						expression: '(C/E)*100',
						disabled: false,
						legend: 'error percentage',
					},
				],
			},
			clickhouse_sql: [
				{
					disabled: false,
					legend: '',
					name: 'A',
					query: '',
				},
			],
			id: '315b15fa-ff0c-442f-89f8-2bf4fb1af2f2',
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
		step: 60,
	},
	{
		selectedTime: 'GLOBAL_TIME',
		graphType: PANEL_TYPES.TABLE,
		query: {
			builder: {
				queryData: [
					{
						aggregateAttribute: {
							dataType: DataTypes.String,
							isColumn: true,
							isJSON: false,
							key: 'span_id',
							type: '',
						},
						aggregateOperator: 'count',
						dataSource: DataSource.TRACES,
						disabled: false,
						expression: 'A',
						filters: {
							items: [
								{
									id: '23450eb8',
									key: {
										dataType: DataTypes.String,
										isColumn: false,
										isJSON: false,
										key: SPAN_ATTRIBUTES.SERVER_NAME,
										type: 'tag',
									},
									op: '=',
									value: domainName,
								},
								{
									id: '212678b9',
									key: {
										key: 'kind_string',
										dataType: DataTypes.String,
										type: '',
										isColumn: true,
										isJSON: false,
									},
									op: '=',
									value: 'Client',
								},
								...filters.items,
							],
							op: 'AND',
						},
						functions: [],
						groupBy: [
							{
								dataType: DataTypes.String,
								isColumn: true,
								isJSON: false,
								key: 'response_status_code',
								type: '',
							},
						],
						having: [],
						legend: 'number of calls',
						limit: null,
						orderBy: [],
						queryName: 'A',
						reduceTo: 'avg',
						spaceAggregation: 'sum',
						stepInterval: 60,
						timeAggregation: 'count',
					},
					{
						aggregateAttribute: {
							dataType: DataTypes.Float64,
							isColumn: true,
							isJSON: false,
							key: 'duration_nano',
							type: '',
						},
						aggregateOperator: 'p99',
						dataSource: DataSource.TRACES,
						disabled: false,
						expression: 'B',
						filters: {
							items: [
								{
									id: '2687dc18',
									key: {
										dataType: DataTypes.String,
										isColumn: false,
										isJSON: false,
										key: SPAN_ATTRIBUTES.SERVER_NAME,
										type: 'tag',
									},
									op: '=',
									value: domainName,
								},
								{
									id: '212678b9',
									key: {
										key: 'kind_string',
										dataType: DataTypes.String,
										type: '',
										isColumn: true,
										isJSON: false,
									},
									op: '=',
									value: 'Client',
								},
								...filters.items,
							],
							op: 'AND',
						},
						functions: [],
						groupBy: [
							{
								dataType: DataTypes.String,
								isColumn: true,
								isJSON: false,
								key: 'response_status_code',
								type: '',
							},
						],
						having: [],
						legend: 'p99 latency',
						limit: null,
						orderBy: [],
						queryName: 'B',
						reduceTo: 'avg',
						spaceAggregation: 'sum',
						stepInterval: 60,
						timeAggregation: 'p99',
					},
					{
						dataSource: DataSource.TRACES,
						queryName: 'C',
						aggregateOperator: 'rate',
						aggregateAttribute: {
							dataType: DataTypes.String,
							id: '------false',
							isColumn: false,
							key: '',
							type: '',
						},
						timeAggregation: 'rate',
						spaceAggregation: 'sum',
						functions: [],
						filters: {
							items: [
								{
									id: '334840be',
									key: {
										dataType: DataTypes.String,
										id: 'net.peer.name--string--tag--false',
										isColumn: false,
										isJSON: false,
										key: 'net.peer.name',
										type: 'tag',
									},
									op: '=',
									value: domainName,
								},
								{
									id: '212678b9',
									key: {
										key: 'kind_string',
										dataType: DataTypes.String,
										type: '',
										isColumn: true,
										isJSON: false,
									},
									op: '=',
									value: 'Client',
								},
								...filters.items,
							],
							op: 'AND',
						},
						expression: 'C',
						disabled: false,
						stepInterval: 60,
						having: [],
						limit: null,
						orderBy: [],
						groupBy: [
							{
								dataType: DataTypes.String,
								isColumn: true,
								isJSON: false,
								key: 'response_status_code',
								type: '',
								id: 'response_status_code--string----true',
							},
						],
						legend: 'rate',
						reduceTo: 'avg',
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
			id: '315b15fa-ff0c-442f-89f8-2bf4fb1af2f2',
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
		step: 60,
	},
	{
		selectedTime: 'GLOBAL_TIME',
		graphType: PANEL_TYPES.TABLE,
		query: {
			builder: {
				queryData: [
					{
						dataSource: DataSource.TRACES,
						queryName: 'A',
						aggregateOperator: 'count',
						aggregateAttribute: {
							dataType: DataTypes.String,
							key: '',
							isColumn: false,
							type: '',
						},
						timeAggregation: 'count',
						spaceAggregation: 'sum',
						functions: [],
						filters: {
							items: [
								{
									id: '3db61dd6',
									key: {
										key: SPAN_ATTRIBUTES.SERVER_NAME,
										dataType: DataTypes.String,
										type: 'tag',
										isColumn: false,
										isJSON: false,
									},
									op: '=',
									value: domainName,
								},
								{
									id: '212678b9',
									key: {
										key: 'kind_string',
										dataType: DataTypes.String,
										type: '',
										isColumn: true,
										isJSON: false,
									},
									op: '=',
									value: 'Client',
								},
								...filters.items,
							],
							op: 'AND',
						},
						expression: 'A',
						disabled: false,
						stepInterval: 60,
						having: [],
						legend: '',
						limit: null,
						orderBy: [],
						groupBy: [
							{
								key: SPAN_ATTRIBUTES.URL_PATH,
								dataType: DataTypes.String,
								type: 'tag',
								isColumn: false,
								isJSON: false,
							},
						],
						reduceTo: 'avg',
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
			id: '315b15fa-ff0c-442f-89f8-2bf4fb1af2f2',
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
		step: 60,
	},
	{
		selectedTime: 'GLOBAL_TIME',
		graphType: PANEL_TYPES.TABLE,
		query: {
			builder: {
				queryData: [
					{
						aggregateAttribute: {
							dataType: DataTypes.String,
							isColumn: true,
							isJSON: false,
							key: 'span_id',
							type: '',
						},
						aggregateOperator: 'count',
						dataSource: DataSource.TRACES,
						disabled: false,
						expression: 'A',
						filters: {
							items: [
								{
									id: 'b78ff216',
									key: {
										dataType: DataTypes.String,
										isColumn: false,
										isJSON: false,
										key: SPAN_ATTRIBUTES.SERVER_NAME,
										type: 'tag',
									},
									op: '=',
									value: domainName,
								},
								{
									id: '212678b9',
									key: {
										key: 'kind_string',
										dataType: DataTypes.String,
										type: '',
										isColumn: true,
										isJSON: false,
									},
									op: '=',
									value: 'Client',
								},
								...filters.items,
							],
							op: 'AND',
						},
						functions: [],
						groupBy: [
							{
								dataType: DataTypes.String,
								id: 'service.name--string--resource--true',
								isColumn: true,
								isJSON: false,
								key: 'service.name',
								type: 'resource',
							},
						],
						having: [],
						legend: 'count',
						limit: null,
						orderBy: [],
						queryName: 'A',
						reduceTo: 'avg',
						spaceAggregation: 'sum',
						stepInterval: 60,
						timeAggregation: 'count',
					},
					{
						aggregateAttribute: {
							dataType: DataTypes.Float64,
							isColumn: true,
							isJSON: false,
							key: 'duration_nano',
							type: '',
						},
						aggregateOperator: 'p99',
						dataSource: DataSource.TRACES,
						disabled: false,
						expression: 'B',
						filters: {
							items: [
								{
									id: 'a9024472',
									key: {
										dataType: DataTypes.String,
										isColumn: false,
										isJSON: false,
										key: SPAN_ATTRIBUTES.SERVER_NAME,
										type: 'tag',
									},
									op: '=',
									value: domainName,
								},
								{
									id: '212678b9',
									key: {
										key: 'kind_string',
										dataType: DataTypes.String,
										type: '',
										isColumn: true,
										isJSON: false,
									},
									op: '=',
									value: 'Client',
								},
								...filters.items,
							],
							op: 'AND',
						},
						functions: [],
						groupBy: [
							{
								dataType: DataTypes.String,
								id: 'service.name--string--resource--true',
								isColumn: true,
								isJSON: false,
								key: 'service.name',
								type: 'resource',
							},
						],
						having: [],
						legend: 'p99 latency',
						limit: null,
						orderBy: [],
						queryName: 'B',
						reduceTo: 'avg',
						spaceAggregation: 'sum',
						stepInterval: 60,
						timeAggregation: 'p99',
					},
					{
						aggregateAttribute: {
							dataType: DataTypes.String,
							id: '------false',
							isColumn: false,
							key: '',
							type: '',
						},
						aggregateOperator: 'rate',
						dataSource: DataSource.TRACES,
						disabled: false,
						expression: 'C',
						filters: {
							items: [
								{
									id: '1b6c062d',
									key: {
										dataType: DataTypes.String,
										isColumn: false,
										isJSON: false,
										key: SPAN_ATTRIBUTES.SERVER_NAME,
										type: 'tag',
									},
									op: '=',
									value: domainName,
								},
								{
									id: '212678b9',
									key: {
										key: 'kind_string',
										dataType: DataTypes.String,
										type: '',
										isColumn: true,
										isJSON: false,
									},
									op: '=',
									value: 'Client',
								},
								...filters.items,
							],
							op: 'AND',
						},
						functions: [],
						groupBy: [
							{
								dataType: DataTypes.String,
								id: 'service.name--string--resource--true',
								isColumn: true,
								isJSON: false,
								key: 'service.name',
								type: 'resource',
							},
						],
						having: [],
						legend: 'request per second',
						limit: null,
						orderBy: [],
						queryName: 'C',
						reduceTo: 'avg',
						spaceAggregation: 'sum',
						stepInterval: 60,
						timeAggregation: 'rate',
					},
					{
						aggregateAttribute: {
							dataType: DataTypes.String,
							isColumn: true,
							isJSON: false,
							key: 'span_id',
							type: '',
						},
						aggregateOperator: 'count',
						dataSource: DataSource.TRACES,
						disabled: true,
						expression: 'D',
						filters: {
							items: [
								{
									id: 'd14792a8',
									key: {
										dataType: DataTypes.String,
										isColumn: false,
										isJSON: false,
										key: SPAN_ATTRIBUTES.SERVER_NAME,
										type: 'tag',
									},
									op: '=',
									value: domainName,
								},
								{
									id: '3212bf1a',
									key: {
										dataType: DataTypes.bool,
										isColumn: true,
										isJSON: false,
										key: 'has_error',
										type: '',
									},
									op: '=',
									value: 'true',
								},
								{
									id: '212678b9',
									key: {
										key: 'kind_string',
										dataType: DataTypes.String,
										type: '',
										isColumn: true,
										isJSON: false,
									},
									op: '=',
									value: 'Client',
								},
								...filters.items,
							],
							op: 'AND',
						},
						functions: [],
						groupBy: [
							{
								dataType: DataTypes.String,
								id: 'service.name--string--resource--true',
								isColumn: true,
								isJSON: false,
								key: 'service.name',
								type: 'resource',
							},
						],
						having: [],
						legend: 'count',
						limit: null,
						orderBy: [],
						queryName: 'D',
						reduceTo: 'avg',
						spaceAggregation: 'sum',
						stepInterval: 60,
						timeAggregation: 'count',
					},
				],
				queryFormulas: [
					{
						queryName: 'F1',
						expression: '(D/A)*100',
						disabled: false,
						legend: 'error percentage',
					},
				],
			},
			clickhouse_sql: [
				{
					disabled: false,
					legend: '',
					name: 'A',
					query: '',
				},
			],
			id: '315b15fa-ff0c-442f-89f8-2bf4fb1af2f2',
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
		step: 60,
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
							id: '------false',
							isColumn: false,
							key: '',
							type: '',
						},
						aggregateOperator: 'count',
						dataSource: DataSource.TRACES,
						disabled: false,
						expression: 'A',
						filters: {
							items: [
								{
									id: 'c6724407',
									key: {
										dataType: DataTypes.String,
										isColumn: false,
										isJSON: false,
										key: SPAN_ATTRIBUTES.SERVER_NAME,
										type: 'tag',
									},
									op: '=',
									value: domainName,
								},
								{
									id: '212678b9',
									key: {
										key: 'kind_string',
										dataType: DataTypes.String,
										type: '',
										isColumn: true,
										isJSON: false,
									},
									op: '=',
									value: 'Client',
								},
								...filters.items,
							],
							op: 'AND',
						},
						functions: [],
						groupBy: [
							{
								dataType: DataTypes.String,
								isColumn: true,
								isJSON: false,
								key: 'response_status_code',
								type: '',
							},
						],
						having: [],
						legend: '',
						limit: null,
						orderBy: [],
						queryName: 'A',
						reduceTo: 'avg',
						spaceAggregation: 'sum',
						stepInterval: 60,
						timeAggregation: 'rate',
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
			id: '315b15fa-ff0c-442f-89f8-2bf4fb1af2f2',
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
		step: 60,
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
							isColumn: true,
							isJSON: false,
							key: 'duration_nano',
							type: '',
						},
						aggregateOperator: 'p99',
						dataSource: DataSource.TRACES,
						disabled: false,
						expression: 'A',
						filters: {
							items: [
								{
									id: 'aae93366',
									key: {
										dataType: DataTypes.String,
										isColumn: false,
										isJSON: false,
										key: SPAN_ATTRIBUTES.SERVER_NAME,
										type: 'tag',
									},
									op: '=',
									value: domainName,
								},
								{
									id: '212678b9',
									key: {
										key: 'kind_string',
										dataType: DataTypes.String,
										type: '',
										isColumn: true,
										isJSON: false,
									},
									op: '=',
									value: 'Client',
								},
								...filters.items,
							],
							op: 'AND',
						},
						functions: [],
						groupBy: [
							{
								dataType: DataTypes.String,
								isColumn: true,
								isJSON: false,
								key: 'response_status_code',
								type: '',
							},
						],
						having: [],
						legend: '',
						limit: null,
						orderBy: [],
						queryName: 'A',
						reduceTo: 'avg',
						spaceAggregation: 'sum',
						stepInterval: 60,
						timeAggregation: 'p99',
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
			id: '315b15fa-ff0c-442f-89f8-2bf4fb1af2f2',
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
		step: 60,
	},
];

export const getEndPointZeroStateQueryPayload = (
	domainName: string,
	start: number,
	end: number,
): GetQueryResultsProps[] => [
	{
		selectedTime: 'GLOBAL_TIME',
		graphType: PANEL_TYPES.TABLE,
		query: {
			builder: {
				queryData: [
					{
						dataSource: DataSource.TRACES,
						queryName: 'A',
						aggregateOperator: 'count',
						aggregateAttribute: {
							dataType: DataTypes.String,
							key: '',
							isColumn: false,
							type: '',
						},
						timeAggregation: 'count',
						spaceAggregation: 'sum',
						functions: [],
						filters: {
							items: [
								{
									id: '3db61dd6',
									key: {
										key: SPAN_ATTRIBUTES.SERVER_NAME,
										dataType: DataTypes.String,
										type: 'tag',
										isColumn: false,
										isJSON: false,
									},
									op: '=',
									value: domainName,
								},
								{
									id: '212678b9',
									key: {
										key: 'kind_string',
										dataType: DataTypes.String,
										type: '',
										isColumn: true,
										isJSON: false,
									},
									op: '=',
									value: 'Client',
								},
							],
							op: 'AND',
						},
						expression: 'A',
						disabled: false,
						stepInterval: 60,
						having: [],
						legend: '',
						limit: null,
						orderBy: [],
						groupBy: [
							{
								key: SPAN_ATTRIBUTES.URL_PATH,
								dataType: DataTypes.String,
								type: 'tag',
								isColumn: false,
								isJSON: false,
							},
						],
						reduceTo: 'avg',
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
			id: '315b15fa-ff0c-442f-89f8-2bf4fb1af2f2',
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
		step: 60,
	},
];

interface EndPointMetricsResponseRow {
	data: {
		A: number | string;
		B: number | string;
		C: number | string;
		D: number | string;
		F1: number | string;
	};
}

interface EndPointStatusCodeResponseRow {
	data: {
		response_status_code: string;
		A: number | string;
		B: number | string;
		C: number | string;
	};
}

interface EndPointMetricsData {
	key: string;
	rate: number | string;
	latency: number | string;
	errorRate: number | string;
	lastUsed: string;
}

interface EndPointStatusCodeData {
	key: string;
	statusCode: string;
	count: number | string;
	rate: number | string;
	p99Latency: number | string;
}

export const getFormattedEndPointMetricsData = (
	data: EndPointMetricsResponseRow[],
): EndPointMetricsData => {
	if (!data || data.length === 0) {
		return {
			key: v4(),
			rate: '-',
			latency: '-',
			errorRate: 0,
			lastUsed: '-',
		};
	}

	return {
		key: v4(),
		rate: data[0].data.A === 'n/a' || !data[0].data.A ? '-' : data[0].data.A,
		latency:
			data[0].data.B === 'n/a' || data[0].data.B === undefined
				? '-'
				: Math.round(Number(data[0].data.B) / 1000000),
		errorRate:
			data[0].data.F1 === 'n/a' || !data[0].data.F1 ? 0 : Number(data[0].data.F1),
		lastUsed:
			data[0].data.D === 'n/a' || !data[0].data.D
				? '-'
				: getLastUsedRelativeTime(Math.floor(Number(data[0].data.D) / 1000000)),
	};
};

export const getFormattedEndPointStatusCodeData = (
	data: EndPointStatusCodeResponseRow[],
): EndPointStatusCodeData[] => {
	if (!data) return [];
	return data.map((row) => ({
		key: v4(),
		statusCode:
			row.data.response_status_code === 'n/a' ||
			row.data.response_status_code === undefined
				? '-'
				: row.data.response_status_code,
		count: row.data.A === 'n/a' || row.data.A === undefined ? '-' : row.data.A,
		rate: row.data.C === 'n/a' || row.data.C === undefined ? '-' : row.data.C,
		p99Latency:
			row.data.B === 'n/a' || row.data.B === undefined
				? '-'
				: Math.round(Number(row.data.B) / 1000000), // Convert from nanoseconds to milliseconds,
	}));
};

export const endPointStatusCodeColumns: ColumnType<EndPointStatusCodeData>[] = [
	{
		title: <div className="status-code-header">STATUS CODE</div>,
		dataIndex: 'statusCode',
		key: 'statusCode',
		render: (text): JSX.Element => (
			<div className="status-code-value">{text}</div>
		),
		sorter: (a: EndPointStatusCodeData, b: EndPointStatusCodeData): number => {
			const statusCodeA =
				a.statusCode === '-' || a.statusCode === 'n/a' ? 0 : Number(a.statusCode);
			const statusCodeB =
				b.statusCode === '-' || b.statusCode === 'n/a' ? 0 : Number(b.statusCode);
			return statusCodeA - statusCodeB;
		},
	},
	{
		title: (
			<div className="column-header">
				NUMBER OF CALLS <ArrowUpDown size={14} />
			</div>
		),
		dataIndex: 'count',
		key: 'count',
		align: 'right',
		sorter: (a: EndPointStatusCodeData, b: EndPointStatusCodeData): number => {
			const countA = a.count === '-' || a.count === 'n/a' ? 0 : Number(a.count);
			const countB = b.count === '-' || b.count === 'n/a' ? 0 : Number(b.count);
			return countA - countB;
		},
	},
	{
		title: 'RATE',
		dataIndex: 'rate',
		key: 'rate',
		align: 'right',
		render: (rate: number | string): ReactNode => (
			<span>{rate !== '-' && rate !== 'n/a' ? `${rate}ops/sec` : '-'}</span>
		),
		sorter: (a: EndPointStatusCodeData, b: EndPointStatusCodeData): number => {
			const rateA = a.rate === '-' || a.rate === 'n/a' ? 0 : Number(a.rate);
			const rateB = b.rate === '-' || b.rate === 'n/a' ? 0 : Number(b.rate);
			return rateA - rateB;
		},
	},
	{
		title: 'P99 Latency',
		dataIndex: 'p99Latency',
		key: 'p99Latency',
		align: 'right',
		sorter: (a: EndPointStatusCodeData, b: EndPointStatusCodeData): number => {
			const p99LatencyA =
				a.p99Latency === '-' || a.p99Latency === 'n/a' ? 0 : Number(a.p99Latency);
			const p99LatencyB =
				b.p99Latency === '-' || b.p99Latency === 'n/a' ? 0 : Number(b.p99Latency);
			return p99LatencyA - p99LatencyB;
		},
		render: (latency: number): ReactNode => <span>{latency || '-'}ms</span>,
	},
];

export const statusCodeWidgetInfo = [
	{ yAxisUnit: 'calls' },
	{ yAxisUnit: 'ns' },
];

interface EndPointDropDownResponseRow {
	data: {
		[SPAN_ATTRIBUTES.URL_PATH]: string;
		A: number;
	};
}

interface EndPointDropDownData {
	key: string;
	label: string;
	value: string;
}

export const getFormattedEndPointDropDownData = (
	data: EndPointDropDownResponseRow[],
): EndPointDropDownData[] => {
	if (!data) return [];
	return data.map((row) => ({
		key: v4(),
		label: row.data[SPAN_ATTRIBUTES.URL_PATH] || '-',
		value: row.data[SPAN_ATTRIBUTES.URL_PATH] || '-',
	}));
};

interface DependentServicesResponseRow {
	data: {
		['service.name']: string;
		A: number | string;
		B: number | string;
		C: number | string;
		F1: number | string;
	};
}

export interface ServiceData {
	serviceName: string;
	count: number | string;
	percentage: number | string;
}

export interface DependentServicesData {
	key: string;
	serviceData: ServiceData;
	latency: number | string;
	rate: number | string;
	errorPercentage: number | string;
}

// Discuss once about type safety of this function
export const getFormattedDependentServicesData = (
	data: DependentServicesResponseRow[],
	// eslint-disable-next-line sonarjs/cognitive-complexity
): DependentServicesData[] => {
	if (!data) return [];
	const totalCount = data?.reduce((acc, row) => acc + Number(row.data.A), 0);
	return data?.map((row) => ({
		key: v4(),
		serviceData: {
			serviceName: row.data['service.name'] || '-',
			count:
				row.data.A !== undefined && row.data.A !== 'n/a' ? Number(row.data.A) : '-',
			percentage:
				totalCount > 0 && row.data.A !== undefined && row.data.A !== 'n/a'
					? Number(((Number(row.data.A) / totalCount) * 100).toFixed(2))
					: 0,
		},
		latency:
			row.data.B !== undefined && row.data.B !== 'n/a'
				? Math.round(Number(row.data.B) / 1000000)
				: '-',
		rate: row.data.C !== undefined && row.data.C !== 'n/a' ? row.data.C : '-',
		errorPercentage:
			row.data.F1 !== undefined && row.data.F1 !== 'n/a' ? row.data.F1 : 0,
	}));
};

export const dependentServicesColumns: ColumnType<DependentServicesData>[] = [
	{
		title: <span className="title-wrapper col-title">Dependent Services</span>,
		dataIndex: 'serviceData',
		key: 'serviceData',
		render: (serviceData: ServiceData): ReactNode => (
			<div className="top-services-item">
				<div className="top-services-item-progress">
					<div className="top-services-item-key">{serviceData.serviceName}</div>
					<div className="top-services-item-count">{serviceData.count} Calls</div>
					<div
						className="top-services-item-progress-bar"
						style={{ width: `${serviceData.percentage}%` }}
					/>
				</div>
				<div className="top-services-item-percentage">
					{typeof serviceData.percentage === 'number'
						? serviceData.percentage.toFixed(2)
						: serviceData.percentage}
					%
				</div>
			</div>
		),
		sorter: (a: DependentServicesData, b: DependentServicesData): number => {
			const countA =
				a.serviceData.count === '-' || a.serviceData.count === 'n/a'
					? 0
					: Number(a.serviceData.count);
			const countB =
				b.serviceData.count === '-' || b.serviceData.count === 'n/a'
					? 0
					: Number(b.serviceData.count);
			return countA - countB;
		},
	},
	{
		title: (
			<span className="top-services-item-latency-title col-title">
				AVG. LATENCY
			</span>
		),
		dataIndex: 'latency',
		key: 'latency',
		render: (latency: number): ReactNode => (
			<div className="top-services-item-latency">{latency || '-'}ms</div>
		),
		sorter: (a: DependentServicesData, b: DependentServicesData): number => {
			const latencyA =
				a.latency === '-' || a.latency === 'n/a' ? 0 : Number(a.latency);
			const latencyB =
				b.latency === '-' || b.latency === 'n/a' ? 0 : Number(b.latency);
			return latencyA - latencyB;
		},
	},
	{
		title: (
			<span className="top-services-item-error-percentage-title col-title">
				ERROR %
			</span>
		),
		dataIndex: 'errorPercentage',
		key: 'errorPercentage',
		align: 'center',
		render: (
			errorPercentage: number | string,
			// eslint-disable-next-line sonarjs/no-identical-functions
		): React.ReactNode => {
			const errorPercentageValue =
				errorPercentage === 'n/a' || errorPercentage === '-' ? 0 : errorPercentage;
			return (
				<Progress
					status="active"
					percent={Number((errorPercentageValue as number).toFixed(2))}
					strokeLinecap="butt"
					size="small"
					strokeColor={((): // eslint-disable-next-line sonarjs/no-identical-functions
					string => {
						const errorPercentagePercent = Number(
							(errorPercentageValue as number).toFixed(2),
						);
						if (errorPercentagePercent >= 90) return Color.BG_SAKURA_500;
						if (errorPercentagePercent >= 60) return Color.BG_AMBER_500;
						return Color.BG_FOREST_500;
					})()}
					className="progress-bar error-rate"
				/>
			);
		},
		sorter: (a: DependentServicesData, b: DependentServicesData): number => {
			const errorPercentageA =
				a.errorPercentage === '-' || a.errorPercentage === 'n/a'
					? 0
					: Number(a.errorPercentage);
			const errorPercentageB =
				b.errorPercentage === '-' || b.errorPercentage === 'n/a'
					? 0
					: Number(b.errorPercentage);
			return errorPercentageA - errorPercentageB;
		},
	},
	{
		title: (
			<span className="top-services-item-rate-title col-title">AVG. RATE</span>
		),
		dataIndex: 'rate',
		key: 'rate',
		align: 'right',
		render: (rate: number): ReactNode => (
			<div className="top-services-item-rate">{rate || '-'} ops/sec</div>
		),
		// eslint-disable-next-line sonarjs/no-identical-functions
		sorter: (a: DependentServicesData, b: DependentServicesData): number => {
			const rateA = a.rate === '-' || a.rate === 'n/a' ? 0 : Number(a.rate);
			const rateB = b.rate === '-' || b.rate === 'n/a' ? 0 : Number(b.rate);
			return rateA - rateB;
		},
	},
];

export const getFormattedChartData = (
	data: MetricRangePayloadProps,
	newLegendArray: string[],
): MetricRangePayloadProps => {
	const result = cloneDeep(data);
	if (result?.data?.result) {
		result.data.result = result?.data?.result?.map((series, index) => ({
			...series,
			legend: newLegendArray[index],
		}));
	}

	return result;
};

const getStatusCodeClass = (statusCode: string): string => {
	const code = parseInt(statusCode, 10);

	if (Number.isNaN(code)) {
		return 'Other';
	}

	if (code >= 200 && code < 300) {
		return '200-299';
	}

	if (code >= 300 && code < 400) {
		return '300-399';
	}

	if (code >= 400 && code < 500) {
		return '400-499';
	}

	if (code >= 500 && code < 600) {
		return '500-599';
	}

	return 'Other';
};

export const groupStatusCodes = (
	seriesList: QueryData[],
	aggregationType: 'sum' | 'average' = 'sum',
	// eslint-disable-next-line sonarjs/cognitive-complexity
): QueryData[] => {
	if (!seriesList?.length) {
		return seriesList;
	}

	const result = cloneDeep(seriesList);

	// Group series by status code class
	const groupedSeries: Record<string, QueryData> = {};

	// Initialize timestamp map to track all timestamps across all series
	const allTimestamps = new Set<number>();

	// First pass: collect all series and timestamps
	result.forEach((series) => {
		const statusCode = series.metric?.response_status_code;
		if (!statusCode) return;

		const statusClass = getStatusCodeClass(statusCode);

		// Track all timestamps
		series.values.forEach((value) => {
			allTimestamps.add(Number(value[0]));
		});

		// Initialize or update the grouped series
		if (!groupedSeries[statusClass]) {
			groupedSeries[statusClass] = {
				metric: {
					response_status_code: statusClass,
				},
				values: [],
				queryName: series.queryName,
				legend: series.legend || statusClass,
			};
		}
	});

	// Create a sorted array of all timestamps
	const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);
	// Initialize values and counters for each timestamp with zeros for each group
	const timestampValues: Record<string, Record<number, number>> = {};
	const timestampCounts: Record<string, Record<number, number>> = {};

	Object.keys(groupedSeries).forEach((group) => {
		timestampValues[group] = {};
		timestampCounts[group] = {};
		sortedTimestamps.forEach((timestamp) => {
			timestampValues[group][timestamp] = 0;
			timestampCounts[group][timestamp] = 0;
		});
	});

	// Second pass: aggregate values by status class and timestamp
	result.forEach((series) => {
		const statusCode = series.metric?.response_status_code;
		if (!statusCode) return;

		const statusClass = getStatusCodeClass(statusCode);

		series.values.forEach((value) => {
			const timestamp = value[0];
			const numValue = parseFloat(value[1]);
			if (!Number.isNaN(numValue)) {
				timestampValues[statusClass][timestamp] += numValue;
				timestampCounts[statusClass][timestamp] += 1;
			}
		});
	});

	// Convert aggregated values back to series format
	Object.keys(groupedSeries).forEach((group) => {
		groupedSeries[group].values = sortedTimestamps.map((timestamp) => {
			let finalValue: number;

			if (aggregationType === 'average' && timestampCounts[group][timestamp] > 0) {
				// Calculate average if aggregationType is average
				finalValue =
					timestampValues[group][timestamp] / timestampCounts[group][timestamp];
			} else {
				// Otherwise, use the sum
				finalValue = timestampValues[group][timestamp];
			}

			return [timestamp, finalValue.toString()];
		});
	});
	// Define the order of status code ranges
	const statusCodeOrder = ['200-299', '300-399', '400-499', '500-599', 'Other'];

	// Return the grouped series in the specified order
	return statusCodeOrder
		.filter((code) => groupedSeries[code]) // Only include codes that exist in the data
		.map((code) => groupedSeries[code]);
};

export const getStatusCodeBarChartWidgetData = (
	domainName: string,
	endPointName: string,
	filters: IBuilderQuery['filters'],
): Widgets => ({
	query: {
		builder: {
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.String,
						id: '------false',
						isColumn: false,
						key: '',
						type: '',
					},
					aggregateOperator: 'count',
					dataSource: DataSource.TRACES,
					disabled: false,
					expression: 'A',
					filters: {
						items: [
							{
								id: 'c6724407',
								key: {
									dataType: DataTypes.String,
									isColumn: false,
									isJSON: false,
									key: SPAN_ATTRIBUTES.SERVER_NAME,
									type: 'tag',
								},
								op: '=',
								value: domainName,
							},
							...(endPointName
								? [
										{
											id: '8b1be6f0',
											key: {
												dataType: DataTypes.String,
												isColumn: false,
												isJSON: false,
												key: SPAN_ATTRIBUTES.URL_PATH,
												type: 'tag',
											},
											op: '=',
											value: endPointName,
										},
								  ]
								: []),
							...filters.items,
						],
						op: 'AND',
					},
					functions: [],
					groupBy: [],
					having: [],
					legend: '',
					limit: null,
					orderBy: [],
					queryName: 'A',
					reduceTo: 'avg',
					spaceAggregation: 'sum',
					stepInterval: 60,
					timeAggregation: 'rate',
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
		id: '315b15fa-ff0c-442f-89f8-2bf4fb1af2f2',
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
	description: '',
	id: '315b15fa-ff0c-442f-89f8-2bf4fb1af2f2',
	isStacked: false,
	panelTypes: PANEL_TYPES.BAR,
	title: '',
	opacity: '',
	nullZeroValues: '',
	timePreferance: 'GLOBAL_TIME',
	softMin: null,
	softMax: null,
	selectedLogFields: null,
	selectedTracesFields: null,
});
interface EndPointStatusCodePayloadData {
	data: {
		result: QueryData[];
		newResult: any;
		resultType: string;
	};
}

export const getFormattedEndPointStatusCodeChartData = (
	data: EndPointStatusCodePayloadData,
	aggregationType: 'sum' | 'average' = 'sum',
): EndPointStatusCodePayloadData => {
	if (!data) {
		return {
			data: {
				result: [],
				newResult: [],
				resultType: 'matrix',
			},
		};
	}
	return {
		data: {
			result: groupStatusCodes(data?.data?.result, aggregationType),
			newResult: data?.data?.newResult,
			resultType: data?.data?.resultType,
		},
	};
};

export const END_POINT_DETAILS_QUERY_KEYS_ARRAY = [
	REACT_QUERY_KEY.GET_ENDPOINT_METRICS_DATA,
	REACT_QUERY_KEY.GET_ENDPOINT_STATUS_CODE_DATA,
	REACT_QUERY_KEY.GET_ENDPOINT_RATE_OVER_TIME_DATA,
	REACT_QUERY_KEY.GET_ENDPOINT_LATENCY_OVER_TIME_DATA,
	REACT_QUERY_KEY.GET_ENDPOINT_DROPDOWN_DATA,
	REACT_QUERY_KEY.GET_ENDPOINT_DEPENDENT_SERVICES_DATA,
	REACT_QUERY_KEY.GET_ENDPOINT_STATUS_CODE_BAR_CHARTS_DATA,
	REACT_QUERY_KEY.GET_ENDPOINT_STATUS_CODE_LATENCY_BAR_CHARTS_DATA,
];

export const getAllEndpointsWidgetData = (
	groupBy: BaseAutocompleteData[],
	domainName: string,
	filters: IBuilderQuery['filters'],
	// eslint-disable-next-line sonarjs/cognitive-complexity
): Widgets => {
	const isGroupedByAttribute = groupBy.length > 0;

	const widget = getWidgetQueryBuilder(
		getWidgetQuery({
			title: 'Endpoint Overview',
			description: 'Endpoint Overview',
			panelTypes: PANEL_TYPES.TABLE,
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.String,
						isColumn: true,
						isJSON: false,
						key: 'span_id',
						type: '',
					},
					aggregateOperator: 'count',
					dataSource: DataSource.TRACES,
					disabled: false,
					expression: 'A',
					filters: {
						items: [
							{
								id: 'ec316e57',
								key: {
									dataType: DataTypes.String,
									isColumn: false,
									isJSON: false,
									key: SPAN_ATTRIBUTES.SERVER_NAME,
									type: 'tag',
								},
								op: '=',
								value: domainName,
							},
							{
								id: '212678b9',
								key: {
									key: 'kind_string',
									dataType: DataTypes.String,
									type: '',
									isColumn: true,
									isJSON: false,
								},
								op: '=',
								value: 'Client',
							},
							...filters.items,
						],
						op: 'AND',
					},
					functions: [],
					groupBy: isGroupedByAttribute
						? [...defaultGroupBy, ...groupBy]
						: defaultGroupBy,
					having: [],
					legend: 'Num of Calls',
					limit: 1000,
					orderBy: [],
					queryName: 'A',
					reduceTo: 'avg',
					spaceAggregation: 'sum',
					stepInterval: 60,
					timeAggregation: 'count',
				},
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						isColumn: true,
						isJSON: false,
						key: 'duration_nano',
						type: '',
					},
					aggregateOperator: 'p99',
					dataSource: DataSource.TRACES,
					disabled: false,
					expression: 'B',
					filters: {
						items: [
							{
								id: '46d57857',
								key: {
									dataType: DataTypes.String,
									isColumn: false,
									isJSON: false,
									key: SPAN_ATTRIBUTES.SERVER_NAME,
									type: 'tag',
								},
								op: '=',
								value: domainName,
							},
							{
								id: '212678b9',
								key: {
									key: 'kind_string',
									dataType: DataTypes.String,
									type: '',
									isColumn: true,
									isJSON: false,
								},
								op: '=',
								value: 'Client',
							},
							...filters.items,
						],
						op: 'AND',
					},
					functions: [],
					groupBy: isGroupedByAttribute
						? [...defaultGroupBy, ...groupBy]
						: defaultGroupBy,
					having: [],
					legend: 'Latency (ms)',
					limit: 1000,
					orderBy: [],
					queryName: 'B',
					reduceTo: 'avg',
					spaceAggregation: 'sum',
					stepInterval: 60,
					timeAggregation: 'p99',
				},
				{
					aggregateAttribute: {
						dataType: DataTypes.String,
						id: 'timestamp------false',
						isColumn: false,
						key: 'timestamp',
						type: '',
					},
					aggregateOperator: 'max',
					dataSource: DataSource.TRACES,
					disabled: false,
					expression: 'C',
					filters: {
						items: [
							{
								id: '4a237616',
								key: {
									dataType: DataTypes.String,
									isColumn: false,
									isJSON: false,
									key: SPAN_ATTRIBUTES.SERVER_NAME,
									type: 'tag',
								},
								op: '=',
								value: domainName,
							},
							{
								id: '212678b9',
								key: {
									key: 'kind_string',
									dataType: DataTypes.String,
									type: '',
									isColumn: true,
									isJSON: false,
								},
								op: '=',
								value: 'Client',
							},
							...filters.items,
						],
						op: 'AND',
					},
					functions: [],
					groupBy: isGroupedByAttribute
						? [...defaultGroupBy, ...groupBy]
						: defaultGroupBy,
					having: [],
					legend: 'Last Used',
					limit: 1000,
					orderBy: [],
					queryName: 'C',
					reduceTo: 'avg',
					spaceAggregation: 'sum',
					stepInterval: 60,
					timeAggregation: 'max',
				},
				{
					aggregateAttribute: {
						dataType: DataTypes.String,
						isColumn: true,
						isJSON: false,
						key: 'span_id',
						type: '',
					},
					aggregateOperator: 'count',
					dataSource: DataSource.TRACES,
					disabled: true,
					expression: 'D',
					filters: {
						items: [
							{
								id: 'f162de1e',
								key: {
									dataType: DataTypes.String,
									isColumn: false,
									isJSON: false,
									key: SPAN_ATTRIBUTES.SERVER_NAME,
									type: 'tag',
								},
								op: '=',
								value: domainName,
							},
							{
								id: '3df0ac1d',
								key: {
									dataType: DataTypes.bool,
									isColumn: true,
									isJSON: false,
									key: 'has_error',
									type: '',
								},
								op: '=',
								value: 'true',
							},
							{
								id: '212678b9',
								key: {
									key: 'kind_string',
									dataType: DataTypes.String,
									type: '',
									isColumn: true,
									isJSON: false,
								},
								op: '=',
								value: 'Client',
							},
							...filters.items,
						],
						op: 'AND',
					},
					functions: [],
					groupBy: isGroupedByAttribute
						? [...defaultGroupBy, ...groupBy]
						: defaultGroupBy,
					having: [],
					legend: '',
					limit: 1000,
					orderBy: [],
					queryName: 'D',
					reduceTo: 'avg',
					spaceAggregation: 'sum',
					stepInterval: 60,
					timeAggregation: 'count',
				},
			],
			queryFormulas: [
				{
					queryName: 'F1',
					expression: '(D/A)*100',
					disabled: false,
					legend: 'error percentage',
				},
			],
			yAxisUnit: 'ops/s',
		}),
	);

	widget.renderColumnCell = {
		[SPAN_ATTRIBUTES.URL_PATH]: (url: any): ReactNode => {
			const { endpoint } = extractPortAndEndpoint(url);
			return (
				<span>{endpoint === 'n/a' || url === undefined ? '-' : endpoint}</span>
			);
		},
		A: (numOfCalls: any): ReactNode => (
			<span>
				{numOfCalls === 'n/a' || numOfCalls === undefined ? '-' : numOfCalls}
			</span>
		),
		B: (latency: any): ReactNode => (
			<span>
				{latency === 'n/a' || latency === undefined
					? '-'
					: `${Math.round(Number(latency) / 1000000)} ms`}
			</span>
		),
		C: (lastUsed: any): ReactNode => (
			<span>
				{lastUsed === 'n/a' || lastUsed === undefined
					? '-'
					: getLastUsedRelativeTime(
							new Date(
								new Date(Math.floor(Number(lastUsed) / 1000000)).toISOString(),
							).getTime(),
					  )}
			</span>
		),
		F1: (errorRate: any): ReactNode => (
			<Progress
				status="active"
				percent={Number(
					((errorRate === 'n/a' || errorRate === '-'
						? 0
						: errorRate) as number).toFixed(2),
				)}
				strokeLinecap="butt"
				size="small"
				strokeColor={((): // eslint-disable-next-line sonarjs/no-identical-functions
				string => {
					const errorRatePercent = Number(
						((errorRate === 'n/a' || errorRate === '-'
							? 0
							: errorRate) as number).toFixed(2),
					);
					if (errorRatePercent >= 90) return Color.BG_SAKURA_500;
					if (errorRatePercent >= 60) return Color.BG_AMBER_500;
					return Color.BG_FOREST_500;
				})()}
				className="progress-bar error-rate"
			/>
		),
	};

	widget.customColTitles = {
		[SPAN_ATTRIBUTES.URL_PATH]: 'Endpoint',
		'net.peer.port': 'Port',
	};

	widget.title = (
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: '10px',
				padding: '12px',
				color: 'var(--Vanilla-100, #fff)',
				fontFamily: 'Inter',
				fontSize: '14px',
				fontStyle: 'normal',
				fontWeight: 400,
				lineHeight: '18px',
			}}
		>
			Endpoint Overview
			<Tooltip title="Click on any row to get corresponding endpoint stats">
				<Info size={16} color="white" />
			</Tooltip>
		</div>
	);

	return widget;
};

const keysToRemove = ['http.url', 'A', 'B', 'C', 'F1'];

export const getGroupByFiltersFromGroupByValues = (
	rowData: any,
	groupBy: BaseAutocompleteData[],
): IBuilderQuery['filters'] => {
	const items = Object.keys(rowData)
		.filter((key) => !keysToRemove.includes(key))
		.map((key) => {
			const groupByAttribute = groupBy.find((gb) => gb.key === key);
			return {
				id: groupByAttribute?.id || v4(),
				key: {
					dataType: groupByAttribute?.dataType || DataTypes.String,
					isColumn: groupByAttribute?.isColumn || true,
					isJSON: groupByAttribute?.isJSON || false,
					key: groupByAttribute?.key || key,
					type: groupByAttribute?.type || '',
				},
				op: '=', // operator for every attribute -> discuss
				value: rowData[key],
			};
		});

	return {
		items,
		op: 'AND',
	};
};

export const getRateOverTimeWidgetData = (
	domainName: string,
	endPointName: string,
	filters: IBuilderQuery['filters'],
): Widgets => {
	let legend = domainName;
	if (endPointName) {
		const { endpoint } = extractPortAndEndpoint(endPointName);
		// eslint-disable-next-line sonarjs/no-nested-template-literals
		legend = `${endpoint}`;
	}

	return getWidgetQueryBuilder(
		getWidgetQuery({
			title: 'Rate Over Time',
			description: 'Rate over time.',
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.String,
						id: '------false',
						isColumn: false,
						key: '',
						type: '',
					},
					aggregateOperator: 'rate',
					dataSource: DataSource.TRACES,
					disabled: false,
					expression: 'A',
					filters: {
						items: [
							{
								id: '3c76fe0b',
								key: {
									dataType: DataTypes.String,
									isColumn: false,
									isJSON: false,
									key: SPAN_ATTRIBUTES.SERVER_NAME,
									type: 'tag',
								},
								op: '=',
								value: domainName,
							},
							...filters.items,
						],
						op: 'AND',
					},
					functions: [],
					groupBy: [],
					having: [],
					legend,
					limit: null,
					orderBy: [],
					queryName: 'A',
					reduceTo: 'avg',
					spaceAggregation: 'sum',
					stepInterval: 60,
					timeAggregation: 'rate',
				},
			],
			yAxisUnit: 'ops/s',
		}),
	);
};

export const getLatencyOverTimeWidgetData = (
	domainName: string,
	endPointName: string,
	filters: IBuilderQuery['filters'],
): Widgets => {
	let legend = domainName;
	if (endPointName) {
		const { endpoint } = extractPortAndEndpoint(endPointName);
		// eslint-disable-next-line sonarjs/no-nested-template-literals
		legend = `${endpoint}`;
	}

	return getWidgetQueryBuilder(
		getWidgetQuery({
			title: 'Latency Over Time',
			description: 'Latency over time.',
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						isColumn: true,
						isJSON: false,
						key: 'duration_nano',
						type: '',
					},
					aggregateOperator: 'p99',
					dataSource: DataSource.TRACES,
					disabled: false,
					expression: 'A',
					filters: {
						items: [
							{
								id: '63adb3ff',
								key: {
									dataType: DataTypes.String,
									isColumn: false,
									isJSON: false,
									key: SPAN_ATTRIBUTES.SERVER_NAME,
									type: 'tag',
								},
								op: '=',
								value: domainName,
							},
							...filters.items,
						],
						op: 'AND',
					},
					functions: [],
					groupBy: [],
					having: [],
					legend,
					limit: null,
					orderBy: [],
					queryName: 'A',
					reduceTo: 'avg',
					spaceAggregation: 'sum',
					stepInterval: 60,
					timeAggregation: 'p99',
				},
			],
			yAxisUnit: 'ns',
		}),
	);
};

/**
 * Helper function to get the start and end status codes from a status code range string
 * @param value Status code range string (e.g. '200-299') or boolean
 * @returns Tuple of [startStatusCode, endStatusCode] as strings
 */
const getStartAndEndStatusCode = (
	value: string | boolean,
): [string, string] => {
	if (!value) {
		return ['', ''];
	}

	switch (value) {
		case '100-199':
			return ['100', '199'];
		case '200-299':
			return ['200', '299'];
		case '300-399':
			return ['300', '399'];
		case '400-499':
			return ['400', '499'];
		case '500-599':
			return ['500', '599'];
		default:
			return ['', ''];
	}
};

/**
 * Creates filter items for bar chart based on group by fields and request data
 * Used specifically for filtering status code ranges in bar charts
 * @param groupBy Array of group by fields to create filters for
 * @param requestData Data from graph click containing values to filter on
 * @returns Array of TagFilterItems with >= and < operators for status code ranges
 */
export const createGroupByFiltersForBarChart = (
	groupBy: BaseAutocompleteData[],
	requestData: GraphClickMetaData,
): TagFilterItem[] =>
	groupBy
		.map((gb) => {
			const value = requestData[gb.key];
			const [startStatusCode, endStatusCode] = getStartAndEndStatusCode(value);
			return value
				? [
						{
							id: v4(),
							key: gb,
							op: '>=',
							value: startStatusCode,
						},
						{
							id: v4(),
							key: gb,
							op: '<=',
							value: endStatusCode,
						},
				  ]
				: [];
		})
		.flat();

export const getCustomFiltersForBarChart = (
	metric:
		| {
				[key: string]: string;
		  }
		| undefined,
): TagFilterItem[] => {
	if (!metric?.response_status_code) {
		return [];
	}
	const [startStatusCode, endStatusCode] = getStartAndEndStatusCode(
		metric.response_status_code,
	);
	return [
		{
			id: v4(),
			key: {
				dataType: DataTypes.String,
				id: 'response_status_code--string--tag--false',
				isColumn: false,
				isJSON: false,
				key: 'response_status_code',
				type: 'tag',
			},
			op: '>=',
			value: startStatusCode,
		},
		{
			id: v4(),
			key: {
				dataType: DataTypes.String,
				id: 'response_status_code--string--tag--false',
				isColumn: false,
				isJSON: false,
				key: 'response_status_code',
				type: 'tag',
			},
			op: '<=',
			value: endStatusCode,
		},
	];
};
