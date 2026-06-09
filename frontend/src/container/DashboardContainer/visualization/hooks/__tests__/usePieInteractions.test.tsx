import { act, renderHook } from '@testing-library/react';
import {
	getStoredSeriesVisibility,
	updateSeriesVisibilityToLocalStorage,
} from 'container/DashboardContainer/visualization/panels/utils/legendVisibilityUtils';
import type { MouseEvent } from 'react';

import { PieSlice } from '../../charts/types';
import { usePieInteractions } from '../usePieInteractions';

jest.mock(
	'container/DashboardContainer/visualization/panels/utils/legendVisibilityUtils',
);

const mockGetStored = getStoredSeriesVisibility as jest.MockedFunction<
	typeof getStoredSeriesVisibility
>;
const mockUpdateStored =
	updateSeriesVisibilityToLocalStorage as jest.MockedFunction<
		typeof updateSeriesVisibilityToLocalStorage
	>;

const DATA: PieSlice[] = [
	{ label: 'frontend', value: 100, color: '#a' },
	{ label: 'cart', value: 60, color: '#b' },
	{ label: 'checkout', value: 40, color: '#c' },
];

// Builds a fake legend click/move event: `e.target.closest('[data-legend-item-id]')`
// resolves to the item at `index`, and `e.target.dataset.isLegendMarker` flags marker clicks.
function legendEvent(
	index: number | null,
	isMarker = false,
): MouseEvent<HTMLDivElement> {
	const itemEl =
		index == null ? null : { dataset: { legendItemId: String(index) } };
	return {
		target: {
			closest: (): unknown => itemEl,
			dataset: { isLegendMarker: isMarker ? 'true' : undefined },
		},
	} as unknown as MouseEvent<HTMLDivElement>;
}

describe('usePieInteractions', () => {
	beforeEach(() => {
		mockGetStored.mockReturnValue(null);
		mockUpdateStored.mockReset();
	});

	it('starts with everything visible and nothing focused', () => {
		const { result } = renderHook(() => usePieInteractions(DATA));

		expect(result.current.visibleData).toStrictEqual(DATA);
		expect(result.current.legendItems.map((i) => i.show)).toStrictEqual([
			true,
			true,
			true,
		]);
		expect(result.current.focusedSeriesIndex).toBeNull();
		expect(result.current.active).toBeNull();
	});

	describe('marker click (toggle one)', () => {
		it('hides then unhides the clicked slice', () => {
			const { result } = renderHook(() => usePieInteractions(DATA, 'panel-1'));

			act(() => result.current.onLegendClick(legendEvent(1, true)));

			expect(result.current.visibleData).toStrictEqual([DATA[0], DATA[2]]);
			expect(result.current.legendItems[1].show).toBe(false);
			expect(mockUpdateStored).toHaveBeenLastCalledWith('panel-1', [
				{ label: 'frontend', show: true },
				{ label: 'cart', show: false },
				{ label: 'checkout', show: true },
			]);

			act(() => result.current.onLegendClick(legendEvent(1, true)));

			expect(result.current.visibleData).toStrictEqual(DATA);
			expect(result.current.legendItems[1].show).toBe(true);
		});
	});

	describe('label click (isolate / reset)', () => {
		it('isolates the clicked slice, then resets on a second click', () => {
			const { result } = renderHook(() => usePieInteractions(DATA));

			act(() => result.current.onLegendClick(legendEvent(0, false)));

			expect(result.current.visibleData).toStrictEqual([DATA[0]]);
			expect(result.current.legendItems.map((i) => i.show)).toStrictEqual([
				true,
				false,
				false,
			]);

			act(() => result.current.onLegendClick(legendEvent(0, false)));

			expect(result.current.visibleData).toStrictEqual(DATA);
		});
	});

	describe('hover', () => {
		it('focuses the hovered slice and clears on leave', () => {
			const { result } = renderHook(() => usePieInteractions(DATA));

			act(() => result.current.onLegendMouseMove(legendEvent(2)));
			expect(result.current.active).toStrictEqual(DATA[2]);
			expect(result.current.focusedSeriesIndex).toBe(2);

			act(() => result.current.onLegendMouseLeave());
			expect(result.current.active).toBeNull();
			expect(result.current.focusedSeriesIndex).toBeNull();
		});

		it('does not focus a hidden slice', () => {
			const { result } = renderHook(() => usePieInteractions(DATA));

			act(() => result.current.onLegendClick(legendEvent(1, true))); // hide cart
			act(() => result.current.onLegendMouseMove(legendEvent(1)));

			expect(result.current.active).toBeNull();
		});
	});

	describe('persistence', () => {
		it('does not write to storage when no id is provided', () => {
			const { result } = renderHook(() => usePieInteractions(DATA));
			act(() => result.current.onLegendClick(legendEvent(0, true)));
			expect(mockUpdateStored).not.toHaveBeenCalled();
		});

		it('rehydrates hidden slices from storage on mount (matched by label)', () => {
			mockGetStored.mockReturnValue([
				{ label: 'frontend', show: true },
				{ label: 'cart', show: false },
				{ label: 'checkout', show: true },
			]);

			const { result } = renderHook(() => usePieInteractions(DATA, 'panel-1'));

			expect(result.current.visibleData).toStrictEqual([DATA[0], DATA[2]]);
			expect(result.current.legendItems[1].show).toBe(false);
		});
	});
});
