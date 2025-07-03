import { convertFiltersToExpression } from 'components/QueryBuilderV2/utils';
import cloneDeep from 'lodash-es/cloneDeep';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { v4 as uuid } from 'uuid';

export interface FilterData {
	filterKey: string;
	filterValue: string | number;
	operator: string;
}

export function addFilterToQuery(query: Query, filters: FilterData[]): Query {
	// 1) clone so we don't mutate the original
	const q = cloneDeep(query);

	// 2) map over builder.queryData to return a new modified version
	q.builder.queryData = q.builder.queryData.map((step) => {
		// 3) build the new filters array
		const newFilters = {
			...step.filters,
			items: [...step.filters.items],
		};

		// Add each filter to the items array
		filters.forEach(({ filterKey, filterValue, operator }) => {
			// skip if this step doesn't group by our key
			const baseMeta = step.groupBy.find((g) => g.key === filterKey);
			if (!baseMeta) return;

			newFilters.items.push({
				id: uuid(),
				key: baseMeta,
				op: operator,
				value: filterValue,
			});
		});

		const newFilterExpression = convertFiltersToExpression(newFilters);

		console.log('BASE META', { filters, newFilters, ...newFilterExpression });

		// 4) return a new step object with updated filters
		return {
			...step,
			filters: newFilters,
			filter: newFilterExpression,
		};
	});

	return q;
}

// write a function to get filters to add to the query.
