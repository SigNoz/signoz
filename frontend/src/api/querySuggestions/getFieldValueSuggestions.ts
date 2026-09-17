import { getAIObservabilityFieldsValues } from 'api/generated/services/ai-observability';
import { getFieldsValues } from 'api/generated/services/fields';
import type { BuilderQueryType } from 'types/api/v5/queryRange';

import { FieldValuesConfig, FieldValuesResponse } from './types';

export const getFieldValueSuggestions = (
	fieldValuesConfig: FieldValuesConfig,
	builderQueryType?: BuilderQueryType,
	abortSignal?: AbortSignal,
): Promise<FieldValuesResponse> =>
	builderQueryType === 'builder_ai_query'
		? getAIObservabilityFieldsValues(fieldValuesConfig, abortSignal)
		: getFieldsValues(fieldValuesConfig, abortSignal);
