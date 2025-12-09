import { TelemetryFieldKey } from 'api/v5/v5';
import { QUERY_BUILDER_KEY_TYPES } from 'constants/antlrQueryConstants';
import { QueryKeySuggestionsResponseProps } from 'types/api/querySuggestions/types';

const HTTP_STATUS_CODE = 'http.status_code';
const SERVICE_NAME = 'service.name';

// Conflicting fields: same name, different datatype
export const mockConflictingFieldsByDatatype: TelemetryFieldKey[] = [
	{
		name: HTTP_STATUS_CODE,
		fieldDataType: QUERY_BUILDER_KEY_TYPES.STRING,
		fieldContext: 'attribute',
		signal: 'traces',
	},
	{
		name: HTTP_STATUS_CODE,
		fieldDataType: QUERY_BUILDER_KEY_TYPES.NUMBER,
		fieldContext: 'attribute',
		signal: 'traces',
	},
];

// Conflicting fields: same name, different context
export const mockConflictingFieldsByContext: TelemetryFieldKey[] = [
	{
		name: SERVICE_NAME,
		fieldDataType: QUERY_BUILDER_KEY_TYPES.STRING,
		fieldContext: 'resource',
		signal: 'traces',
	},
	{
		name: SERVICE_NAME,
		fieldDataType: QUERY_BUILDER_KEY_TYPES.STRING,
		fieldContext: 'attribute',
		signal: 'traces',
	},
];

// Non-conflicting field (single variant)
export const mockNonConflictingField: TelemetryFieldKey[] = [
	{
		name: 'trace_id',
		fieldDataType: QUERY_BUILDER_KEY_TYPES.STRING,
		fieldContext: 'attribute',
		signal: 'traces',
	},
];

// Mock API response structure for conflicting fields by datatype
export const mockQueryKeySuggestionsResponseByDatatype: QueryKeySuggestionsResponseProps = {
	status: 'success',
	data: {
		complete: true,
		keys: {
			[HTTP_STATUS_CODE]: [
				{
					name: HTTP_STATUS_CODE,
					fieldDataType: QUERY_BUILDER_KEY_TYPES.STRING,
					fieldContext: 'attribute',
					signal: 'traces',
					label: HTTP_STATUS_CODE,
					type: 'attribute',
				},
				{
					name: HTTP_STATUS_CODE,
					fieldDataType: QUERY_BUILDER_KEY_TYPES.NUMBER,
					fieldContext: 'attribute',
					signal: 'traces',
					label: HTTP_STATUS_CODE,
					type: 'attribute',
				},
			],
		},
	},
};

// Mock API response structure for conflicting fields by context
export const mockQueryKeySuggestionsResponseByContext: QueryKeySuggestionsResponseProps = {
	status: 'success',
	data: {
		complete: true,
		keys: {
			[SERVICE_NAME]: [
				{
					name: SERVICE_NAME,
					fieldDataType: QUERY_BUILDER_KEY_TYPES.STRING,
					fieldContext: 'resource',
					signal: 'traces',
					label: SERVICE_NAME,
					type: 'resource',
				},
				{
					name: SERVICE_NAME,
					fieldDataType: QUERY_BUILDER_KEY_TYPES.STRING,
					fieldContext: 'attribute',
					signal: 'traces',
					label: SERVICE_NAME,
					type: 'attribute',
				},
			],
		},
	},
};

// All available keys (for allAvailableKeys prop)
export const mockAllAvailableKeys: TelemetryFieldKey[] = [
	...mockConflictingFieldsByDatatype,
	...mockConflictingFieldsByContext,
	...mockNonConflictingField,
];
