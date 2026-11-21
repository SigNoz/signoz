import type { GetAIObservabilityFieldsKeys200 } from 'api/generated/services/sigNoz.schemas/getAIObservabilityFieldsKeys200';
import type { GetAIObservabilityFieldsValues200 } from 'api/generated/services/sigNoz.schemas/getAIObservabilityFieldsValues200';
import type { GetFieldsKeys200 } from 'api/generated/services/sigNoz.schemas/getFieldsKeys200';
import type { GetFieldsKeysParams } from 'api/generated/services/sigNoz.schemas/getFieldsKeysParams';
import type { GetFieldsValues200 } from 'api/generated/services/sigNoz.schemas/getFieldsValues200';
import type { GetFieldsValuesParams } from 'api/generated/services/sigNoz.schemas/getFieldsValuesParams';

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
