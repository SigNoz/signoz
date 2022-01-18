export interface TraceReducer {
	filter: Map<TraceFilterEnum, Record<string, string>>;
	filterToFetchData: TraceFilterEnum[];
	filterLoading: boolean;
	selectedFilter: Map<TraceFilterEnum, string[]>;
	selectedTags: Tags[];
	isTagModalOpen: boolean;
	spansAggregate: {
		loading: boolean;
		currentPage: number;
		data: SpansAggregateData[];
		error: boolean;
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
	filters: string[];
	selectedFilter: selectedFilter;
	name: string[];
}

type selectedFilter = 'NOT_IN' | 'IN';

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
