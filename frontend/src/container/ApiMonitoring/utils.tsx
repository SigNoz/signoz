/* eslint-disable sonarjs/no-duplicate-string */
import { Color } from '@signozhq/design-tokens';
import { Progress, Tag } from 'antd';
import { ColumnType } from 'antd/es/table';
import {
	FiltersType,
	IQuickFiltersConfig,
} from 'components/QuickFilters/types';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import dayjs from 'dayjs';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import { cloneDeep } from 'lodash-es';
import { ArrowUpDown, ChevronDown, ChevronRight } from 'lucide-react';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import {
	BaseAutocompleteData,
	DataTypes,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { QueryData } from 'types/api/widgets/getQuery';
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
		sorter: false,
		align: 'right',
		className: `column`,
	},
	{
		title: <div>Last used</div>,
		dataIndex: 'lastUsed',
		key: 'lastUsed',
		width: '14.2%',
		sorter: false,
		align: 'right',
		className: `column`,
		render: (lastUsed: number | string): string =>
			lastUsed === 'n/a' || lastUsed === '-'
				? '-'
				: getLastUsedRelativeTime(lastUsed as number),
	},
	{
		title: (
			<div>
				Rate <span className="round-metric-tag">/s</span>
			</div>
		),
		dataIndex: 'rate',
		key: 'rate',
		width: '14.2%',
		sorter: false,
		align: 'right',
		className: `column`,
	},
	{
		title: (
			<div>
				Error rate <span className="round-metric-tag">%</span>
			</div>
		),
		dataIndex: 'errorRate',
		key: 'errorRate',
		width: '14.2%',
		sorter: false,
		align: 'right',
		className: `column`,
		render: (errorRate: number): React.ReactNode => (
			<Progress
				status="active"
				percent={Number((errorRate * 100).toFixed(1))}
				strokeLinecap="butt"
				size="small"
				strokeColor={((): string => {
					const errorRatePercent = Number((errorRate * 100).toFixed(1));
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
				Avg. Latency <span className="round-metric-tag">ms</span>
			</div>
		),
		dataIndex: 'latency',
		key: 'latency',
		width: '14.2%',
		sorter: false,
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

const domainNameKey = 'net.peer.name';

interface APIMonitoringResponseRow {
	data: {
		endpoints: number;
		error_rate: number;
		lastseen: number | string;
		[domainNameKey]: string;
		p99: number | string;
		rps: number;
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
		domainName: domain.data[domainNameKey] || '',
		endpointCount: domain.data.endpoints,
		rate: domain.data.rps,
		errorRate: domain.data.error_rate,
		latency:
			domain.data.p99 === 'n/a'
				? '-'
				: Math.round(Number(domain.data.p99) / 1000000), // Convert from nanoseconds to milliseconds
		lastUsed:
			domain.data.lastseen === 'n/a'
				? '-'
				: new Date(
						Math.floor(Number(domain.data.lastseen) / 1000000),
				  ).toISOString(), // Convert from nanoseconds to milliseconds
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
	callCount: number | string;
	latency: number | string;
	lastUsed: string;
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

// Add icons in the below column headers
export const getEndPointsColumnsConfig = (
	isGroupedByAttribute: boolean,
	expandedRowKeys: React.Key[],
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
		sorter: false,
		align: 'right',
		className: `column`,
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
		sorter: false,
		align: 'right',
		className: `column`,
	},
	{
		title: <div>Last used</div>,
		dataIndex: 'lastUsed',
		key: 'lastUsed',
		width: 120,
		sorter: false,
		align: 'right',
		className: `column`,
	},
];

export const formatEndPointsDataForTable = (
	data: EndPointsResponseRow[] | undefined,
	groupBy: BaseAutocompleteData[],
	// eslint-disable-next-line sonarjs/cognitive-complexity
): EndPointsTableRowData[] => {
	if (!data) return [];
	const isGroupedByAttribute = groupBy.length > 0;
	if (!isGroupedByAttribute) {
		return data?.map((endpoint) => {
			const { port } = extractPortAndEndpoint(
				(endpoint.data['http.url'] as string) || '',
			);
			return {
				key: v4(),
				endpointName: (endpoint.data['http.url'] as string) || '',
				port,
				callCount: endpoint.data.A || '-',
				latency:
					endpoint.data.B === 'n/a'
						? '-'
						: Math.round(Number(endpoint.data.B) / 1000000), // Convert from nanoseconds to milliseconds
				lastUsed:
					endpoint.data.C === 'n/a'
						? '-'
						: getLastUsedRelativeTime(Math.floor(Number(endpoint.data.C) / 1000000)), // Convert from nanoseconds to milliseconds
			};
		});
	}

	const groupedByAttributeData = groupBy.map((attribute) => attribute.key);

	// TODO: Use tags to show the concatenated attribute values
	return data?.map((endpoint) => {
		const newEndpointName = groupedByAttributeData
			.map((attribute) => endpoint.data[attribute])
			.join(',');
		return {
			key: v4(),
			endpointName: newEndpointName,
			callCount: endpoint.data.A || '-',
			latency:
				endpoint.data.B === 'n/a'
					? '-'
					: Math.round(Number(endpoint.data.B) / 1000000), // Convert from nanoseconds to milliseconds
			lastUsed:
				endpoint.data.C === 'n/a'
					? '-'
					: getLastUsedRelativeTime(Math.floor(Number(endpoint.data.C) / 1000000)), // Convert from nanoseconds to milliseconds
			groupedByMeta: groupedByAttributeData.reduce((acc, attribute) => {
				acc[attribute] = endpoint.data[attribute] || '';
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
										key: 'net.peer.name',
										dataType: DataTypes.String,
										type: 'tag',
										isColumn: false,
										isJSON: false,
									},
									op: '=',
									value: domainName,
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
];

interface EndPointMetricsResponseRow {
	data: {
		A: number;
		B: number | string;
		C: number;
		D: number | string;
	};
}

interface EndPointStatusCodeResponseRow {
	data: {
		response_status_code: string;
		A: number;
		B: number | string;
	};
}

interface EndPointMetricsData {
	key: string;
	rate: number | string;
	latency: number | string;
	errorRate: number;
	lastUsed: string;
}

interface EndPointStatusCodeData {
	key: string;
	statusCode: string;
	count: number;
	p99Latency: number | string;
}

export const getFormattedEndPointMetricsData = (
	data: EndPointMetricsResponseRow[],
): EndPointMetricsData => ({
	key: v4(),
	rate: data[0].data.D === 'n/a' || !data[0].data.D ? '-' : data[0].data.A,
	latency:
		data[0].data.B === 'n/a' ? '-' : Math.round(Number(data[0].data.B) / 1000000),
	errorRate: data[0].data.C,
	lastUsed:
		data[0].data.D === 'n/a' || !data[0].data.D
			? '-'
			: getLastUsedRelativeTime(Math.floor(Number(data[0].data.D) / 1000000)),
});

export const getFormattedEndPointStatusCodeData = (
	data: EndPointStatusCodeResponseRow[],
): EndPointStatusCodeData[] =>
	data?.map((row) => ({
		key: v4(),
		statusCode: row.data.response_status_code,
		count: row.data.A,
		p99Latency:
			row.data.B === 'n/a' ? '-' : Math.round(Number(row.data.B) / 1000000), // Convert from nanoseconds to milliseconds,
	}));

export const endPointStatusCodeColumns: ColumnType<EndPointStatusCodeData>[] = [
	{
		title: <div className="status-code-header">STATUS CODE</div>,
		dataIndex: 'statusCode',
		key: 'statusCode',
		render: (text): JSX.Element => (
			<div className="status-code-value">{text}</div>
		),
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
	},
	{
		title: 'P99',
		dataIndex: 'p99Latency',
		key: 'p99Latency',
		align: 'right',
	},
];

export const apiWidgetInfo = [
	{ title: 'Rate over time', yAxisUnit: 'ops/s' },
	{ title: 'Latency over time', yAxisUnit: 'ns' },
];

export const statusCodeWidgetInfo = [
	{ yAxisUnit: 'calls' },
	{ yAxisUnit: 'ns' },
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
			allTimestamps.add(value[0]);
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

	return Object.values(groupedSeries);
};
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
		return data;
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
