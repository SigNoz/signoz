import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { removeManagedClauses } from '../Checkbox/checkboxFilterQuery';
import { isKeyMatch } from '../Checkbox/utils';

/**
 * Returns a new query with this filter's clauses for the attribute key removed from
 * the active query, both from the structured filter items and the raw expression.
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
			queryData: currentQuery.builder.queryData.map((item, idx) => {
				if (idx !== activeQueryIndex) {
					return item;
				}
				return {
					...item,
					filter: {
						expression: removeManagedClauses(
							item.filter?.expression ?? '',
							filterKey,
						),
					},
					filters: {
						...item.filters,
						items:
							item.filters?.items?.filter(
								(fil) => !isKeyMatch(fil.key?.key, filterKey),
							) || [],
						op: item.filters?.op || 'AND',
					},
				};
			}),
		},
	};
}
