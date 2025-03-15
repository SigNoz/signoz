/* eslint-disable sonarjs/no-duplicate-string */
import { Color } from '@signozhq/design-tokens';
import { Progress } from 'antd';
import { ColumnType } from 'antd/es/table';
import {
	FiltersType,
	IQuickFiltersConfig,
} from 'components/QuickFilters/types';
import { PANEL_TYPES } from 'constants/queryBuilder';
import dayjs from 'dayjs';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import {
	BaseAutocompleteData,
	DataTypes,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';
import { v4 } from 'uuid';

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

const getLastUsedRelativeTime = (lastRefresh: number): string => {
	const currentTime = dayjs();
	console.log('uncaught lastRefresh', { lastRefresh, currentTime });

	const secondsDiff = currentTime.diff(lastRefresh, 'seconds');

	const minutedDiff = currentTime.diff(lastRefresh, 'minutes');
	const hoursDiff = currentTime.diff(lastRefresh, 'hours');
	const daysDiff = currentTime.diff(lastRefresh, 'days');
	const monthsDiff = currentTime.diff(lastRefresh, 'months');

	if (monthsDiff > 0) {
		return `${monthsDiff} months ago`;
	}

	if (daysDiff > 0) {
		return `${daysDiff} days ago`;
	}

	if (hoursDiff > 0) {
		return `${hoursDiff}h ago`;
	}

	if (minutedDiff > 0) {
		return `${minutedDiff}m ago`;
	}

	return `${secondsDiff}s ago`;
};

const columnProgressBarClassName = 'column-progress-bar';

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
		sorter: false,
		align: 'right',
		className: `column ${columnProgressBarClassName}`,
	},
	{
		title: <div>Last used</div>,
		dataIndex: 'lastUsed',
		key: 'lastUsed',
		width: '14.2%',
		sorter: false,
		align: 'right',
		className: `column ${columnProgressBarClassName}`,
		render: (lastUsed: number): string => getLastUsedRelativeTime(lastUsed),
	},
	{
		title: (
			<div>
				Rate <span className="table-col-header-tag">/s</span>
			</div>
		),
		dataIndex: 'rate',
		key: 'rate',
		width: '14.2%',
		sorter: false,
		align: 'right',
		className: `column ${columnProgressBarClassName}`,
	},
	{
		title: (
			<div>
				Error rate <span className="table-col-header-tag">%</span>
			</div>
		),
		dataIndex: 'errorRate',
		key: 'errorRate',
		width: '14.2%',
		sorter: false,
		align: 'right',
		className: `column ${columnProgressBarClassName}`,
		render: (errorRate: number): React.ReactNode => {
			if (!errorRate) return null;
			return (
				<Progress
					percent={Number((errorRate * 100).toFixed(1))}
					strokeLinecap="butt"
					size="small"
					strokeColor={((): string => {
						const errorRatePercent = Number((errorRate * 100).toFixed(1));
						if (errorRatePercent >= 90) return Color.BG_SAKURA_500;
						if (errorRatePercent >= 60) return Color.BG_AMBER_500;
						return Color.BG_FOREST_500;
					})()}
					className="progress-bar"
				/>
			);
		},
	},
	{
		title: (
			<div>
				Avg. Latency <span className="table-col-header-tag">ms</span>
			</div>
		),
		dataIndex: 'latency',
		key: 'latency',
		width: '14.2%',
		sorter: false,
		align: 'right',
		className: `column ${columnProgressBarClassName}`,
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

const domainNameKey = 'net.peer.name';

interface APIMonitoringResponseRow {
	data: {
		endpoints: number;
		error_rate: number;
		lastseen: number;
		[domainNameKey]: string;
		p99: number;
		rps: number;
	};
}

interface EndPointsResponseRow {
	data: {
		['http.url']: string;
		[key: string]: string | number;
		A: number;
		B: number;
		C: number;
	};
}

interface APIDomainsRowData {
	key: string;
	domainName: React.ReactNode;
	endpointCount: React.ReactNode;
	rate: React.ReactNode;
	errorRate: React.ReactNode;
	latency: React.ReactNode;
	lastUsed: React.ReactNode;
}

// Rename this to a proper name
export const formatDataForTable = (
	data: APIMonitoringResponseRow[],
): APIDomainsRowData[] =>
	data?.map((domain) => ({
		key: v4(),
		domainName: domain.data[domainNameKey] || '',
		endpointCount: domain.data.endpoints,
		rate: domain.data.rps,
		errorRate: domain.data.error_rate,
		latency: Math.round(domain.data.p99 / 1000000), // Convert from nanoseconds to milliseconds
		lastUsed: new Date(Math.floor(domain.data.lastseen / 1000000)).toISOString(), // Convert from nanoseconds to milliseconds
	}));

// Rename this to a proper name
const defaultGroupBy = [
	{
		dataType: DataTypes.String,
		id: 'http.url--string--tag--false',
		isColumn: false,
		isJSON: false,
		key: 'http.url',
		type: 'tag',
	},
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
								id: 'span_id--string----true',
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
										id: '82bdab49',
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
								],
								op: 'AND',
							},
							functions: [],
							groupBy: isGroupedByAttribute ? groupBy : defaultGroupBy,
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
						{
							aggregateAttribute: {
								dataType: DataTypes.Float64,
								id: 'duration_nano--float64----true',
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
										id: '3f46231e',
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
								],
								op: 'AND',
							},
							functions: [],
							groupBy: isGroupedByAttribute ? groupBy : defaultGroupBy,
							having: [],
							legend: '',
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
										id: '55ad75cd',
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
								],
								op: 'AND',
							},
							functions: [],
							groupBy: isGroupedByAttribute ? groupBy : defaultGroupBy,
							having: [],
							legend: '',
							limit: null,
							orderBy: [],
							queryName: 'C',
							reduceTo: 'avg',
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'max',
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
};

