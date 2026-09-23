import { act, renderHook } from '@testing-library/react';
import { LegendAction } from 'lib/uPlotV2/components/types';

import { useLegendVisibility } from 'lib/visualization/hooks/useLegendVisibility';

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

	it('reports every new hidden set to the caller', () => {
		const onHiddenChange = jest.fn();
		const { result } = render({ onHiddenChange });

		act(() =>
			result.current.onLegendAction({
				type: LegendAction.TOGGLE,
				seriesIndex: 2,
			}),
		);

		expect(onHiddenChange).toHaveBeenCalledWith(new Set(['checkout']));
	});

	it('restores a hidden set without reporting it back', () => {
		const onHiddenChange = jest.fn();
		const { result } = render({ onHiddenChange });

		act(() => result.current.setHiddenKeys(new Set(['cart'])));

		expect(result.current.visibleKeys).toStrictEqual(['checkout', 'payments']);
		expect(onHiddenChange).not.toHaveBeenCalled();
	});
});
