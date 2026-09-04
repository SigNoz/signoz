import { useMemo } from 'react';
import type { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import type { BuilderQuery } from 'types/api/v5/queryRange';

/**
 * Builds a record keyed by builder-query name to that query's groupBy keys
 * in the V1 `BaseAutocompleteData` shape — the shape `TimeSeries` and the
 * tooltip plugin consume. Conversion from v5 `GroupByKey` lives at this one
 * call site that needs the V1 shape; the rest of V2 panel code stays on
 * v5 types.
 */
export function useGroupByPerQuery(
	builderQueries: BuilderQuery[],
): Record<string, BaseAutocompleteData[]> {
	return useMemo(() => {
		const result: Record<string, BaseAutocompleteData[]> = {};
		builderQueries.forEach((q) => {
			if (!q.name) {
				return;
			}
			result[q.name] = (q.groupBy ?? []).map((g) => ({
				key: g.name,
				dataType: g.fieldDataType as BaseAutocompleteData['dataType'],
				type: (g.fieldContext as BaseAutocompleteData['type']) ?? '',
				id: '',
			}));
		});
		return result;
	}, [builderQueries]);
}