export interface EndPointsTableRowData {
	key: string;
	endpointName: string;
	callCount: number;
	latency: number;
	lastUsed: number;
	groupedByMeta?: Record<string, string | number>;
}

// Add icons in the below column headers
export const getEndPointsColumnsConfig = (
	isGroupedByAttribute: boolean,
): ColumnType<EndPointsTableRowData>[] => [
	{
		title: (
			<div className="column-header endpoint-name-header">
				{isGroupedByAttribute ? 'Endpoint group' : 'Endpoint'}
			</div>
		),
		dataIndex: 'endpointName',
		key: 'endpointName',
		width: 180,
		ellipsis: true,
		sorter: false,
		className: 'column column-endpoint-name',
	},
	{
		title: <div className="column-header med-col">Number of calls</div>,
		dataIndex: 'callCount',
		key: 'callCount',
		width: 180,
		ellipsis: true,
		sorter: false,
		align: 'left',
		className: `column`,
	},
	{
		title: <div className="column-header med-col">Latency (ms)</div>,
		dataIndex: 'latency',
		key: 'latency',
		width: 120,
		sorter: false,
		align: 'left',
		className: `column`,
	},
	{
		title: <div className="column-header med-col">Last used</div>,
		dataIndex: 'lastUsed',
		key: 'lastUsed',
		width: 120,
		sorter: false,
		align: 'left',
		className: `column`,
	},
];

export const formatEndPointsDataForTable = (
	data: EndPointsResponseRow[],
	groupBy: BaseAutocompleteData[],
): EndPointsTableRowData[] => {
	const isGroupedByAttribute = groupBy.length > 0;
	if (!isGroupedByAttribute) {
		return data?.map((endpoint) => ({
			key: v4(),
			endpointName: endpoint.data['http.url'],
			callCount: endpoint.data.A,
			latency: endpoint.data.B,
			lastUsed: endpoint.data.C,
		}));
	}

	const groupedByAttributeData = groupBy.map((attribute) => attribute.key);

	// TODO: Use tags to show the concatenated attribute values
	return data?.map((endpoint) => {
		const newEndpointName = groupedByAttributeData
			.map((attribute) => endpoint.data[attribute])
			.join(', ');
		return {
			key: v4(),
			endpointName: newEndpointName,
			callCount: endpoint.data.A,
			latency: endpoint.data.B,
			lastUsed: endpoint.data.C,
			groupedByMeta: groupedByAttributeData.reduce((acc, attribute) => {
				acc[attribute] = endpoint.data[attribute];
				return acc;
			}, {} as Record<string, string | number>),
		};
	});
};

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
			value: groupedByMeta[key],
			id: key,
		})),
	);

	return baseFilters;
};

