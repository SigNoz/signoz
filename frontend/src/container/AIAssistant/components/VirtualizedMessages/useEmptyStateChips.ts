import { useMemo } from 'react';
import { useQuery } from 'react-query';

import { getEmptyStateChips } from 'api/ai-assistant/chat';
import type { ChipDTO } from 'api/ai-assistant/sigNozAIAssistantAPI.schemas';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';

import { useResolvePageType } from 'hooks/aiAssistant/useResolvePageType';

import { EMPTY_STATE_CHIPS_FALLBACK } from './emptyStateChipsFallback';

interface UseEmptyStateChipsResult {
	chips: ChipDTO[];
}

export function useEmptyStateChips(enabled: boolean): UseEmptyStateChipsResult {
	const pageType = useResolvePageType();

	const { data, isError } = useQuery(
		[REACT_QUERY_KEY.AI_ASSISTANT_EMPTY_STATE_CHIPS, pageType],
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
