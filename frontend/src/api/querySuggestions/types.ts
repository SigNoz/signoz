import type {
	GetAIObservabilityFieldsKeys200,
	GetAIObservabilityFieldsKeysParams,
	GetAIObservabilityFieldsValues200,
	GetAIObservabilityFieldsValuesParams,
	GetFieldsKeys200,
	GetFieldsKeysParams,
	GetFieldsValues200,
	GetFieldsValuesParams,
} from 'api/generated/services/sigNoz.schemas';

export type FieldKeysFilterConfig =
	| GetFieldsKeysParams
	| GetAIObservabilityFieldsKeysParams;

export type FieldValuesFilterConfig =
	| GetFieldsValuesParams
	| GetAIObservabilityFieldsValuesParams;

export type FieldKeysResponse =
	| GetFieldsKeys200
	| GetAIObservabilityFieldsKeys200;

export type FieldValuesResponse =
	| GetFieldsValues200
	| GetAIObservabilityFieldsValues200;
