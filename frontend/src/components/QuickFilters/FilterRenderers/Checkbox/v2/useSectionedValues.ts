import { useMemo } from 'react';

import { BadgeConfig, deriveItems } from './itemRules';
import { CheckedState } from '../../../types';

interface SectionedValuesInput {
	relatedValues: string[];
	allValues: string[];
	currentFilterState: Record<string, boolean>;
	isSomeFilterPresentForCurrentAttribute: boolean;
	isNotInOperator: boolean;
	hasExistingQuery: boolean;
	searchText: string;
	visibleItemsCount: number;
}

export interface SectionedItem {
	value: string;
	orderIndex: number;
	badge: BadgeConfig | null;
	checkedState: CheckedState;
}

interface SectionedValuesOutput {
	sectionedItems: SectionedItem[];
	totalCount: number;
}

export function useSectionedValues({
	relatedValues,
	allValues,
	currentFilterState,
	isSomeFilterPresentForCurrentAttribute,
	isNotInOperator,
	hasExistingQuery,
	searchText,
	visibleItemsCount,
}: SectionedValuesInput): SectionedValuesOutput {
	const items = useMemo(() => {
		const allUniqueValues = Array.from(new Set([...relatedValues, ...allValues]));

		// When searching, only use allValues (API filtered)
		const valuesToProcess = searchText ? allValues : allUniqueValues;

		// Build selected set based on operator
		// Only populate when filter exists for this key
		const selectedSet = new Set<string>();
		if (isSomeFilterPresentForCurrentAttribute) {
			for (const [val, isChecked] of Object.entries(currentFilterState)) {
				if (isNotInOperator) {
					// NOT IN: unchecked = explicitly excluded
					if (!isChecked) {
						selectedSet.add(val);
					}
				} else {
					// IN: checked = explicitly selected
					if (isChecked) {
						selectedSet.add(val);
					}
				}
			}
		}

		// Always include selected values at top - they may not be in API response
		// (e.g., NOT IN filter excludes them from results)
		const finalValues = [
			...new Set([...Array.from(selectedSet), ...valuesToProcess]),
		];

		const relatedSet = new Set(relatedValues);

		const derived = deriveItems(finalValues, relatedSet, selectedSet, {
			isNotInOperator,
			hasExistingQuery,
			hasFilterForThisKey: isSomeFilterPresentForCurrentAttribute,
		});

		return derived.sort(
			(a, b) => a.orderIndex - b.orderIndex || a.value.localeCompare(b.value),
		);
	}, [
		relatedValues,
		allValues,
		currentFilterState,
		isSomeFilterPresentForCurrentAttribute,
		isNotInOperator,
		hasExistingQuery,
		searchText,
	]);

	const sectionedItems = useMemo(
		() => items.slice(0, visibleItemsCount),
		[items, visibleItemsCount],
	);

	return { sectionedItems, totalCount: items.length };
}
