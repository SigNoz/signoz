import { getAIObservabilityFieldsKeys } from 'api/generated/services/ai-observability';
import { getFieldsKeys } from 'api/generated/services/fields';
import type { BuilderQueryType } from 'types/api/v5/queryRange';

import { FieldKeysFilterConfig, FieldKeysResponse } from './types';

export const getFieldKeySuggestions = (
	filterConfig: FieldKeysFilterConfig,
	builderQueryType?: BuilderQueryType,
): Promise<FieldKeysResponse> =>
	builderQueryType === 'builder_ai_query'
		? getAIObservabilityFieldsKeys(filterConfig)
		: getFieldsKeys(filterConfig);
