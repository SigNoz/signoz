import {
	initialQueryBuilderFormValuesMap,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';

import { mapCompositeQueryFromQuery } from '../mapCompositeQueryFromQuery';

const emptyBuilder = {
	queryData: [],
	queryFormulas: [],
	queryTraceOperator: [],
};

describe('mapCompositeQueryFromQuery', () => {
	it('sends an AI query as builder_ai_query envelopes under the builder query type', () => {
		const query: Query = {
			id: 'q',
			queryType: EQueryType.AI_QUERY_BUILDER,
			promql: [],
			clickhouse_sql: [],
			builder: {
				...emptyBuilder,
				queryData: [
					{ ...initialQueryBuilderFormValuesMap.metrics, queryName: 'M' },
				],
			},
			builder_ai_query: {
				...emptyBuilder,
				queryData: [{ ...initialQueryBuilderFormValuesMap.traces, queryName: 'A' }],
			},
		};

		const composite = mapCompositeQueryFromQuery(query, PANEL_TYPES.TIME_SERIES);

		expect(composite.queryType).toBe(EQueryType.QUERY_BUILDER);
		expect(
			composite.queries?.map((q) => [q.type, (q.spec as { name: string }).name]),
		).toStrictEqual([['builder_ai_query', 'A']]);
	});
});
