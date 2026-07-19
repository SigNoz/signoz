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
	visibleItemsCount: number;
	relatedExclusions: string[];
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
];

export function buildSelectedSet(
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
	visibleItemsCount,
	relatedExclusions,
}: SectionedValuesInput): SectionedValuesOutput {
	const items = useMemo(() => {
		const selectedSet = buildSelectedSet(
			currentFilterState,
			isSomeFilterPresentForCurrentAttribute,
			isNotInOperator,
		);

		const exclusionSet = new Set(relatedExclusions);
		const effectiveRelatedValues = relatedValues.filter(
			(value) => !exclusionSet.has(value),
		);

		// Combine all values - API already filters both arrays by searchText
		const allUniqueValues = Array.from(
			new Set([...effectiveRelatedValues, ...allValues]),
		);

		// Include selected values at top - may not be in API response
		const finalValues = [
			...new Set([...Array.from(selectedSet), ...allUniqueValues]),
		];
		const relatedSet = new Set(effectiveRelatedValues);

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
		relatedExclusions,
	]);

	const sections = useMemo(() => {
		// Group items by section
		const sectionMap = new Map<SectionType, SectionedItem[]>();
		for (const sectionType of SECTION_ORDER) {
			sectionMap.set(sectionType, []);
		}

		for (const item of items) {
			sectionMap.get(item.section)?.push(item);
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

			if (sectionItems.length === 0) {
				continue;
			}

			const itemsToTake = Math.min(sectionItems.length, remaining);
			if (itemsToTake === 0) {
				break;
			}

			result.push({
				type: sectionType,
				items: sectionItems.slice(0, itemsToTake),
			});
			remaining -= itemsToTake;
		}

		return result;
	}, [items, visibleItemsCount]);

	return { sections, totalCount: items.length };
}
