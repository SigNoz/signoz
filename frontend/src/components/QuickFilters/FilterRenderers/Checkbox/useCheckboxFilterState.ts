import { useMemo } from 'react';
import { IQuickFiltersConfig } from 'components/QuickFilters/types';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';

import { deriveCheckboxState } from './checkboxFilterQuery';
import { isKeyMatch } from './utils';

interface UseCheckboxFilterStateProps {
	filter: IQuickFiltersConfig;
	attributeValues: string[];
	activeQueryIndex: number;
}

interface UseCheckboxFilterStateReturn {
	currentFilterState: Record<string, boolean>;
	isFilterDisabled: boolean;
	isMultipleValuesTrueForTheKey: boolean;
}

/**
 * Reads the active query and derives the per-value checked state for this
 * attribute, whether the filter is disabled (same key used more than once in
 * the filter bar), and whether more than one value is currently selected.
 */
function useCheckboxFilterState({
	filter,
	attributeValues,
	activeQueryIndex,
}: UseCheckboxFilterStateProps): UseCheckboxFilterStateReturn {
	const { currentQuery } = useQueryBuilder();

	// derive the state of each filter key here and keep it in sync with current query
	const currentFilterState = useMemo(
		() =>
			deriveCheckboxState({
				attributeValues,
				filterItems:
					currentQuery?.builder.queryData?.[activeQueryIndex]?.filters?.items,
				filterKey: filter.attributeKey.key,
			}),
		[
			attributeValues,
			currentQuery?.builder.queryData,
			filter.attributeKey,
			activeQueryIndex,
		],
	);

	// disable the filter when there are multiple entries of the same attribute key present in the filter bar
	const isFilterDisabled = useMemo(
		() =>
			(currentQuery?.builder?.queryData?.[
				activeQueryIndex
			]?.filters?.items?.filter((item) =>
				isKeyMatch(item.key?.key, filter.attributeKey.key),
			)?.length || 0) > 1,
		[currentQuery?.builder?.queryData, activeQueryIndex, filter.attributeKey],
	);

	// whether the current filter has multiple values to its name in the key op value section
	const isMultipleValuesTrueForTheKey =
		Object.values(currentFilterState).filter((val) => val).length > 1;

	return {
		currentFilterState,
		isFilterDisabled,
		isMultipleValuesTrueForTheKey,
	};
}

export default useCheckboxFilterState;
