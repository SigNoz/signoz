import { useMemo, useState } from 'react';
import { IQuickFiltersConfig } from 'components/QuickFilters/types';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';

import { isKeyMatch } from './utils';

const DEFAULT_VISIBLE_ITEMS_COUNT = 10;

interface UseCheckboxDisclosureProps {
	filter: IQuickFiltersConfig;
	activeQueryIndex: number;
}

interface UseCheckboxDisclosureReturn {
	isOpen: boolean;
	isSomeFilterPresentForCurrentAttribute: boolean;
	visibleItemsCount: number;
	onToggleOpen: () => void;
	onShowMore: () => void;
}

/**
 * Owns the open/collapsed state of a checkbox filter section and how many
 * values are visible.
 *
 * Auto-opens when the query already has a clause for this attribute, otherwise
 * falls back to `filter.defaultOpen`. An explicit user toggle always wins.
 * Collapsing resets the visible count.
 */
function useCheckboxDisclosure({
	filter,
	activeQueryIndex,
}: UseCheckboxDisclosureProps): UseCheckboxDisclosureReturn {
	const { currentQuery } = useQueryBuilder();
	// null = no user action, true = user opened, false = user closed
	const [userToggleState, setUserToggleState] = useState<boolean | null>(null);
	const [visibleItemsCount, setVisibleItemsCount] = useState<number>(
		DEFAULT_VISIBLE_ITEMS_COUNT,
	);

	const isSomeFilterPresentForCurrentAttribute = useMemo(
		() =>
			!!currentQuery.builder.queryData?.[activeQueryIndex]?.filters?.items?.some(
				(item) => isKeyMatch(item.key?.key, filter.attributeKey.key),
			),
		[currentQuery.builder.queryData, activeQueryIndex, filter.attributeKey.key],
	);

	const isOpen = useMemo(() => {
		// If user explicitly toggled, respect that
		if (userToggleState !== null) {
			return userToggleState;
		}

		// Auto-open if this filter has active filters in the query
		if (isSomeFilterPresentForCurrentAttribute) {
			return true;
		}

		// Otherwise use default behavior (first 2 filters open)
		return filter.defaultOpen;
	}, [
		userToggleState,
		isSomeFilterPresentForCurrentAttribute,
		filter.defaultOpen,
	]);

	const onToggleOpen = (): void => {
		if (isOpen) {
			setUserToggleState(false);
			setVisibleItemsCount(DEFAULT_VISIBLE_ITEMS_COUNT);
		} else {
			setUserToggleState(true);
		}
	};

	const onShowMore = (): void => {
		setVisibleItemsCount((prev) => prev + DEFAULT_VISIBLE_ITEMS_COUNT);
	};

	return {
		isOpen,
		isSomeFilterPresentForCurrentAttribute,
		visibleItemsCount,
		onToggleOpen,
		onShowMore,
	};
}

export default useCheckboxDisclosure;
