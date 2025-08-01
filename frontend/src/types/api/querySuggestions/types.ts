import { QUERY_BUILDER_KEY_TYPES } from 'constants/antlrQueryConstants';

export interface QueryKeyDataSuggestionsProps {
	label: string;
	type: string;
	info?: string;
	apply?: string;
	detail?: string;
	fieldContext?: 'resource' | 'scope' | 'attribute' | 'span';
	fieldDataType?: QUERY_BUILDER_KEY_TYPES;
	name: string;
	signal: 'traces' | 'logs' | 'metrics' | 'meter';
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
	signal: 'traces' | 'logs' | 'metrics' | 'meter';
	searchText: string;
	fieldContext?: 'resource' | 'scope' | 'attribute' | 'span';
	fieldDataType?: QUERY_BUILDER_KEY_TYPES;
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
	signal: 'traces' | 'logs' | 'metrics' | 'meter';
	key: string;
	searchText: string;
}

export type SignalType = 'traces' | 'logs' | 'metrics' | 'meter';
