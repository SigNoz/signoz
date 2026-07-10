import { renderHook } from '@testing-library/react';

import { SectionType } from '../itemRules';
import { useSectionedValues, SectionedItem } from '../useSectionedValues';

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

	describe('filtered results from API', () => {
		it('keeps items in their natural sections with filtered API results', () => {
			const { result } = renderHook(() =>
				useSectionedValues({
					...baseInput,
					hasExistingQuery: true,
					isSomeFilterPresentForCurrentAttribute: true,
					currentFilterState: { val1: true },
				}),
			);

			const sectionTypes = result.current.sections.map((s) => s.type);
			expect(sectionTypes).toContain(SectionType.SELECTED);
			expect(sectionTypes).toContain(SectionType.RELATED);
		});

		it('returns empty sections array when no values', () => {
			const { result } = renderHook(() =>
				useSectionedValues({
					...baseInput,
					relatedValues: [],
					allValues: [],
					hasExistingQuery: true,
					isSomeFilterPresentForCurrentAttribute: false,
					currentFilterState: {},
				}),
			);

			expect(result.current.sections).toHaveLength(0);
			expect(result.current.totalCount).toBe(0);
		});

		it('non-related items go to ALL_VALUES section', () => {
			const { result } = renderHook(() =>
				useSectionedValues({
					...baseInput,
					relatedValues: [],
					allValues: ['other1', 'other2', 'other3'],
					hasExistingQuery: true,
					isSomeFilterPresentForCurrentAttribute: false,
				}),
			);

			const allValuesSection = result.current.sections.find(
				(s) => s.type === SectionType.ALL_VALUES,
			);
			expect(allValuesSection?.items).toHaveLength(3);
		});

		it('handles non-overlapping relatedValues and allValues correctly', () => {
			// This tests the bug where different pod names in relatedValues vs allValues
			// caused all items to go to ALL_VALUES instead of RELATED
			const { result } = renderHook(() =>
				useSectionedValues({
					...baseInput,
					relatedValues: ['pod-a-1', 'pod-b-1', 'pod-c-1'],
					allValues: ['pod-a-2', 'pod-b-2', 'pod-c-2'],
					hasExistingQuery: true,
					isSomeFilterPresentForCurrentAttribute: false,
				}),
			);

			const sectionTypes = result.current.sections.map((s) => s.type);

			// RELATED section should exist with relatedValues items
			expect(sectionTypes).toContain(SectionType.RELATED);
			const relatedSection = result.current.sections.find(
				(s) => s.type === SectionType.RELATED,
			);
			expect(relatedSection?.items).toHaveLength(3);
			expect(relatedSection?.items.map((i) => i.value)).toStrictEqual(
				expect.arrayContaining(['pod-a-1', 'pod-b-1', 'pod-c-1']),
			);

			// ALL_VALUES section should exist with allValues items
			expect(sectionTypes).toContain(SectionType.ALL_VALUES);
			const allValuesSection = result.current.sections.find(
				(s) => s.type === SectionType.ALL_VALUES,
			);
			expect(allValuesSection?.items).toHaveLength(3);
			expect(allValuesSection?.items.map((i) => i.value)).toStrictEqual(
				expect.arrayContaining(['pod-a-2', 'pod-b-2', 'pod-c-2']),
			);
		});
	});

	describe('section ordering', () => {
		it('sections appear in order: SELECTED → RELATED → ALL_VALUES', () => {
			const { result } = renderHook(() =>
				useSectionedValues({
					...baseInput,
					relatedValues: ['related1'],
					allValues: ['all1'],
					hasExistingQuery: true,
					isSomeFilterPresentForCurrentAttribute: true,
					currentFilterState: { selected1: true },
				}),
			);

			const sectionTypes = result.current.sections.map((s) => s.type);

			// Verify order
			const selectedIdx = sectionTypes.indexOf(SectionType.SELECTED);
			const relatedIdx = sectionTypes.indexOf(SectionType.RELATED);
			const allValuesIdx = sectionTypes.indexOf(SectionType.ALL_VALUES);

			expect(selectedIdx).toBeLessThan(relatedIdx);
			expect(relatedIdx).toBeLessThan(allValuesIdx);
		});

		it('RELATED section appears before ALL_VALUES even with many items', () => {
			const { result } = renderHook(() =>
				useSectionedValues({
					...baseInput,
					relatedValues: ['r1', 'r2', 'r3', 'r4', 'r5'],
					allValues: ['a1', 'a2', 'a3', 'a4', 'a5'],
					hasExistingQuery: true,
					isSomeFilterPresentForCurrentAttribute: false,
					visibleItemsCount: 100,
				}),
			);

			const sectionTypes = result.current.sections.map((s) => s.type);

			expect(sectionTypes[0]).toBe(SectionType.RELATED);
			expect(sectionTypes[1]).toBe(SectionType.ALL_VALUES);
		});

		it('visibleItemsCount limits total items across sections', () => {
			const { result } = renderHook(() =>
				useSectionedValues({
					...baseInput,
					relatedValues: ['r1', 'r2', 'r3'],
					allValues: ['a1', 'a2', 'a3'],
					hasExistingQuery: true,
					isSomeFilterPresentForCurrentAttribute: false,
					visibleItemsCount: 4,
				}),
			);

			const totalItems = result.current.sections.reduce(
				(sum, s) => sum + s.items.length,
				0,
			);
			expect(totalItems).toBe(4);

			// RELATED section should get priority (3 items)
			const relatedSection = result.current.sections.find(
				(s) => s.type === SectionType.RELATED,
			);
			expect(relatedSection?.items).toHaveLength(3);

			// ALL_VALUES gets remaining (1 item)
			const allValuesSection = result.current.sections.find(
				(s) => s.type === SectionType.ALL_VALUES,
			);
			expect(allValuesSection?.items).toHaveLength(1);
		});
	});
});
