import { renderHook } from '@testing-library/react';

import { useSectionedValues } from './useSectionedValues';

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

	it('no query at all → all items orderIndex 0, no badges', () => {
		const { result } = renderHook(() =>
			useSectionedValues({
				...baseInput,
				hasExistingQuery: false,
				isSomeFilterPresentForCurrentAttribute: false,
			}),
		);

		expect(result.current.sectionedItems).toHaveLength(3);
		result.current.sectionedItems.forEach((item) => {
			expect(item.orderIndex).toBe(0);
			expect(item.badge).toBeNull();
		});
	});

	it('has query, no filter for key → related values get related badge', () => {
		const { result } = renderHook(() =>
			useSectionedValues({
				...baseInput,
				hasExistingQuery: true,
				isSomeFilterPresentForCurrentAttribute: false,
			}),
		);

		const relatedItems = result.current.sectionedItems.filter(
			(item) => item.value === 'val1' || item.value === 'val2',
		);
		const otherItems = result.current.sectionedItems.filter(
			(item) => item.value === 'val3',
		);

		// Related values should have related badge
		relatedItems.forEach((item) => {
			expect(item.orderIndex).toBe(1);
			expect(item.badge?.key).toBe('related');
		});

		// Other values should have other badge
		otherItems.forEach((item) => {
			expect(item.orderIndex).toBe(2);
			expect(item.badge?.key).toBe('other');
		});
	});

	it('has query + filter for key, selected value → selected at top, no badge', () => {
		const { result } = renderHook(() =>
			useSectionedValues({
				...baseInput,
				hasExistingQuery: true,
				isSomeFilterPresentForCurrentAttribute: true,
				currentFilterState: { val1: true, val2: false, val3: false },
			}),
		);

		const selectedItem = result.current.sectionedItems.find(
			(item) => item.value === 'val1',
		);

		expect(selectedItem?.orderIndex).toBe(0);
		expect(selectedItem?.badge).toBeNull();
	});

	it('has query + filter for key, NOT IN operator → not_in values get badge', () => {
		const { result } = renderHook(() =>
			useSectionedValues({
				...baseInput,
				hasExistingQuery: true,
				isSomeFilterPresentForCurrentAttribute: true,
				isNotInOperator: true,
				currentFilterState: { val1: false, val2: true, val3: true },
			}),
		);

		// val1 is unchecked + NOT IN = excluded
		const excludedItem = result.current.sectionedItems.find(
			(item) => item.value === 'val1',
		);

		expect(excludedItem?.orderIndex).toBe(0);
		expect(excludedItem?.badge?.key).toBe('not_in');
	});

	it('items with same orderIndex sorted alphabetically', () => {
		const { result } = renderHook(() =>
			useSectionedValues({
				...baseInput,
				relatedValues: ['zebra', 'apple', 'mango'],
				allValues: ['zebra', 'apple', 'mango'],
				hasExistingQuery: false,
				isSomeFilterPresentForCurrentAttribute: false,
			}),
		);

		// All items have orderIndex 0, should be sorted alphabetically
		const values = result.current.sectionedItems.map((item) => item.value);
		expect(values).toStrictEqual(['apple', 'mango', 'zebra']);
	});
});
