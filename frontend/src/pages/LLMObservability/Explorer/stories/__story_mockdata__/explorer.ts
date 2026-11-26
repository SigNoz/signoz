/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { initialQueryAIWithType } from 'constants/queryBuilder';
import {
	getActiveBuilder,
	replaceBuilderBySlotKey,
} from 'lib/query/builderSlot';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';

const AI_EXPLORER_FILTER = "gen_ai.request.model = 'gpt-4o'";

/** The AI explorer's staged query, narrowed to one model, as its actions hand it over. */
export const aiExplorerQuery = (): Query => {
	const aiBuilder = getActiveBuilder(initialQueryAIWithType);

	return replaceBuilderBySlotKey(
		initialQueryAIWithType,
		EQueryType.AI_QUERY_BUILDER,
		{
			...aiBuilder,
			queryData: aiBuilder.queryData.map((queryData) => ({
				...queryData,
				filter: { expression: AI_EXPLORER_FILTER },
			})),
		},
	);
};
