import {
	convertAggregationToExpression,
	convertFiltersToExpressionWithExistingQuery,
	convertHavingToExpression,
} from 'components/QueryBuilderV2/utils';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQuery, Query } from 'types/api/queryBuilder/queryBuilderData';

/**
 * Converts a composite query from the old format to the new format for each
 * query in builder.queryData:
 * - `filters` array -> `filter.expression`
 * - `having` array -> `having` expression object
 * - `aggregateOperator` -> `aggregations` object
 *
 * Queries already in the new format pass through unchanged.
 */
export const migrateCompositeQuery = (query: Query): Query => {
	if (!query?.builder?.queryData) {
		return query;
	}

	return {
		...query,
		builder: {
			...query.builder,
			queryData: query.builder.queryData.map((queryData) => {
				const existingExpression = queryData.filter?.expression || '';
				const convertedQuery = { ...queryData };

				const convertedFilter = convertFiltersToExpressionWithExistingQuery(
					queryData.filters || { items: [], op: 'AND' },
					existingExpression,
				);
				convertedQuery.filter = convertedFilter.filter;
				convertedQuery.filters = convertedFilter.filters;

				// Convert having if needed
				if (Array.isArray(queryData.having)) {
					convertedQuery.having = convertHavingToExpression(queryData.having);
				}

				// Convert aggregation if needed
				if (!queryData.aggregations && queryData.aggregateOperator) {
					convertedQuery.aggregations = convertAggregationToExpression({
						aggregateOperator: queryData.aggregateOperator,
						aggregateAttribute: queryData.aggregateAttribute as BaseAutocompleteData,
						dataSource: queryData.dataSource,
						timeAggregation: queryData.timeAggregation,
						spaceAggregation: queryData.spaceAggregation,
						reduceTo: queryData.reduceTo,
						temporality: queryData.temporality,
					}) as IBuilderQuery['aggregations']; // Narrow the mixed aggregation array to the union of homogeneous arrays
				}

				return convertedQuery;
			}),
		},
	};
};
