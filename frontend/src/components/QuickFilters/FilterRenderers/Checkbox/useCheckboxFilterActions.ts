import {
	IQuickFiltersConfig,
	QuickFiltersSource,
} from 'components/QuickFilters/types';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { isFunction } from 'lodash-es';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import {
	applyCheckboxToggle,
	clearFilterFromQuery,
} from './checkboxFilterQuery';

interface UseCheckboxFilterActionsProps {
	filter: IQuickFiltersConfig;
	source: QuickFiltersSource;
	attributeValues: string[];
	activeQueryIndex: number;
	onFilterChange?: ((query: Query) => void) | null;
}

interface UseCheckboxFilterActionsReturn {
	onChange: (
		value: string,
		checked: boolean,
		isOnlyOrAllClicked: boolean,
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
	): void => {
		dispatch(
			applyCheckboxToggle({
				currentQuery,
				activeQueryIndex,
				filter,
				source,
				attributeValues,
				value,
				checked,
				isOnlyOrAllClicked,
			}),
		);
	};

	const onClear = (): void => {
		dispatch(clearFilterFromQuery({ currentQuery, filter, activeQueryIndex }));
	};

	return { onChange, onClear };
}

export default useCheckboxFilterActions;
