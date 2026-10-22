import { getAIObservabilityFieldsKeys } from 'api/generated/services/ai-observability';
import { getFieldsKeys } from 'api/generated/services/fields';
import type { BuilderQueryType } from 'types/api/v5/queryRange';

import { FieldKeysConfig, FieldKeysResponse } from './types';

export const getFieldKeySuggestions = (
	fieldKeysConfig: FieldKeysConfig,
	builderQueryType?: BuilderQueryType,
	abortSignal?: AbortSignal,
): Promise<FieldKeysResponse> =>
	builderQueryType === 'builder_ai_query'
		? getAIObservabilityFieldsKeys(fieldKeysConfig, abortSignal)
		: getFieldsKeys(fieldKeysConfig, abortSignal);
