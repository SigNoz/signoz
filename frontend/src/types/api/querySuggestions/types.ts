export interface QueryKeyDataSuggestionsProps {
	label: string;
	type: string;
	info?: string;
	apply?: string;
	detail?: string;
	fieldContext: string;
	fieldDataType: string;
	name: string;
	signal: string;
}

export interface QueryKeySuggestionsResponseProps {
	status: string;
	data: {
		complete: boolean;
		keys: {
			[key: string]: QueryKeyDataSuggestionsProps[];
		};
	};
}

export interface QueryKeyRequestProps {
	signal: 'traces' | 'logs' | 'metrics';
	searchText: string;
	fieldContext?: 'resource' | 'scope' | 'attribute' | 'span';
	fieldDataType?: string;
	metricName?: string;
}

export interface QueryKeyValueSuggestionsProps {
	id: string;
	name: string;
}

export interface QueryKeyValueSuggestionsResponseProps {
	status: string;
	data: QueryKeyValueSuggestionsProps[];
}

export interface QueryKeyValueRequestProps {
	signal: 'traces' | 'logs' | 'metrics';
	key: string;
}
