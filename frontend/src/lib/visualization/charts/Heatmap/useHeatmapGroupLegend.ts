import { MouseEvent, useCallback, useMemo, useRef, useState } from 'react';

export interface UseHeatmapGroupLegendResult {
	/** Groups currently enabled. The grid sums exactly these. */
	visibleGroups: string[];
	focusedSeriesIndex: number | null;
	onLegendClick: (event: MouseEvent<HTMLDivElement>) => void;
	onLegendMouseMove: (event: MouseEvent<HTMLDivElement>) => void;
	onLegendMouseLeave: () => void;
}

/** The shared Legend tags each item and delegates interaction to the container. */
function getLegendIndex(event: MouseEvent<HTMLDivElement>): number | null {
	const element = (event.target as HTMLElement | null)?.closest<HTMLElement>(
		'[data-legend-item-id]',
	);
	const id = element?.dataset.legendItemId;
	return id === undefined ? null : Number(id);
}

function isMarkerClick(event: MouseEvent<HTMLDivElement>): boolean {
	return Boolean((event.target as HTMLElement).dataset.isLegendMarker);
}

/**
 * Group visibility for the heatmap legend, matching every other legend in the
 * product: the label isolates a group, the marker excludes one, and everything is
 * enabled to begin with. Counts are additive, so whatever is enabled is summed
 * client-side and needs no extra request.
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
	const isolatedRef = useRef<string | null>(null);

	const visibleGroups = useMemo(
		() => groups.filter((group) => !hidden.has(group)),
		[groups, hidden],
	);

	const onLegendClick = useCallback(
		(event: MouseEvent<HTMLDivElement>): void => {
			const index = getLegendIndex(event);
			const group = index === null ? undefined : groups[index - 1];
			if (group === undefined) {
				return;
			}

			if (isMarkerClick(event)) {
				isolatedRef.current = null;
				setHidden((previous) => {
					const next = new Set(previous);
					if (next.has(group)) {
						next.delete(group);
					} else {
						next.add(group);
					}
					return next;
				});
				return;
			}

			// Label click isolates; clicking the isolated group again restores all.
			const isReset = isolatedRef.current === group;
			isolatedRef.current = isReset ? null : group;
			setHidden(
				isReset ? new Set() : new Set(groups.filter((entry) => entry !== group)),
			);
		},
		[groups],
	);

	const onLegendMouseMove = useCallback(
		(event: MouseEvent<HTMLDivElement>): void => {
			setFocusedSeriesIndex(getLegendIndex(event));
		},
		[],
	);

	const onLegendMouseLeave = useCallback((): void => {
		setFocusedSeriesIndex(null);
	}, []);

	return {
		visibleGroups,
		focusedSeriesIndex,
		onLegendClick,
		onLegendMouseMove,
		onLegendMouseLeave,
	};
}
