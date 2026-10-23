import {
	initialFormulaBuilderFormValues,
	initialQueriesMap,
	initialQueryAIWithType,
} from 'constants/queryBuilder';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';

import { getQueryNames } from '../utils';

const tracesQuery = initialQueriesMap.traces;
const formula = { ...initialFormulaBuilderFormValues, queryName: 'F1' };

describe('getQueryNames', () => {
	it('lists the Query Builder queries and formulas', () => {
		const query: Query = {
			...tracesQuery,
			builder: { ...tracesQuery.builder, queryFormulas: [formula] },
		};

		expect(getQueryNames(query)).toStrictEqual([
			{ label: 'A', value: 'A' },
			{ label: 'F1', value: 'F1' },
		]);
	});

	it('lists the AI queries and formulas from the AI slot', () => {
		const query: Query = {
			...tracesQuery,
			queryType: EQueryType.AI_QUERY_BUILDER,
			builder: { ...tracesQuery.builder, queryData: [] },
			builder_ai_query: {
				...initialQueryAIWithType.builder,
				queryFormulas: [formula],
			},
		};

		expect(getQueryNames(query)).toStrictEqual([
			{ label: 'A', value: 'A' },
			{ label: 'F1', value: 'F1' },
		]);
	});

	it('lists nothing for an AI query whose AI slot is missing', () => {
		const query: Query = {
			...tracesQuery,
			queryType: EQueryType.AI_QUERY_BUILDER,
		};

		expect(getQueryNames(query)).toStrictEqual([]);
	});
});
