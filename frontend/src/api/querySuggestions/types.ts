import type {
	GetAIObservabilityFieldsKeys200,
	GetAIObservabilityFieldsValues200,
	GetAIObservabilityFieldsKeysParams,
	GetAIObservabilityFieldsValuesParams,
	GetFieldsKeys200,
	GetFieldsKeysParams,
	GetFieldsValues200,
	GetFieldsValuesParams,
} from 'api/generated/services/sigNoz.schemas';

export type FieldKeysConfig =
	| GetFieldsKeysParams
	| GetAIObservabilityFieldsKeysParams;

export type FieldValuesConfig =
	| GetFieldsValuesParams
	| GetAIObservabilityFieldsValuesParams;

export type FieldKeysConfigProp = Omit<
	FieldKeysConfig,
	'signal' | 'searchText'
>;

export type FieldKeysResponse =
	| GetFieldsKeys200
	| GetAIObservabilityFieldsKeys200;

export type FieldValuesResponse =
	| GetFieldsValues200
	| GetAIObservabilityFieldsValues200;
