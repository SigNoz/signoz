import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

import { PageTypeDTO } from 'api/ai-assistant/sigNozAIAssistantAPI.schemas';
import { resolvePageType } from 'container/AIAssistant/resolvePageType';
import { useVariant } from 'container/AIAssistant/VariantContext';

/**
 * React hook wrapper around `resolvePageType` that derives the current
 * `page_type` from the active location and assistant variant.
 */
export function useResolvePageType(): PageTypeDTO {
	const location = useLocation();
	const variant = useVariant();

	return useMemo(
		() =>
			resolvePageType(location.pathname, location.search, {
				isStandaloneAssistant: variant === 'page',
			}),
		[location.pathname, location.search, variant],
	);
}
