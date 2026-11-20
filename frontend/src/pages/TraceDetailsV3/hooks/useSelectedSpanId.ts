import { useCallback } from 'react';
import { parseAsString, useQueryState } from 'nuqs';

export const SELECTED_SPAN_ID_PARAM = 'spanId';

/**
 * The selected span, kept in the `spanId` URL param. Every reader of the
 * selection goes through this hook so they all see a write in the same render.
 * Not shallow: the thread tab still reads `spanId` from the router location.
 */
export function useSelectedSpanId(): [
	string | null,
	(spanId: string | null) => void,
] {
	const [spanId, setSpanIdParam] = useQueryState(
		SELECTED_SPAN_ID_PARAM,
		parseAsString.withOptions({ shallow: false }),
	);

	const setSpanId = useCallback(
		(next: string | null): void => {
			void setSpanIdParam(next);
		},
		[setSpanIdParam],
	);

	return [spanId, setSpanId];
}
