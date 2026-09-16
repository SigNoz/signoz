import { getAIObservabilityFieldsValues } from 'api/generated/services/ai-observability';
import { getFieldsValues } from 'api/generated/services/fields';
import type { BuilderQueryType } from 'types/api/v5/queryRange';

import { FieldValuesFilterConfig, FieldValuesResponse } from './types';

export const getFieldValueSuggestions = (
	filterConfig: FieldValuesFilterConfig,
	builderQueryType?: BuilderQueryType,
): Promise<FieldValuesResponse> =>
	builderQueryType === 'builder_ai_query'
		? getAIObservabilityFieldsValues(filterConfig)
		: getFieldsValues(filterConfig);
