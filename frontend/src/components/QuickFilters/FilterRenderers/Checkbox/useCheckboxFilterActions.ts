import {
	IQuickFiltersConfig,
	QuickFilterChangeEventData,
	QuickFiltersSource,
} from 'components/QuickFilters/types';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import {
	applyCheckboxToggle,
	clearFilterFromQuery,
} from './checkboxFilterQuery';
import { CheckedState } from '../../types';
import { SectionType } from './v2/itemRules';
import { isFunction } from 'utils/valueUtils';

interface UseCheckboxFilterActionsProps {
	filter: IQuickFiltersConfig;
	source: QuickFiltersSource;
	attributeValues: string[];
	activeQueryIndex: number;
	onFilterChange?: ((query: Query) => void) | null;
	onQuickFilterChange?: (data: QuickFilterChangeEventData) => void;
}

interface UseCheckboxFilterActionsReturn {
	onChange: (
		value: string,
		checked: boolean,
		isOnlyOrAllClicked: boolean,
		previousState?: CheckedState,
		sectionType?: SectionType,
	) => void;
	onClear: () => void;
}

/**
 * Wires the pure checkbox query algebra to query-builder dispatch: the
 * caller-provided `onFilterChange` when present, otherwise a URL redirect.
 */
function useCheckboxFilterActions({
	filter,
	source,
	attributeValues,
	activeQueryIndex,
	onFilterChange,
	onQuickFilterChange,
}: UseCheckboxFilterActionsProps): UseCheckboxFilterActionsReturn {
	const { currentQuery, redirectWithQueryBuilderData } = useQueryBuilder();

	const dispatch = (query: Query): void => {
		if (onFilterChange && isFunction(onFilterChange)) {
			onFilterChange(query);
		} else {
			redirectWithQueryBuilderData(query);
		}
	};

	const onChange = (
		value: string,
		checked: boolean,
		isOnlyOrAllClicked: boolean,
		previousState?: CheckedState,
		sectionType?: SectionType,
	): void => {
		const updatedQuery = applyCheckboxToggle({
			currentQuery,
			activeQueryIndex,
			filter,
			source,
			attributeValues,
			value,
			checked,
			isOnlyOrAllClicked,
			previousState,
			sectionType,
		});

		dispatch(updatedQuery);

		if (onQuickFilterChange) {
			const queryData = updatedQuery.builder.queryData[activeQueryIndex];
			const expression = queryData?.filter?.expression || '';
			const filterItemKeys = (queryData?.filters?.items || [])
				.map((item) => item.key?.key)
				.filter((key): key is string => !!key);

			onQuickFilterChange({
				filterKey: filter.attributeKey.key,
				expression,
				filterItemKeys,
			});
		}
	};

	const onClear = (): void => {
		dispatch(clearFilterFromQuery({ currentQuery, filter, activeQueryIndex }));
	};

	return { onChange, onClear };
}

export default useCheckboxFilterActions;
