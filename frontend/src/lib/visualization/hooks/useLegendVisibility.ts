import { useCallback, useEffect, useMemo, useState } from 'react';
import { LegendAction, OnLegendAction } from 'lib/uPlotV2/components/types';

import {
	getStoredSeriesVisibility,
	updateSeriesVisibilityToLocalStorage,
} from 'lib/visualization/panels/utils/legendVisibilityUtils';

export interface UseLegendVisibilityResult {
	visibleKeys: string[];
	hiddenKeys: ReadonlySet<string>;
	focusedSeriesIndex: number | null;
	setFocusedKey: (key: string | null) => void;
	onLegendAction: OnLegendAction;
}

function isSameSet(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
	return a.size === b.size && [...a].every((entry) => b.has(entry));
}

/**
 * Legend visibility and focus for charts whose legend does not list uPlot series.
 * Keyed by label, so a selection survives reordering, and persists under the same
 * widget store the uPlot legends use.
 */
export function useLegendVisibility({
	keys,
	indexOffset = 0,
	id,
}: {
	keys: string[];
	/** Legend `seriesIndex` of `keys[0]`. Charts that mirror uPlot's 1-based data
	 *  series pass 1. */
	indexOffset?: number;
	/** Widget id the selection persists under. Left out, nothing is stored. */
	id?: string;
}): UseLegendVisibilityResult {
	const [hidden, setHidden] = useState<Set<string>>(() => new Set());
	const [focusedKey, setFocusedKey] = useState<string | null>(null);

	const visibleKeys = useMemo(
		() => keys.filter((key) => !hidden.has(key)),
		[keys, hidden],
	);

	// The store is the source of truth: reread it whenever the entries change.
	useEffect(() => {
		if (!id || !keys.length) {
			return;
		}
		const stored = getStoredSeriesVisibility(id);
		if (!stored) {
			return;
		}
		const restored = new Set(
			keys.filter((key) => stored.find((s) => s.label === key)?.show === false),
		);
		setHidden((previous) =>
			isSameSet(previous, restored) ? previous : restored,
		);
	}, [id, keys]);

	const applyHidden = useCallback(
		(next: Set<string>): void => {
			setHidden(next);
			if (id) {
				updateSeriesVisibilityToLocalStorage(
					id,
					keys.map((key) => ({ label: key, show: !next.has(key) })),
				);
			}
		},
		[id, keys],
	);

	const onLegendAction = useCallback<OnLegendAction>(
		(payload): void => {
			const keyAt = (seriesIndex: number): string | undefined =>
				keys[seriesIndex - indexOffset];

			switch (payload.type) {
				case LegendAction.TOGGLE: {
					const key = keyAt(payload.seriesIndex);
					if (key === undefined) {
						return;
					}
					const next = new Set(hidden);
					if (next.has(key)) {
						next.delete(key);
					} else {
						// An empty chart is never a state worth reaching, as
						// PlotContext holds for uPlot series.
						if (keys.length - next.size <= 1) {
							return;
						}
						next.add(key);
					}
					applyHidden(next);
					break;
				}
				case LegendAction.SHOW_ONLY: {
					const key = keyAt(payload.seriesIndex);
					if (key === undefined) {
						return;
					}
					applyHidden(new Set(keys.filter((entry) => entry !== key)));
					break;
				}
				case LegendAction.SHOW_ALL:
					applyHidden(new Set());
					break;
				case LegendAction.HOVER:
					setFocusedKey(
						payload.seriesIndex === null
							? null
							: (keyAt(payload.seriesIndex) ?? null),
					);
					break;
				default:
					break;
			}
		},
		[keys, indexOffset, hidden, applyHidden],
	);

	// Left focused, a hidden entry keeps everything else dimmed.
	const focusedIndex =
		focusedKey !== null && !hidden.has(focusedKey)
			? keys.indexOf(focusedKey)
			: -1;

	return {
		visibleKeys,
		hiddenKeys: hidden,
		focusedSeriesIndex: focusedIndex >= 0 ? focusedIndex + indexOffset : null,
		setFocusedKey,
		onLegendAction,
	};
}
