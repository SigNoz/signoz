import { LegendItem } from 'lib/uPlotV2/config/types';
import { OnLegendAction } from 'lib/uPlotV2/components/types';
import { useCallback, useEffect, useMemo } from 'react';

import {
	getStoredSeriesVisibility,
	updateSeriesVisibilityToLocalStorage,
} from 'lib/visualization/panels/utils/legendVisibilityUtils';
import { PieSlice } from 'lib/visualization/charts/types';
import { useLegendVisibility } from 'lib/visualization/hooks/useLegendVisibility';

export interface UsePieInteractionsResult {
	/** The hovered/focused slice (drives donut dimming + tooltip). */
	active: PieSlice | null;
	setActive: (slice: PieSlice | null) => void;
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
 * Pie interaction + derived state on the shared `useLegendVisibility`, plus
 * persistence of the hidden set to localStorage (keyed by `id`, matched by label)
 * so it survives reloads.
 */
export function usePieInteractions(
	data: PieSlice[],
	id?: string,
): UsePieInteractionsResult {
	const labels = useMemo(() => data.map((slice) => slice.label), [data]);

	const persist = useCallback(
		(hidden: Set<string>): void => {
			if (!id) {
				return;
			}
			updateSeriesVisibilityToLocalStorage(
				id,
				labels.map((label) => ({ label, show: !hidden.has(label) })),
			);
		},
		[id, labels],
	);

	const {
		hiddenKeys,
		setHiddenKeys,
		focusedSeriesIndex,
		setFocusedKey,
		onLegendAction,
	} = useLegendVisibility({ keys: labels, onHiddenChange: persist });

	const legendItems = useMemo<LegendItem[]>(
		() =>
			data.map((slice, index) => ({
				seriesIndex: index,
				label: slice.label,
				color: slice.color,
				show: !hiddenKeys.has(slice.label),
			})),
		[data, hiddenKeys],
	);

	// Hidden slices drop out so the remaining arcs + centre total recompute.
	const visibleData = useMemo(
		() => data.filter((slice) => !hiddenKeys.has(slice.label)),
		[data, hiddenKeys],
	);

	// Rehydrate hide/unhide from localStorage (matched by label) whenever the
	// data set changes — including first load and every refetch, since the store
	// is the source of truth and toggles write back to it.
	useEffect(() => {
		if (!id || !labels.length) {
			return;
		}
		const stored = getStoredSeriesVisibility(id);
		if (!stored) {
			return;
		}
		setHiddenKeys(
			new Set(
				labels.filter(
					(label) => stored.find((s) => s.label === label)?.show === false,
				),
			),
		);
	}, [id, labels, setHiddenKeys]);

	const setActive = useCallback(
		(slice: PieSlice | null): void => setFocusedKey(slice?.label ?? null),
		[setFocusedKey],
	);

	return {
		active: focusedSeriesIndex !== null ? data[focusedSeriesIndex] : null,
		setActive,
		visibleData,
		legendItems,
		focusedSeriesIndex,
		onLegendAction,
	};
}
