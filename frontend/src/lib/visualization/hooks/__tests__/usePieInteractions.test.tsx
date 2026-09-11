import { act, renderHook } from '@testing-library/react';
import {
	getStoredSeriesVisibility,
	updateSeriesVisibilityToLocalStorage,
} from 'lib/visualization/panels/utils/legendVisibilityUtils';

import { PieSlice } from 'lib/visualization/charts/types';
import { usePieInteractions } from 'lib/visualization/hooks/usePieInteractions';

jest.mock('lib/visualization/panels/utils/legendVisibilityUtils');

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

	describe('row toggle', () => {
		it('hides then unhides the clicked slice', () => {
			const { result } = renderHook(() => usePieInteractions(DATA, 'panel-1'));

			act(() => result.current.onToggleSeries(1));

			expect(result.current.visibleData).toStrictEqual([DATA[0], DATA[2]]);
			expect(result.current.legendItems[1].show).toBe(false);
			expect(mockUpdateStored).toHaveBeenLastCalledWith('panel-1', [
				{ label: 'frontend', show: true },
				{ label: 'cart', show: false },
				{ label: 'checkout', show: true },
			]);

			act(() => result.current.onToggleSeries(1));

			expect(result.current.visibleData).toStrictEqual(DATA);
			expect(result.current.legendItems[1].show).toBe(true);
		});
	});

	describe('the last slice showing', () => {
		it('cannot be hidden', () => {
			const { result } = renderHook(() => usePieInteractions(DATA));

			act(() => result.current.onShowOnlySeries(0));
			act(() => result.current.onToggleSeries(0));

			// An empty donut is never a state worth reaching.
			expect(result.current.visibleData).toStrictEqual([DATA[0]]);
		});
	});

	describe('Only', () => {
		it('isolates the slice', () => {
			const { result } = renderHook(() => usePieInteractions(DATA));

			act(() => result.current.onShowOnlySeries(0));

			expect(result.current.visibleData).toStrictEqual([DATA[0]]);
			expect(result.current.legendItems.map((i) => i.show)).toStrictEqual([
				true,
				false,
				false,
			]);
		});

		it('switches the isolation to another slice', () => {
			const { result } = renderHook(() => usePieInteractions(DATA));

			act(() => result.current.onShowOnlySeries(0));
			act(() => result.current.onShowOnlySeries(2));

			expect(result.current.visibleData).toStrictEqual([DATA[2]]);
		});
	});

	describe('All', () => {
		it('brings every hidden slice back', () => {
			const { result } = renderHook(() => usePieInteractions(DATA));

			act(() => result.current.onShowOnlySeries(0));
			act(() => result.current.onShowAllSeries());

			expect(result.current.visibleData).toStrictEqual(DATA);
		});
	});

	describe('hover', () => {
		it('focuses the hovered slice and clears on leave', () => {
			const { result } = renderHook(() => usePieInteractions(DATA));

			act(() => result.current.onHoverSeries(2));
			expect(result.current.active).toStrictEqual(DATA[2]);
			expect(result.current.focusedSeriesIndex).toBe(2);

			act(() => result.current.onHoverSeries(null));
			expect(result.current.active).toBeNull();
			expect(result.current.focusedSeriesIndex).toBeNull();
		});

		it('drops the focus when the focused slice is hidden', () => {
			const { result } = renderHook(() => usePieInteractions(DATA));

			act(() => result.current.onHoverSeries(1));
			act(() => result.current.onToggleSeries(1));

			// Otherwise every remaining arc stays dimmed and the donut reads as an
			// isolation instead of one slice being excluded.
			expect(result.current.active).toBeNull();
			expect(result.current.focusedSeriesIndex).toBeNull();
		});

		it('does not focus a hidden slice', () => {
			const { result } = renderHook(() => usePieInteractions(DATA));

			act(() => result.current.onToggleSeries(1));
			act(() => result.current.onHoverSeries(1));

			expect(result.current.active).toBeNull();
		});
	});

	describe('persistence', () => {
		it('does not write to storage when no id is provided', () => {
			const { result } = renderHook(() => usePieInteractions(DATA));
			act(() => result.current.onToggleSeries(0));
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
