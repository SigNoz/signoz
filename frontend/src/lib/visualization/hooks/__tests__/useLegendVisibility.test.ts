import { act, renderHook } from '@testing-library/react';
import { LegendAction } from 'lib/uPlotV2/components/types';
import {
	getStoredSeriesVisibility,
	updateSeriesVisibilityToLocalStorage,
} from 'lib/visualization/panels/utils/legendVisibilityUtils';

import { useLegendVisibility } from 'lib/visualization/hooks/useLegendVisibility';

jest.mock('lib/visualization/panels/utils/legendVisibilityUtils');

const mockGetStored = getStoredSeriesVisibility as jest.MockedFunction<
	typeof getStoredSeriesVisibility
>;
const mockUpdateStored =
	updateSeriesVisibilityToLocalStorage as jest.MockedFunction<
		typeof updateSeriesVisibilityToLocalStorage
	>;

const KEYS = ['cart', 'checkout', 'payments'];

type Options = Parameters<typeof useLegendVisibility>[0];

function render(
	options: Partial<Options> = {},
): ReturnType<
	typeof renderHook<ReturnType<typeof useLegendVisibility>, unknown>
> {
	return renderHook(() =>
		useLegendVisibility({ keys: KEYS, indexOffset: 1, ...options }),
	);
}

