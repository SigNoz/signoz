import {
	convertAggregationToExpression,
	convertFiltersToExpressionWithExistingQuery,
	convertHavingToExpression,
} from 'components/QueryBuilderV2/utils';
import {
	CompositeQueryAdapter,
	COMPOSITE_QUERY_KEY,
} from 'lib/compositeQuery/types';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

function migrateLegacyFormat(parsed: Query): Query {
	if (!parsed?.builder?.queryData) {
		return parsed;
	}
	const next = parsed;
	next.builder.queryData = parsed.builder.queryData.map((query) => {
		const existingExpression = query.filter?.expression || '';
		const convertedQuery = { ...query };

		const convertedFilter = convertFiltersToExpressionWithExistingQuery(
			query.filters || { items: [], op: 'AND' },
			existingExpression,
		);
		convertedQuery.filter = convertedFilter.filter;
		convertedQuery.filters = convertedFilter.filters;

		if (Array.isArray(query.having)) {
			convertedQuery.having = convertHavingToExpression(query.having);
		}

		if (!query.aggregations && query.aggregateOperator) {
			convertedQuery.aggregations = convertAggregationToExpression({
				aggregateOperator: query.aggregateOperator,
				aggregateAttribute: query.aggregateAttribute as BaseAutocompleteData,
				dataSource: query.dataSource,
				timeAggregation: query.timeAggregation,
				spaceAggregation: query.spaceAggregation,
				reduceTo: query.reduceTo,
				temporality: query.temporality,
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
			}) as any;
		}
		return convertedQuery;
	});
	return next;
}

export const jsonAdapter: CompositeQueryAdapter = {
	name: 'json(legacy)',
	encode: (query) => {
		const params = new URLSearchParams();
		params.set(COMPOSITE_QUERY_KEY, encodeURIComponent(JSON.stringify(query)));
		return params;
	},
	matches: () => true,
	decode: (params) => {
		const raw = params.get(COMPOSITE_QUERY_KEY) ?? '';
		const parsed: Query = JSON.parse(decodeURIComponent(raw.replace(/\+/g, ' ')));
		return migrateLegacyFormat(parsed);
	},
};
