import { renderHook } from '@testing-library/react';

import { SectionType } from './itemRules';
import { useSectionedValues, SectionedItem } from './useSectionedValues';

function flattenSections(
	sections: { type: SectionType; items: SectionedItem[] }[],
): SectionedItem[] {
	return sections.flatMap((s) => s.items);
}

describe('useSectionedValues', () => {
	const baseInput = {
		relatedValues: ['val1', 'val2'],
		allValues: ['val1', 'val2', 'val3'],
		currentFilterState: {},
		isSomeFilterPresentForCurrentAttribute: false,
		isNotInOperator: false,
		hasExistingQuery: false,
		searchText: '',
		visibleItemsCount: 10,
	};

	it('no query at all → all items in selected section, no badges', () => {
		const { result } = renderHook(() =>
			useSectionedValues({
				...baseInput,
				hasExistingQuery: false,
				isSomeFilterPresentForCurrentAttribute: false,
			}),
		);

		expect(result.current.sections).toHaveLength(1);
		expect(result.current.sections[0].type).toBe(SectionType.SELECTED);
		expect(result.current.sections[0].items).toHaveLength(3);
		result.current.sections[0].items.forEach((item) => {
			expect(item.badge).toBeNull();
		});
	});

	it('has query, no filter for key → related and all_values sections', () => {
		const { result } = renderHook(() =>
			useSectionedValues({
				...baseInput,
				hasExistingQuery: true,
				isSomeFilterPresentForCurrentAttribute: false,
			}),
		);

		const allItems = flattenSections(result.current.sections);
		const relatedItems = allItems.filter(
			(item) => item.value === 'val1' || item.value === 'val2',
		);
		const otherItems = allItems.filter((item) => item.value === 'val3');

		// Related values should be in related section, checked
		relatedItems.forEach((item) => {
			expect(item.section).toBe(SectionType.RELATED);
			expect(item.checkedState).toBe('checked');
		});

		// Other values should be in all_values section, unchecked
		otherItems.forEach((item) => {
			expect(item.section).toBe(SectionType.ALL_VALUES);
			expect(item.checkedState).toBe('unchecked');
		});
	});

	it('has query + filter for key, selected value → in selected section', () => {
		const { result } = renderHook(() =>
			useSectionedValues({
				...baseInput,
				hasExistingQuery: true,
				isSomeFilterPresentForCurrentAttribute: true,
				currentFilterState: { val1: true, val2: false, val3: false },
			}),
		);

		const allItems = flattenSections(result.current.sections);
		const selectedItem = allItems.find((item) => item.value === 'val1');

		expect(selectedItem?.section).toBe(SectionType.SELECTED);
		expect(selectedItem?.badge).toBeNull();
	});

	it('has query + filter for key, NOT IN operator → excluded values in selected section, no badge', () => {
		const { result } = renderHook(() =>
			useSectionedValues({
				...baseInput,
				hasExistingQuery: true,
				isSomeFilterPresentForCurrentAttribute: true,
				isNotInOperator: true,
				currentFilterState: { val1: false, val2: true, val3: true },
			}),
		);

		const allItems = flattenSections(result.current.sections);
		// val1 is unchecked + NOT IN = excluded
		const excludedItem = allItems.find((item) => item.value === 'val1');

		expect(excludedItem?.section).toBe(SectionType.SELECTED);
		expect(excludedItem?.badge).toBeNull();
		expect(excludedItem?.checkedState).toBe('unchecked');
	});

	it('items within same section sorted alphabetically', () => {
		const { result } = renderHook(() =>
			useSectionedValues({
				...baseInput,
				relatedValues: ['zebra', 'apple', 'mango'],
				allValues: ['zebra', 'apple', 'mango'],
				hasExistingQuery: false,
				isSomeFilterPresentForCurrentAttribute: false,
			}),
		);

		// All items have section selected, should be sorted alphabetically
		const allItems = flattenSections(result.current.sections);
		const values = allItems.map((item) => item.value);
		expect(values).toStrictEqual(['apple', 'mango', 'zebra']);
	});

	describe('search mode', () => {
		it('routes selected items to SELECTED, others to SEARCH_RESULTS', () => {
			const { result } = renderHook(() =>
				useSectionedValues({
					...baseInput,
					hasExistingQuery: true,
					isSomeFilterPresentForCurrentAttribute: true,
					currentFilterState: { val1: true },
					searchText: 'val',
				}),
			);

			const sectionTypes = result.current.sections.map((s) => s.type);
			expect(sectionTypes).toContain(SectionType.SELECTED);
			expect(sectionTypes).toContain(SectionType.SEARCH_RESULTS);
			expect(sectionTypes).not.toContain(SectionType.RELATED);
			expect(sectionTypes).not.toContain(SectionType.ALL_VALUES);
		});

		it('always includes SEARCH_RESULTS when searching for loading/empty feedback', () => {
			// When there are no items at all, show empty SEARCH_RESULTS
			const { result: emptyResult } = renderHook(() =>
				useSectionedValues({
					...baseInput,
					relatedValues: [],
					allValues: [],
					hasExistingQuery: true,
					isSomeFilterPresentForCurrentAttribute: false,
					currentFilterState: {},
					searchText: 'xyz',
				}),
			);

			const emptySearchResults = emptyResult.current.sections.find(
				(s) => s.type === SectionType.SEARCH_RESULTS,
			);
			expect(emptySearchResults).toBeDefined();
			expect(emptySearchResults?.items).toHaveLength(0);

			// When items exist in SELECTED, still show empty SEARCH_RESULTS for feedback
			const { result: withSelectedResult } = renderHook(() =>
				useSectionedValues({
					...baseInput,
					relatedValues: [],
					allValues: ['selected-val'],
					hasExistingQuery: true,
					isSomeFilterPresentForCurrentAttribute: true,
					currentFilterState: { 'selected-val': true },
					searchText: 'nomatch',
				}),
			);

			const sectionTypes = withSelectedResult.current.sections.map((s) => s.type);
			expect(sectionTypes).toContain(SectionType.SELECTED);
			expect(sectionTypes).toContain(SectionType.SEARCH_RESULTS);
		});

		it('non-selected items go to SEARCH_RESULTS during search', () => {
			const { result } = renderHook(() =>
				useSectionedValues({
					...baseInput,
					relatedValues: [],
					allValues: ['other1', 'other2', 'other3'],
					hasExistingQuery: true,
					isSomeFilterPresentForCurrentAttribute: false,
					searchText: 'search',
				}),
			);

			const searchResultsSection = result.current.sections.find(
				(s) => s.type === SectionType.SEARCH_RESULTS,
			);
			// All items go to SEARCH_RESULTS (no filter = no selected)
			expect(searchResultsSection?.items).toHaveLength(3);
		});
	});
});
