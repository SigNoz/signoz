import { act, renderHook } from '@testing-library/react';
import type { MouseEvent } from 'react';

import { useHeatmapGroupLegend } from '../useHeatmapGroupLegend';

const GROUPS = ['cart', 'checkout', 'payments'];

/** Mimics a click on an item's label, as the shared Legend renders it. */
function labelClick(seriesIndex: number): MouseEvent<HTMLDivElement> {
	const wrapper = document.createElement('div');
	wrapper.setAttribute('data-legend-item-id', String(seriesIndex));
	const label = document.createElement('span');
	wrapper.appendChild(label);
	return { target: label } as unknown as MouseEvent<HTMLDivElement>;
}

/** Mimics a click on the item's marker circle. */
function markerClick(seriesIndex: number): MouseEvent<HTMLDivElement> {
	const wrapper = document.createElement('div');
	wrapper.setAttribute('data-legend-item-id', String(seriesIndex));
	const marker = document.createElement('div');
	marker.dataset.isLegendMarker = 'true';
	wrapper.appendChild(marker);
	return { target: marker } as unknown as MouseEvent<HTMLDivElement>;
}

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

	it('isolates a group when its label is clicked', () => {
		const { result } = render();

		act(() => result.current.onLegendClick(labelClick(2)));

		expect(result.current.visibleGroups).toStrictEqual(['checkout']);
	});

	it('restores every group when the isolated label is clicked again', () => {
		const { result } = render();

		act(() => result.current.onLegendClick(labelClick(2)));
		act(() => result.current.onLegendClick(labelClick(2)));

		expect(result.current.visibleGroups).toStrictEqual(GROUPS);
	});

	it('moves the isolation when a different label is clicked', () => {
		const { result } = render();

		act(() => result.current.onLegendClick(labelClick(1)));
		act(() => result.current.onLegendClick(labelClick(3)));

		expect(result.current.visibleGroups).toStrictEqual(['payments']);
	});

	it('excludes just one group when its marker is clicked', () => {
		const { result } = render();

		act(() => result.current.onLegendClick(markerClick(2)));

		expect(result.current.visibleGroups).toStrictEqual(['cart', 'payments']);
	});

	it('re-includes a group when its marker is clicked again', () => {
		const { result } = render();

		act(() => result.current.onLegendClick(markerClick(2)));
		act(() => result.current.onLegendClick(markerClick(2)));

		expect(result.current.visibleGroups).toStrictEqual(GROUPS);
	});

	it('excludes more than one group', () => {
		const { result } = render();

		act(() => result.current.onLegendClick(markerClick(1)));
		act(() => result.current.onLegendClick(markerClick(3)));

		expect(result.current.visibleGroups).toStrictEqual(['checkout']);
	});

	it('drops the isolation when a marker is clicked, so the label can isolate again', () => {
		const { result } = render();

		act(() => result.current.onLegendClick(labelClick(1)));
		// Re-including cart by marker leaves it enabled but no longer isolated.
		act(() => result.current.onLegendClick(markerClick(2)));
		act(() => result.current.onLegendClick(labelClick(1)));

		expect(result.current.visibleGroups).toStrictEqual(['cart']);
	});

	it('allows every group to be excluded, as the other legends do', () => {
		const { result } = render();

		GROUPS.forEach((_, index) =>
			act(() => result.current.onLegendClick(markerClick(index + 1))),
		);

		expect(result.current.visibleGroups).toStrictEqual([]);
	});

	it('ignores clicks that miss an entry', () => {
		const { result } = render();
		const stray = {
			target: document.createElement('div'),
		} as unknown as MouseEvent<HTMLDivElement>;

		act(() => result.current.onLegendClick(stray));

		expect(result.current.visibleGroups).toStrictEqual(GROUPS);
	});

	it('forgets a hidden group that left the result', () => {
		const { result, rerender } = renderHook(
			({ groups }) => useHeatmapGroupLegend({ groups }),
			{ initialProps: { groups: GROUPS } },
		);

		act(() => result.current.onLegendClick(markerClick(3)));
		rerender({ groups: ['cart', 'checkout'] });

		expect(result.current.visibleGroups).toStrictEqual(['cart', 'checkout']);
	});

	it('tracks the hovered entry for the legend"s focus highlight', () => {
		const { result } = render();

		act(() => result.current.onLegendMouseMove(labelClick(2)));
		expect(result.current.focusedSeriesIndex).toBe(2);

		act(() => result.current.onLegendMouseLeave());
		expect(result.current.focusedSeriesIndex).toBeNull();
	});
});
