import { removeKeysFromExpression } from 'components/QueryBuilderV2/utils';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { getKeySpellings, isKeyMatch } from '../Checkbox/utils';

/**
 * Returns a new query with this filter's clauses for the attribute key removed from
 * the active query, both from the structured filter items and the raw expression.
 * `operators` limits which expression clauses are removed; omit to remove every
 * clause on the key (e.g. duration's >= / <=).
 */
export function clearFilterFromQuery({
	currentQuery,
	filterKey,
	activeQueryIndex,
	operators,
}: {
	currentQuery: Query;
	filterKey: string;
	activeQueryIndex: number;
	operators?: string[];
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
						expression: removeKeysFromExpression(
							item.filter?.expression ?? '',
							getKeySpellings(filterKey),
							false,
							operators,
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
