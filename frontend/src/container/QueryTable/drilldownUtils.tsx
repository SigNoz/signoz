import { convertFiltersToExpression } from 'components/QueryBuilderV2/utils';
import ROUTES from 'constants/routes';
import cloneDeep from 'lodash-es/cloneDeep';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { v4 as uuid } from 'uuid';

export function getBaseMeta(
	query: Query,
	filterKey: string,
): BaseAutocompleteData | null {
	const steps = query.builder.queryData;
	for (let i = 0; i < steps.length; i++) {
		const { groupBy } = steps[i];
		for (let j = 0; j < groupBy.length; j++) {
			if (groupBy[j].key === filterKey) {
				return groupBy[j];
			}
		}
	}
	return null;
}

export const getRoute = (key: string): string => {
	switch (key) {
		case 'view_logs':
			return ROUTES.LOGS_EXPLORER;
		case 'view_metrics':
			return ROUTES.METRICS_EXPLORER;
		case 'view_traces':
			return ROUTES.TRACES_EXPLORER;
		default:
			return '';
	}
};

export interface FilterData {
	filterKey: string;
	filterValue: string | number;
	operator: string;
}

// Helper function to avoid code duplication
function addFiltersToQuerySteps(
	query: Query,
	filters: FilterData[],
	queryName?: string,
): Query {
	// 1) clone so we don't mutate the original
	const q = cloneDeep(query);

	// 2) map over builder.queryData to return a new modified version
	q.builder.queryData = q.builder.queryData.map((step) => {
		// Only modify the step that matches the queryName (if provided)
		if (queryName && step.queryName !== queryName) {
			return step;
		}

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

export function addFilterToQuery(query: Query, filters: FilterData[]): Query {
	return addFiltersToQuerySteps(query, filters);
}

export const addFilterToSelectedQuery = (
	query: Query,
	filters: FilterData[],
	queryName: string,
): Query => addFiltersToQuerySteps(query, filters, queryName);
