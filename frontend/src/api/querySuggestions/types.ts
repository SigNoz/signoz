import type {
	GetAIObservabilityFieldsKeys200,
	GetAIObservabilityFieldsValues200,
	GetFieldsKeys200,
	GetFieldsKeysParams,
	GetFieldsValues200,
	GetFieldsValuesParams,
} from 'api/generated/services/sigNoz.schemas';

export type FieldKeysConfig = GetFieldsKeysParams;

export type FieldValuesConfig = GetFieldsValuesParams;

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
