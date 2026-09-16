import { LegendItem } from 'lib/uPlotV2/config/types';
import {
	LegendAction,
	LegendActionPayload,
	OnLegendAction,
} from 'lib/uPlotV2/components/types';
import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
	getStoredSeriesVisibility,
	updateSeriesVisibilityToLocalStorage,
} from 'lib/visualization/panels/utils/legendVisibilityUtils';
import { PieSlice } from 'lib/visualization/charts/types';

export interface UsePieInteractionsResult {
	/** The hovered/focused slice (drives donut dimming + tooltip). */
	active: PieSlice | null;
	setActive: Dispatch<SetStateAction<PieSlice | null>>;
	/** Slices currently shown (hidden ones removed). */
	visibleData: PieSlice[];
	/** Legend item per slice (`show` reflects hide state). */
	legendItems: LegendItem[];
	/** Index of the active slice for the legend's focus highlight, or null. */
	focusedSeriesIndex: number | null;
	/** Every legend interaction, dispatched by type. */
	onLegendAction: OnLegendAction;
}

/**
 * Pie interaction + derived state: hover/focus, slice hide/show driven by the
 * shared legend's actions, and persistence of the hidden set to localStorage
 * (keyed by `id`, matched by label) so it survives reloads. Returns the visible
 * slices, legend items, focus index, and the legend action dispatch.
 */
export function usePieInteractions(
	data: PieSlice[],
	id?: string,
): UsePieInteractionsResult {
	const [active, setActive] = useState<PieSlice | null>(null);
	const [hiddenIndices, setHiddenIndices] = useState<Set<number>>(
		() => new Set(),
	);

	const legendItems = useMemo<LegendItem[]>(
		() =>
			data.map((slice, index) => ({
				seriesIndex: index,
				label: slice.label,
				color: slice.color,
				show: !hiddenIndices.has(index),
			})),
		[data, hiddenIndices],
	);

	// Hidden slices drop out so the remaining arcs + centre total recompute.
	const visibleData = useMemo(
		() => data.filter((_, index) => !hiddenIndices.has(index)),
		[data, hiddenIndices],
	);

	// Rehydrate hide/unhide from localStorage (matched by label) whenever the
	// data set changes — including first load and every refetch, since the store
	// is the source of truth and toggles write back to it.
	useEffect(() => {
		if (!id || !data.length) {
			return;
		}
		const stored = getStoredSeriesVisibility(id);
		if (!stored) {
			return;
		}
		const hidden = new Set<number>();
		data.forEach((slice, index) => {
			if (stored.find((s) => s.label === slice.label)?.show === false) {
				hidden.add(index);
			}
		});
		setHiddenIndices(hidden);
	}, [id, data]);

	// Apply a new hidden set and persist it (label + show) to localStorage.
	const applyHidden = useCallback(
		(hidden: Set<number>): void => {
			setHiddenIndices(hidden);
			if (id) {
				updateSeriesVisibilityToLocalStorage(
					id,
					data.map((slice, index) => ({
						label: slice.label,
						show: !hidden.has(index),
					})),
				);
			}
		},
		[id, data],
	);

	const hoverSeries = useCallback(
		(sliceIndex: number | null): void => {
			// Don't focus/dim for hidden slices — they aren't on the donut.
			setActive(
				sliceIndex != null && !hiddenIndices.has(sliceIndex)
					? data[sliceIndex]
					: null,
			);
		},
		[data, hiddenIndices],
	);

	const toggleSeries = useCallback(
		(sliceIndex: number): void => {
			const next = new Set(hiddenIndices);
			if (next.has(sliceIndex)) {
				next.delete(sliceIndex);
			} else {
				// An empty donut is never worth reaching.
				if (data.length - next.size <= 1) {
					return;
				}
				next.add(sliceIndex);
			}
			applyHidden(next);
		},
		[data.length, hiddenIndices, applyHidden],
	);

	const showOnlySeries = useCallback(
		(sliceIndex: number): void => {
			const next = new Set<number>();
			data.forEach((_, index) => {
				if (index !== sliceIndex) {
					next.add(index);
				}
			});
			applyHidden(next);
		},
		[data, applyHidden],
	);

	const showAllSeries = useCallback(
		(): void => applyHidden(new Set()),
		[applyHidden],
	);

	const onLegendAction = useCallback(
		(payload: LegendActionPayload): void => {
			switch (payload.type) {
				case LegendAction.TOGGLE:
					toggleSeries(payload.seriesIndex);
					break;
				case LegendAction.SHOW_ONLY:
					showOnlySeries(payload.seriesIndex);
					break;
				case LegendAction.SHOW_ALL:
					showAllSeries();
					break;
				case LegendAction.HOVER:
					hoverSeries(payload.seriesIndex);
					break;
				default:
					break;
			}
		},
		[toggleSeries, showOnlySeries, showAllSeries, hoverSeries],
	);

	const activeIndex = active ? data.indexOf(active) : -1;
	// Left active, a hidden slice keeps every other arc dimmed, which reads as an
	// isolation rather than as one slice being excluded.
	const effectiveActive =
		activeIndex >= 0 && !hiddenIndices.has(activeIndex) ? active : null;
	const focusedIndex = effectiveActive ? activeIndex : -1;

	return {
		active: effectiveActive,
		setActive,
		visibleData,
		legendItems,
		focusedSeriesIndex: focusedIndex >= 0 ? focusedIndex : null,
		onLegendAction,
	};
}
