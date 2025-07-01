import { cloneDeep } from 'lodash-es';
import { IBuilderQuery, Query } from 'types/api/queryBuilder/queryBuilderData';

/**
 * Transforms a query by modifying specific fields in the builder queries
 * @param query - The original query object
 * @param fieldOverrides - Partial object containing fields to override in each builder query
 * @returns A new query object with the modified fields
 */
export const transformBuilderQueryFields = (
	query: Query,
	fieldOverrides: Partial<IBuilderQuery>,
): Query => {
	// Create a deep copy of the query
	const transformedQuery: Query = cloneDeep(query);

	// Update the specified fields for each query in the builder
	if (transformedQuery.builder?.queryData) {
		transformedQuery.builder.queryData = transformedQuery.builder.queryData.map(
			(queryItem) => ({
				...queryItem,
				...fieldOverrides,
			}),
		);
	}

	return transformedQuery;
};
