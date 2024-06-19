import { PayloadProps } from 'types/api/trace/getSpans';

export interface TraceReducer {
	filter: Map<TraceFilterEnum, Record<string, string>>;
	filterToFetchData: TraceFilterEnum[];
	filterLoading: boolean;

	selectedFilter: Map<TraceFilterEnum, string[]>;
	userSelectedFilter: Map<TraceFilterEnum, string[]>;

	isFilterExclude: Map<TraceFilterEnum, boolean>;
	selectedTags: Tags[];
	isTagModalOpen: boolean;
	filterResponseSelected: Set<string>;
	isTagModalError: boolean;
	spansAggregate: {
		loading: boolean;
		currentPage: number;
		data: SpansAggregateData[];
		error: boolean;
		total: number;
		pageSize: number;
		order: string;
		orderParam: string;
	};
	selectedGroupBy: string;
	selectedFunction: string;
	spansGraph: {
		loading: boolean;
		error: boolean;
		errorMessage: string;
		payload: PayloadProps;
	};
	yAxisUnit: string | undefined;
	filterDisplayValue: Map<TraceFilterEnum, number>;
	spanKind?: string;
}

interface SpansAggregateData {
	timestamp: string;
	spanID: string;
	traceID: string;
	serviceName: string;
	operation: string;
	durationNano: number;
	statusCode: string;
	method: string;
}

export interface Tags {
	Key: string;
	Operator: OperatorValues;
	StringValues: string[];
	NumberValues: number[];
	BoolValues: boolean[];
}

export type OperatorValues =
	| 'NotIn'
	| 'In'
	| 'Equals'
	| 'NotEquals'
	| 'Contains'
	| 'NotContains'
	| 'GreaterThan'
	| 'Exists'
	| 'NotExists'
	| 'LessThan'
	| 'GreaterThanEquals'
	| 'LessThanEquals'
	| 'StartsWith'
	| 'NotStartsWith';

export type TraceFilterEnum =
	| 'duration'
	| 'httpHost'
	| 'httpMethod'
	| 'httpRoute'
	| 'httpUrl'
	| 'operation'
	| 'serviceName'
	| 'status'
	| 'responseStatusCode'
	| 'rpcMethod'
	| 'traceID';

export const AllPanelHeading: {
	key: TraceFilterEnum;
	displayValue: string;
}[] = [
	{
		key: 'duration',
		displayValue: 'Duration',
	},
	{
		key: 'httpHost',
		displayValue: 'HTTP Host',
	},
	{
		key: 'httpMethod',
		displayValue: 'HTTP Method',
	},
	{
		displayValue: 'HTTP Route',
		key: 'httpRoute',
	},
	{
		key: 'httpUrl',
		displayValue: 'HTTP URL',
	},
	{
		key: 'operation',
		displayValue: 'Operation',
	},
	{
		key: 'responseStatusCode',
		displayValue: 'Status Code',
	},
	{
		key: 'rpcMethod',
		displayValue: 'RPC Method',
	},
	{
		key: 'serviceName',
		displayValue: 'Service Name',
	},
	{
		key: 'status',
		displayValue: 'Status',
	},
	{
		key: 'traceID',
		displayValue: 'Trace ID',
	},
];
