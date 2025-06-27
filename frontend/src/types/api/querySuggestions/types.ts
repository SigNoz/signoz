export interface QueryKeyDataSuggestionsProps {
	label: string;
	type: string;
	info?: string;
	apply?: string;
	detail?: string;
	fieldContext?: 'resource' | 'scope' | 'attribute' | 'span';
	fieldDataType?: 'string' | 'number' | 'boolean';
	name: string;
	signal: 'traces' | 'logs' | 'metrics';
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
	fieldDataType?: 'string' | 'number' | 'boolean';
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
	signal: string;
	key: string;
}
