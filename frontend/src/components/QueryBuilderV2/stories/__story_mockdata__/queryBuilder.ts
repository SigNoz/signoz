/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import {
	initialQueriesMap,
	initialQueryBuilderFormTraceOperatorValues,
} from 'constants/queryBuilder';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';

const [tracesQuery] = initialQueriesMap.traces.builder.queryData;

/** Two traces queries joined by a trace operator: a span of A with a descendant from B. */
export const traceMatchingQuery: Query = {
	...initialQueriesMap.traces,
	builder: {
		...initialQueriesMap.traces.builder,
		queryData: [
			{
				...tracesQuery,
				queryName: 'A',
				expression: 'A',
				filter: { expression: "service.name = 'frontend'" },
			},
			{
				...tracesQuery,
				queryName: 'B',
				expression: 'B',
				filter: { expression: "service.name = 'payments' AND has_error = true" },
			},
		],
		queryTraceOperator: [
			{ ...initialQueryBuilderFormTraceOperatorValues, expression: 'A => B' },
		],
	},
};