// First query payload for endpoint metrics
// Second query payload for endpoint status code
// Third query payload for endpoint rate over time graph
// Fourth query payload for endpoint latency over time graph
// Fifth query payload for endpoint dropdown selection
// Sixth query payload for endpoint dependant services
// Seventh query payload for endpoint response status count bar chart
// Eighth query payload for endpoint response status code latency bar chart
export const getEndPointDetailsQueryPayload = (
	domainName: string,
	endPointName: string,
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
									id: '3db61dd6',
									key: {
										dataType: DataTypes.String,
										id: 'http.url--string--tag--false',
										isColumn: false,
										isJSON: false,
										key: 'http.url',
										type: 'tag',
									},
									op: '=',
									value: endPointName,
								},
								{
									id: '2d0f6061',
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
							id: 'duration_nano--float64----true',
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
									id: 'bd65eb28',
									key: {
										dataType: DataTypes.String,
										id: 'http.url--string--tag--false',
										isColumn: false,
										isJSON: false,
										key: 'http.url',
										type: 'tag',
									},
									op: '=',
									value: endPointName,
								},
								{
									id: '14b30e30',
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
									id: 'd9d55d83',
									key: {
										dataType: DataTypes.String,
										id: 'http.url--string--tag--false',
										isColumn: false,
										isJSON: false,
										key: 'http.url',
										type: 'tag',
									},
									op: '=',
									value: endPointName,
								},
								{
									id: '6087aebe',
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
									id: 'c575cf6e',
									key: {
										dataType: DataTypes.bool,
										id: 'has_error--bool----true',
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
						functions: [],
						groupBy: [],
						having: [],
						legend: 'Error',
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
									id: '8899ca87',
									key: {
										dataType: DataTypes.String,
										id: 'http.url--string--tag--false',
										isColumn: false,
										isJSON: false,
										key: 'http.url',
										type: 'tag',
									},
									op: '=',
									value: endPointName,
								},
								{
									id: '5c4646fd',
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
							id: 'span_id--string----true',
							isColumn: true,
							isJSON: false,
							key: 'span_id',
							type: '',
						},
						aggregateOperator: 'count_distinct',
						dataSource: DataSource.TRACES,
						disabled: false,
						expression: 'A',
						filters: {
							items: [
								{
									id: '23450eb8',
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
									id: 'e1b24204',
									key: {
										dataType: DataTypes.String,
										id: 'http.url--string--tag--false',
										isColumn: false,
										isJSON: false,
										key: 'http.url',
										type: 'tag',
									},
									op: '=',
									value: endPointName,
								},
								...filters.items,
							],
							op: 'AND',
						},
						functions: [],
						groupBy: [
							{
								dataType: DataTypes.String,
								id: 'response_status_code--string----true',
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
						timeAggregation: 'count_distinct',
					},
					{
						aggregateAttribute: {
							dataType: DataTypes.Float64,
							id: 'duration_nano--float64----true',
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
									id: '5dbe3518',
									key: {
										dataType: DataTypes.String,
										id: 'http.url--string--tag--false',
										isColumn: false,
										isJSON: false,
										key: 'http.url',
										type: 'tag',
									},
									op: '=',
									value: endPointName,
								},
								...filters.items,
							],
							op: 'AND',
						},
						functions: [],
						groupBy: [
							{
								dataType: DataTypes.String,
								id: 'response_status_code--string----true',
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
						aggregateOperator: 'rate',
						dataSource: DataSource.TRACES,
						disabled: false,
						expression: 'B',
						filters: {
							items: [
								{
									id: '3c76fe0b',
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
									id: '30710f04',
									key: {
										dataType: DataTypes.String,
										id: 'http.url--string--tag--false',
										isColumn: false,
										isJSON: false,
										key: 'http.url',
										type: 'tag',
									},
									op: '=',
									value: endPointName,
								},
								...filters.items,
							],
							op: 'AND',
						},
						functions: [],
						groupBy: [
							{
								dataType: DataTypes.String,
								id: 'http.url--string--tag--false',
								isColumn: false,
								isJSON: false,
								key: 'http.url',
								type: 'tag',
							},
						],
						having: [],
						legend: '',
						limit: null,
						orderBy: [],
						queryName: 'B',
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
							id: 'duration_nano--float64----true',
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
									id: '63adb3ff',
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
									id: '50142500',
									key: {
										dataType: DataTypes.String,
										id: 'http.url--string--tag--false',
										isColumn: false,
										isJSON: false,
										key: 'http.url',
										type: 'tag',
									},
									op: '=',
									value: endPointName,
								},
								...filters.items,
							],
							op: 'AND',
						},
						functions: [],
						groupBy: [
							{
								dataType: DataTypes.String,
								id: 'http.url--string--tag--false',
								isColumn: false,
								isJSON: false,
								key: 'http.url',
								type: 'tag',
							},
						],
						having: [],
						legend: '',
						limit: null,
						orderBy: [],
						queryName: 'B',
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
										key: 'net.peer.name',
										dataType: DataTypes.String,
										type: 'tag',
										isColumn: false,
										isJSON: false,
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
						legend: '',
						limit: null,
						orderBy: [],
						groupBy: [
							{
								key: 'http.url',
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
							id: 'span_id--string----true',
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
									id: 'a32988a4',
									key: {
										dataType: DataTypes.String,
										id: 'http.url--string--tag--false',
										isColumn: false,
										isJSON: false,
										key: 'http.url',
										type: 'tag',
									},
									op: '=',
									value: endPointName,
								},
								{
									id: '5a15032f',
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
									id: '8b1be6f0',
									key: {
										dataType: DataTypes.String,
										id: 'http.url--string--tag--false',
										isColumn: false,
										isJSON: false,
										key: 'http.url',
										type: 'tag',
									},
									op: '=',
									value: endPointName,
								},
								...filters.items,
							],
							op: 'AND',
						},
						functions: [],
						groupBy: [
							{
								dataType: DataTypes.String,
								id: 'response_status_code--string----true',
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
							dataType: DataTypes.Float64,
							id: 'duration_nano--float64----true',
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
									id: '52aca159',
									key: {
										dataType: DataTypes.String,
										id: 'http.url--string--tag--false',
										isColumn: false,
										isJSON: false,
										key: 'http.url',
										type: 'tag',
									},
									op: '=',
									value: endPointName,
								},
								{
									id: 'aae93366',
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
								...filters.items,
							],
							op: 'AND',
						},
						functions: [],
						groupBy: [
							{
								dataType: DataTypes.String,
								id: 'response_status_code--string----true',
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
		formatForWeb: true,
		start,
		end,
		step: 60,
	},
];

