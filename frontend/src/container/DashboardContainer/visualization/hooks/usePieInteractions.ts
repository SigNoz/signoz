import { LegendItem } from 'lib/uPlotV2/config/types';
import type { Dispatch, MouseEvent, SetStateAction } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
	getStoredSeriesVisibility,
	updateSeriesVisibilityToLocalStorage,
} from '../panels/utils/legendVisibilityUtils';
import { PieSlice } from '../charts/types';

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
	onLegendClick: (e: MouseEvent<HTMLDivElement>) => void;
	onLegendMouseMove: (e: MouseEvent<HTMLDivElement>) => void;
	onLegendMouseLeave: () => void;
}

// Reads the slice index off the nearest `[data-legend-item-id]` ancestor of the
// event target (the shared Legend tags each item with its seriesIndex).
function getLegendIndex(e: MouseEvent<HTMLDivElement>): number | null {
	const el = (e.target as HTMLElement | null)?.closest<HTMLElement>(
		'[data-legend-item-id]',
	);
	const id = el?.dataset.legendItemId;
	return id != null ? Number(id) : null;
}

/**
 * Pie interaction + derived state: hover/focus, slice hide/unhide (mirroring the
 * uPlot legend — marker toggles one, label isolates), and persistence of the
 * hidden set to localStorage (keyed by `id`, matched by label) so it survives
 * reloads. Returns the visible slices, legend items, focus index, and the
 * legend container handlers.
 */
export function usePieInteractions(
	data: PieSlice[],
	id?: string,
): UsePieInteractionsResult {
	const [active, setActive] = useState<PieSlice | null>(null);
	const [hiddenIndices, setHiddenIndices] = useState<Set<number>>(
		() => new Set(),
	);
	const isolatedIndexRef = useRef<number | null>(null);

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

	const onLegendMouseMove = useCallback(
		(e: MouseEvent<HTMLDivElement>): void => {
			const index = getLegendIndex(e);
			// Don't focus/dim for hidden slices — they aren't on the donut.
			setActive(index != null && !hiddenIndices.has(index) ? data[index] : null);
		},
		[data, hiddenIndices],
	);

	// Marker click toggles just that slice on/off; label click isolates it
	// (clicking the isolated one again resets to all) — mirrors the uPlot legend.
	const onLegendClick = useCallback(
		(e: MouseEvent<HTMLDivElement>): void => {
			const index = getLegendIndex(e);
			if (index == null) {
				return;
			}
			const isMarker = (e.target as HTMLElement).dataset.isLegendMarker;

			if (isMarker) {
				const next = new Set(hiddenIndices);
				if (next.has(index)) {
					next.delete(index);
				} else {
					next.add(index);
				}
				applyHidden(next);
				return;
			}

			const isReset = isolatedIndexRef.current === index;
			isolatedIndexRef.current = isReset ? null : index;
			if (isReset) {
				applyHidden(new Set());
				return;
			}
			const next = new Set<number>();
			data.forEach((_, i) => {
				if (i !== index) {
					next.add(i);
				}
			});
			applyHidden(next);
		},
		[data, hiddenIndices, applyHidden],
	);

	const onLegendMouseLeave = useCallback((): void => setActive(null), []);

	const focusedIndex = active ? data.indexOf(active) : -1;

	return {
		active,
		setActive,
		visibleData,
		legendItems,
		focusedSeriesIndex: focusedIndex >= 0 ? focusedIndex : null,
		onLegendClick,
		onLegendMouseMove,
		onLegendMouseLeave,
	};
}
