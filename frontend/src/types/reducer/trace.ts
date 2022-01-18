export interface TraceReducer {
	filter: Map<TraceFilterEnum, Record<string, string>>;
	filterToFetchData: TraceFilterEnum[];
	filterLoading: boolean;
	selectedFilter: Map<TraceFilterEnum, string[]>;
	selectedTags: Tags[];
	isTagModalOpen: boolean;
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
