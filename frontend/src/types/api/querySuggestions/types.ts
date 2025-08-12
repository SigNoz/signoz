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
	fieldDataType?: QUERY_BUILDER_KEY_TYPES;
	metricName?: string;
	signalSource?: 'meter' | '';
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
	searchText: string;
	signalSource?: 'meter' | '';
	metricName?: string;
}

export type SignalType = 'traces' | 'logs' | 'metrics';