describe('useLegendVisibility', () => {
	beforeEach(() => {
		mockGetStored.mockReturnValue(null);
		mockUpdateStored.mockReset();
	});

	it('enables every entry to begin with', () => {
		const { result } = render();

		expect(result.current.visibleKeys).toStrictEqual(KEYS);
		expect(result.current.focusedSeriesIndex).toBeNull();
	});

	it('isolates an entry when the legend asks to show only it', () => {
		const { result } = render();

		act(() =>
			result.current.onLegendAction({
				type: LegendAction.SHOW_ONLY,
				seriesIndex: 2,
			}),
		);

		expect(result.current.visibleKeys).toStrictEqual(['checkout']);
	});

	it('restores every entry when the legend asks to show all', () => {
		const { result } = render();

		act(() =>
			result.current.onLegendAction({
				type: LegendAction.SHOW_ONLY,
				seriesIndex: 2,
			}),
		);
		act(() => result.current.onLegendAction({ type: LegendAction.SHOW_ALL }));

		expect(result.current.visibleKeys).toStrictEqual(KEYS);
	});

	it('moves the isolation to the entry named last', () => {
		const { result } = render();

		act(() =>
			result.current.onLegendAction({
				type: LegendAction.SHOW_ONLY,
				seriesIndex: 1,
			}),
		);
		act(() =>
			result.current.onLegendAction({
				type: LegendAction.SHOW_ONLY,
				seriesIndex: 3,
			}),
		);

		expect(result.current.visibleKeys).toStrictEqual(['payments']);
	});

	it('excludes just one entry when it is toggled off', () => {
		const { result } = render();

		act(() =>
			result.current.onLegendAction({
				type: LegendAction.TOGGLE,
				seriesIndex: 2,
			}),
		);

		expect(result.current.visibleKeys).toStrictEqual(['cart', 'payments']);
	});

	it('re-includes an entry when it is toggled again', () => {
		const { result } = render();

		act(() =>
			result.current.onLegendAction({
				type: LegendAction.TOGGLE,
				seriesIndex: 2,
			}),
		);
		act(() =>
			result.current.onLegendAction({
				type: LegendAction.TOGGLE,
				seriesIndex: 2,
			}),
		);

		expect(result.current.visibleKeys).toStrictEqual(KEYS);
	});

	it('excludes more than one entry', () => {
		const { result } = render();

		act(() =>
			result.current.onLegendAction({
				type: LegendAction.TOGGLE,
				seriesIndex: 1,
			}),
		);
		act(() =>
			result.current.onLegendAction({
				type: LegendAction.TOGGLE,
				seriesIndex: 3,
			}),
		);

		expect(result.current.visibleKeys).toStrictEqual(['checkout']);
	});

	it('keeps the last entry showing, as the uPlot legends do', () => {
		const { result } = render();

		KEYS.forEach((_, index) =>
			act(() =>
				result.current.onLegendAction({
					type: LegendAction.TOGGLE,
					seriesIndex: index + 1,
				}),
			),
		);

		expect(result.current.visibleKeys).toStrictEqual(['payments']);
	});

	it('ignores an action naming an entry that is not there', () => {
		const { result } = render();

		act(() =>
			result.current.onLegendAction({
				type: LegendAction.TOGGLE,
				seriesIndex: 99,
			}),
		);

		expect(result.current.visibleKeys).toStrictEqual(KEYS);
	});

	it('addresses entries from zero when there is no offset', () => {
		const { result } = render({ indexOffset: 0 });

		act(() =>
			result.current.onLegendAction({
				type: LegendAction.TOGGLE,
				seriesIndex: 0,
			}),
		);

		expect(result.current.visibleKeys).toStrictEqual(['checkout', 'payments']);
	});

	it('forgets a hidden entry that left the result', () => {
		const { result, rerender } = renderHook(
			({ keys }) => useLegendVisibility({ keys, indexOffset: 1 }),
			{ initialProps: { keys: KEYS } },
		);

		act(() =>
			result.current.onLegendAction({
				type: LegendAction.TOGGLE,
				seriesIndex: 3,
			}),
		);
		rerender({ keys: ['cart', 'checkout'] });

		expect(result.current.visibleKeys).toStrictEqual(['cart', 'checkout']);
	});

	it('tracks the hovered entry for the legend"s focus highlight', () => {
		const { result } = render();

		act(() =>
			result.current.onLegendAction({
				type: LegendAction.HOVER,
				seriesIndex: 2,
			}),
		);
		expect(result.current.focusedSeriesIndex).toBe(2);

		act(() =>
			result.current.onLegendAction({
				type: LegendAction.HOVER,
				seriesIndex: null,
			}),
		);
		expect(result.current.focusedSeriesIndex).toBeNull();
	});

	it('drops the focus when the focused entry is hidden', () => {
		const { result } = render();

		act(() =>
			result.current.onLegendAction({
				type: LegendAction.HOVER,
				seriesIndex: 2,
			}),
		);
		act(() =>
			result.current.onLegendAction({
				type: LegendAction.TOGGLE,
				seriesIndex: 2,
			}),
		);

		expect(result.current.focusedSeriesIndex).toBeNull();
	});

	describe('persistence', () => {
		it('writes the selection under the widget id', () => {
			const { result } = render({ id: 'panel-1' });

			act(() =>
				result.current.onLegendAction({
					type: LegendAction.TOGGLE,
					seriesIndex: 2,
				}),
			);

			expect(mockUpdateStored).toHaveBeenLastCalledWith('panel-1', [
				{ label: 'cart', show: true },
				{ label: 'checkout', show: false },
				{ label: 'payments', show: true },
			]);
		});

		it('does not write without an id', () => {
			const { result } = render();

			act(() =>
				result.current.onLegendAction({
					type: LegendAction.TOGGLE,
					seriesIndex: 2,
				}),
			);

			expect(mockUpdateStored).not.toHaveBeenCalled();
		});

		it('rehydrates the selection from the store, matched by label', () => {
			mockGetStored.mockReturnValue([
				{ label: 'cart', show: true },
				{ label: 'checkout', show: false },
				{ label: 'payments', show: true },
			]);

			const { result } = render({ id: 'panel-1' });

			expect(result.current.visibleKeys).toStrictEqual(['cart', 'payments']);
		});

		it('leaves the stored selection alone when it already matches', () => {
			mockGetStored.mockReturnValue([{ label: 'cart', show: false }]);

			const { result, rerender } = render({ id: 'panel-1' });
			const first = result.current.hiddenKeys;
			rerender();

			expect(result.current.hiddenKeys).toBe(first);
		});
	});
});
