import { useCallback, useMemo, useState } from 'react';
import { LegendAction, OnLegendAction } from 'lib/uPlotV2/components/types';

export interface UseHeatmapGroupLegendResult {
	/** Groups currently enabled. The grid sums exactly these. */
	visibleGroups: string[];
	focusedSeriesIndex: number | null;
	onLegendAction: OnLegendAction;
}

/**
 * Group visibility for the heatmap legend, matching every other legend in the
 * product: the shared Legend decides what a click means and sends the action;
 * this only applies it. Everything is enabled to begin with.
 *
 * Counts are additive, so whatever is enabled is summed client-side and needs no
 * extra request.
 *
 * Visibility only. Marker colour is resolved by the caller, which owns the colour
 * ramp — and that ramp depends on which groups this hook has enabled.
 */
export function useHeatmapGroupLegend({
	groups,
}: {
	groups: string[];
}): UseHeatmapGroupLegendResult {
	const [hidden, setHidden] = useState<Set<string>>(() => new Set());
	const [focusedSeriesIndex, setFocusedSeriesIndex] = useState<number | null>(
		null,
	);

	const visibleGroups = useMemo(
		() => groups.filter((group) => !hidden.has(group)),
		[groups, hidden],
	);

	const onLegendAction = useCallback<OnLegendAction>(
		(payload): void => {
			// Legend items are numbered from 1, mirroring uPlot's 1-based data series.
			const groupAt = (seriesIndex: number): string | undefined =>
				groups[seriesIndex - 1];

			switch (payload.type) {
				case LegendAction.TOGGLE: {
					const group = groupAt(payload.seriesIndex);
					if (group === undefined) {
						return;
					}
					setHidden((previous) => {
						const next = new Set(previous);
						if (next.has(group)) {
							next.delete(group);
						} else {
							next.add(group);
						}
						return next;
					});
					break;
				}
				case LegendAction.SHOW_ONLY: {
					const group = groupAt(payload.seriesIndex);
					if (group === undefined) {
						return;
					}
					setHidden(new Set(groups.filter((entry) => entry !== group)));
					break;
				}
				case LegendAction.SHOW_ALL:
					setHidden(new Set());
					break;
				case LegendAction.HOVER:
					setFocusedSeriesIndex(payload.seriesIndex);
					break;
				default:
					break;
			}
		},
		[groups],
	);

	return {
		visibleGroups,
		focusedSeriesIndex,
		onLegendAction,
	};
}
