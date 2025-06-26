import { cloneDeep } from 'lodash-es';
import { OrderByPayload, Query } from 'types/api/queryBuilder/queryBuilderData';

/**
 * Transforms a query by modifying the orderBy field
 * @param query - The original query object
 * @param customOrderBy - Array of orderBy items to replace the existing ones
 * @returns A new query object with the modified orderBy
 */
export const transformQueryOrderBy = (
	query: Query,
	customOrderBy: OrderByPayload[],
): Query => {
	// Create a deep copy of the query
	const transformedQuery: Query = cloneDeep(query);

	// Update the orderBy for each query in the builder
	if (transformedQuery.builder?.queryData) {
		transformedQuery.builder.queryData = transformedQuery.builder.queryData.map(
			(query) => ({
				...query,
				orderBy: customOrderBy,
			}),
		);
	}

	return transformedQuery;
};
