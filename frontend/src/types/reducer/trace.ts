export interface TraceReducer {
	filter: Map<TraceFilterEnum, Record<string, string>>;
	filterToFetchData: TraceFilterEnum[];
	filterLoading: boolean;
	selectedFilter: Map<TraceFilterEnum, string[]>;
	selectedTags: Tags[];
	isTagModalOpen: boolean;
	isTagModalError: boolean;
	spansAggregate: {
		loading: boolean;
		currentPage: number;
		data: SpansAggregateData[];
		error: boolean;
		total: number;
		pageSize: number;
	};
	selectedGroupBy: string;
	selectedFunction: string;
	spansGraph: {
		loading: boolean;
		error: boolean;
		errorMessage: string;
		payload: [];
	};
}

interface SpansAggregateData {
	timestamp: string;
	spanID: string;
	traceID: string;
	serviceName: string;
	operation: string;
	durationNano: number;
	httpCode: string;
	httpMethod: string;
}

export interface Tags {
	Key: string[];
	Operator: OperatorValues;
	Values: string[];
}

type OperatorValues = 'NOT_IN' | 'IN';

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
