import useUrlQuery from 'hooks/useUrlQuery';

/**
 * DEMO ONLY — delete this file before merging.
 *
 * The AI o11y explorer page does not exist yet, so there is nowhere to exercise
 * the `builder_ai_query` plumbing end to end. This opts the Traces Explorer into
 * AI-query behaviour when `?aiDemo=1` is present, leaving the page byte-identical
 * otherwise:
 *
 *   - `compositeQuery.queries[].type` becomes `builder_ai_query`
 *   - `/fields/keys` gains `&type=builder_ai_query`
 *   - the All/Root/Entrypoint span-scope select hides in List and Trace views
 *
 * Once the AI Explorer page lands, it passes those values unconditionally and
 * this indirection goes away.
 */
export const AI_DEMO_QUERY_PARAM = 'aiDemo';

export function useIsAIQueryDemo(): boolean {
	const urlQuery = useUrlQuery();

	return urlQuery.get(AI_DEMO_QUERY_PARAM) === '1';
}
