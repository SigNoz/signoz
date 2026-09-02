import { removeKeysFromExpression } from 'components/QueryBuilderV2/utils';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { isKeyMatch } from '../Checkbox/utils';

/**
 * Returns a new query with every clause for this attribute key removed, both
 * from the structured filter items and the raw filter expression.
 */
export function clearFilterFromQuery({
	currentQuery,
	filterKey,
	activeQueryIndex,
}: {
	currentQuery: Query;
	filterKey: string;
	activeQueryIndex: number;
}): Query {
	return {
		...currentQuery,
		builder: {
			...currentQuery.builder,
			queryData: currentQuery.builder.queryData.map((item, idx) => ({
				...item,
				filter: {
					expression: removeKeysFromExpression(item.filter?.expression ?? '', [
						filterKey,
					]),
				},
				filters: {
					...item.filters,
					items:
						idx === activeQueryIndex
							? item.filters?.items?.filter(
									(fil) => !isKeyMatch(fil.key?.key, filterKey),
								) || []
							: [...(item.filters?.items || [])],
					op: item.filters?.op || 'AND',
				},
			})),
		},
	};
}
