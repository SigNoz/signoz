import { FieldDataType } from 'types/api/v5/queryRange';

export interface QueryKeyDataSuggestionsProps {
	label: string;
	type: string;
	info?: string;
	apply?: string;
	detail?: string;
	fieldContext?: 'resource' | 'scope' | 'attribute' | 'span';
	/**
	 * The field's type as the API reports it. Was declared as the antlr key-type enum
	 * (`string | number | boolean`), which the endpoint never returns — every consumer cast it
	 * back to `FieldDataType`.
	 */
	fieldDataType?: FieldDataType;
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
	fieldDataType?: FieldDataType;
	metricName?: string;
	metricNamespace?: string;
	signalSource?: 'meter' | '';
}

export type SignalType = 'traces' | 'logs' | 'metrics';