interface EndPointMetricsResponseRow {
	data: {
		A: number;
		B: number;
		C: number;
		D: number;
	};
}

interface EndPointStatusCodeResponseRow {
	data: {
		response_status_code: string;
		A: number;
		B: number;
	};
}

interface EndPointMetricsData {
	key: string;
	rate: number;
	latency: number;
	errorRate: number;
	lastUsed: number;
}

interface EndPointStatusCodeData {
	key: string;
	statusCode: string;
	count: number;
	p99Latency: number;
}

export const getFormattedEndPointMetricsData = (
	data: EndPointMetricsResponseRow[],
): EndPointMetricsData => ({
	key: v4(),
	rate: data[0].data.A,
	latency: data[0].data.B,
	errorRate: data[0].data.C,
	lastUsed: data[0].data.D,
});

export const getFormattedEndPointStatusCodeData = (
	data: EndPointStatusCodeResponseRow[],
): EndPointStatusCodeData[] =>
	data?.map((row) => ({
		key: v4(),
		statusCode: row.data.response_status_code,
		count: row.data.A,
		p99Latency: row.data.B,
	}));

export const endPointStatusCodeColumns: ColumnType<EndPointStatusCodeData>[] = [
	{
		title: 'STATUS CODE',
		dataIndex: 'statusCode',
		key: 'statusCode',
	},
	{
		title: 'NUMBER OF CALLS',
		dataIndex: 'count',
		key: 'count',
	},
	{
		title: 'P99',
		dataIndex: 'p99Latency',
		key: 'p99Latency',
	},
];

export const apiWidgetInfo = [
	{ title: 'Rate over time', yAxisUnit: 'ops/s' },
	{ title: 'Latency over time', yAxisUnit: 'ms' },
];

interface EndPointDropDownResponseRow {
	data: {
		['http.url']: string;
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
): EndPointDropDownData[] =>
	data?.map((row) => ({
		key: v4(),
		label: row.data['http.url'],
		value: row.data['http.url'],
	}));

interface DependentServicesResponseRow {
	data: {
		['service.name']: string;
		A: number;
	};
}

interface DependentServicesData {
	key: string;
	serviceName: string;
	count: number;
	percentage: number;
}

export const getFormattedDependentServicesData = (
	data: DependentServicesResponseRow[],
): DependentServicesData[] => {
	if (!data) return [];
	const totalCount = data?.reduce((acc, row) => acc + row.data.A, 0);
	return data?.map((row) => ({
		key: v4(),
		serviceName: row.data['service.name'],
		count: row.data.A,
		percentage: Number(((row.data.A / totalCount) * 100).toFixed(2)),
	}));
};
