import { act, renderHook } from '@testing-library/react';
import { LegendAction } from 'lib/uPlotV2/components/types';

import { useHeatmapGroupLegend } from '../useHeatmapGroupLegend';

const GROUPS = ['cart', 'checkout', 'payments'];

function render(
	groups: string[] = GROUPS,
): ReturnType<
	typeof renderHook<ReturnType<typeof useHeatmapGroupLegend>, unknown>
> {
	return renderHook(() => useHeatmapGroupLegend({ groups }));
}

describe('useHeatmapGroupLegend', () => {
	it('enables every group to begin with', () => {
		const { result } = render();

		expect(result.current.visibleGroups).toStrictEqual(GROUPS);
	});

	it('isolates a group when the legend asks to show only it', () => {
		const { result } = render();

		act(() =>
			result.current.onLegendAction({
				type: LegendAction.SHOW_ONLY,
				seriesIndex: 2,
			}),
		);

		expect(result.current.visibleGroups).toStrictEqual(['checkout']);
	});

	it('restores every group when the legend asks to show all', () => {
		const { result } = render();

		act(() =>
			result.current.onLegendAction({
				type: LegendAction.SHOW_ONLY,
				seriesIndex: 2,
			}),
		);
		act(() => result.current.onLegendAction({ type: LegendAction.SHOW_ALL }));

		expect(result.current.visibleGroups).toStrictEqual(GROUPS);
	});

	it('moves the isolation to the group named last', () => {
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

		expect(result.current.visibleGroups).toStrictEqual(['payments']);
	});

	it('excludes just one group when it is toggled off', () => {
		const { result } = render();

		act(() =>
			result.current.onLegendAction({
				type: LegendAction.TOGGLE,
				seriesIndex: 2,
			}),
		);

		expect(result.current.visibleGroups).toStrictEqual(['cart', 'payments']);
	});

	it('re-includes a group when it is toggled again', () => {
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

		expect(result.current.visibleGroups).toStrictEqual(GROUPS);
	});

	it('excludes more than one group', () => {
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

		expect(result.current.visibleGroups).toStrictEqual(['checkout']);
	});

	it('allows every group to be excluded, as the other legends do', () => {
		const { result } = render();

		GROUPS.forEach((_, index) =>
			act(() =>
				result.current.onLegendAction({
					type: LegendAction.TOGGLE,
					seriesIndex: index + 1,
				}),
			),
		);

		expect(result.current.visibleGroups).toStrictEqual([]);
	});

	it('ignores an action naming an entry that is not there', () => {
		const { result } = render();

		act(() =>
			result.current.onLegendAction({
				type: LegendAction.TOGGLE,
				seriesIndex: 99,
			}),
		);

		expect(result.current.visibleGroups).toStrictEqual(GROUPS);
	});

	it('forgets a hidden group that left the result', () => {
		const { result, rerender } = renderHook(
			({ groups }) => useHeatmapGroupLegend({ groups }),
			{ initialProps: { groups: GROUPS } },
		);

		act(() =>
			result.current.onLegendAction({
				type: LegendAction.TOGGLE,
				seriesIndex: 3,
			}),
		);
		rerender({ groups: ['cart', 'checkout'] });

		expect(result.current.visibleGroups).toStrictEqual(['cart', 'checkout']);
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
});
