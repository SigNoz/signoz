export interface TraceReducer {
	filter: Map<TraceFilterEnum, Record<string, string>>;
	filterToFetchData: TraceFilterEnum[];
	filterLoading: boolean;
	selectedFilter: Map<TraceFilterEnum, string[]>;
}

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
