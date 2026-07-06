import { useMemo } from 'react';

import { BadgeConfig, deriveItems, SectionType } from './itemRules';
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
	section: SectionType;
	badge: BadgeConfig | null;
	checkedState: CheckedState;
}

export interface Section {
	type: SectionType;
	items: SectionedItem[];
}

interface SectionedValuesOutput {
	sections: Section[];
	totalCount: number;
}

const SECTION_ORDER: SectionType[] = [
	SectionType.SELECTED,
	SectionType.RELATED,
	SectionType.ALL_VALUES,
	SectionType.SEARCH_RESULTS,
];

function buildSelectedSet(
	currentFilterState: Record<string, boolean>,
	isSomeFilterPresentForCurrentAttribute: boolean,
	isNotInOperator: boolean,
): Set<string> {
	const selectedSet = new Set<string>();
	if (!isSomeFilterPresentForCurrentAttribute) {
		return selectedSet;
	}

	for (const [val, isChecked] of Object.entries(currentFilterState)) {
		// NOT IN: unchecked = explicitly excluded
		// IN: checked = explicitly selected
		const shouldAdd = isNotInOperator ? !isChecked : isChecked;
		if (shouldAdd) {
			selectedSet.add(val);
		}
	}
	return selectedSet;
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
		const valuesToProcess = searchText ? allValues : allUniqueValues;

		const selectedSet = buildSelectedSet(
			currentFilterState,
			isSomeFilterPresentForCurrentAttribute,
			isNotInOperator,
		);

		// Include selected values at top - may not be in API response
		const finalValues = [
			...new Set([...Array.from(selectedSet), ...valuesToProcess]),
		];
		const relatedSet = new Set(relatedValues);

		return deriveItems(finalValues, relatedSet, selectedSet, {
			isNotInOperator,
			hasExistingQuery,
			hasFilterForThisKey: isSomeFilterPresentForCurrentAttribute,
		});
	}, [
		relatedValues,
		allValues,
		currentFilterState,
		isSomeFilterPresentForCurrentAttribute,
		isNotInOperator,
		hasExistingQuery,
		searchText,
	]);

	const sections = useMemo(() => {
		// Group items by section
		const sectionMap = new Map<SectionType, SectionedItem[]>();
		for (const sectionType of SECTION_ORDER) {
			sectionMap.set(sectionType, []);
		}

		const isSearching = !!searchText;

		for (const item of items) {
			if (isSearching) {
				// During search: only show SELECTED if there's an actual filter for this key
				// Otherwise all items go to SEARCH_RESULTS
				const keepInSelected =
					isSomeFilterPresentForCurrentAttribute &&
					item.section === SectionType.SELECTED;

				if (keepInSelected) {
					sectionMap.get(SectionType.SELECTED)?.push(item);
				} else {
					sectionMap.get(SectionType.SEARCH_RESULTS)?.push(item);
				}
			} else {
				sectionMap.get(item.section)?.push(item);
			}
		}

		// Sort items within each section alphabetically
		for (const sectionItems of sectionMap.values()) {
			sectionItems.sort((a, b) => a.value.localeCompare(b.value));
		}

		// Apply visibleItemsCount across all sections
		let remaining = visibleItemsCount;
		const result: Section[] = [];

		for (const sectionType of SECTION_ORDER) {
			const sectionItems = sectionMap.get(sectionType) || [];

			// Always include SEARCH_RESULTS when searching (for loading/empty feedback)
			const forceInclude =
				isSearching && sectionType === SectionType.SEARCH_RESULTS;

			if (sectionItems.length === 0 && !forceInclude) {
				continue;
			}

			const itemsToTake = Math.min(sectionItems.length, remaining);
			if (itemsToTake === 0 && !forceInclude) {
				break;
			}

			result.push({
				type: sectionType,
				items: sectionItems.slice(0, itemsToTake),
			});
			remaining -= itemsToTake;
		}

		return result;
	}, [items, searchText, visibleItemsCount]);

	return { sections, totalCount: items.length };
}
