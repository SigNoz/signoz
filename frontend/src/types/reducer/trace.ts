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
	Key: string[];
	Operator: OperatorValues;
	Values: string[];
}

export interface TagsAPI {
	Key: string;
	Operator: OperatorValues;
	Values: string[];
}
export type OperatorValues = 'not in' | 'in';

export type TraceFilterEnum =
	| 'component'
	| 'duration'
	| 'httpCode'
	| 'httpHost'
	| 'httpMethod'
	| 'httpRoute'
	| 'httpUrl'
	| 'operation'
	| 'serviceName'
	| 'status';

export const AllPanelHeading: {
	key: TraceFilterEnum;
	displayValue: string;
}[] = [
	{
		displayValue: 'Component',
		key: 'component',
	},
	{
		key: 'duration',
		displayValue: 'Duration',
	},
	{
		displayValue: 'HTTP Code',
		key: 'httpCode',
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
		key: 'serviceName',
		displayValue: 'Service Name',
	},
	{
		key: 'status',
		displayValue: 'Status',
	},
];
