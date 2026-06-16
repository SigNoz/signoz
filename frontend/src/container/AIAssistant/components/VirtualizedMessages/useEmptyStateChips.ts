import { useMemo } from 'react';
import { useQuery } from 'react-query';
import { useLocation } from 'react-router-dom';

import { getEmptyStateChips } from 'api/ai-assistant/chat';
import type { ChipDTO } from 'api/ai-assistant/sigNozAIAssistantAPI.schemas';

import { resolvePageType } from '../../resolvePageType';
import { useVariant } from '../../VariantContext';

import { EMPTY_STATE_CHIPS_FALLBACK } from './emptyStateChipsFallback';

const EMPTY_STATE_CHIPS_QUERY_KEY = 'aiAssistantEmptyStateChips';

interface UseEmptyStateChipsResult {
	chips: ChipDTO[];
}

export function useEmptyStateChips(enabled: boolean): UseEmptyStateChipsResult {
	const location = useLocation();
	const variant = useVariant();
	const pageType = useMemo(
		() =>
			resolvePageType(location.pathname, location.search, {
				isStandaloneAssistant: variant === 'page',
			}),
		[location.pathname, location.search, variant],
	);

	const { data, isError } = useQuery(
		[EMPTY_STATE_CHIPS_QUERY_KEY, pageType],
		({ signal }) => getEmptyStateChips(pageType, signal),
		{ enabled },
	);

	const chips = useMemo(() => {
		if (isError) {
			return EMPTY_STATE_CHIPS_FALLBACK;
		}
		return data ?? [];
	}, [data, isError]);

	return { chips };
}
