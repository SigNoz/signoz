import { chooseAutocompleteFromCustomValue } from 'lib/newQueryBuilder/chooseAutocompleteFromCustomValue';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';

/** `query` with `keys` added to every builder query's group by, skipping keys it already has. */
export function withGroupBy(query: Query, keys: string[]): Query {
	return {
		...query,
		builder: {
			...query.builder,
			queryData: query.builder.queryData.map((data) => {
				const groupBy = data.groupBy ?? [];
				const has = new Set(groupBy.map((item) => item.key));
				return {
					...data,
					groupBy: [
						...groupBy,
						...keys
							.filter((key) => !has.has(key))
							.map((key) => chooseAutocompleteFromCustomValue([], key)),
					],
				};
			}),
		},
	};
}
