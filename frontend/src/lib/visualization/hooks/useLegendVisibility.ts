import { useCallback, useMemo, useState } from 'react';
import { LegendAction, OnLegendAction } from 'lib/uPlotV2/components/types';

export interface UseLegendVisibilityResult {
	visibleKeys: string[];
	hiddenKeys: ReadonlySet<string>;
	/** Restores a hidden set without reporting it back through `onHiddenChange`. */
	setHiddenKeys: (hidden: Set<string>) => void;
	focusedSeriesIndex: number | null;
	setFocusedKey: (key: string | null) => void;
	onLegendAction: OnLegendAction;
}

/**
 * Legend visibility and focus for charts whose legend does not list uPlot series.
 * Keyed by label, so a selection survives entries being reordered or leaving the
 * result.
 */
export function useLegendVisibility({
	keys,
	indexOffset = 0,
	onHiddenChange,
}: {
	keys: string[];
	/** Legend `seriesIndex` of `keys[0]`. Charts that mirror uPlot's 1-based data
	 *  series pass 1. */
	indexOffset?: number;
	onHiddenChange?: (hidden: Set<string>) => void;
}): UseLegendVisibilityResult {
	const [hidden, setHidden] = useState<Set<string>>(() => new Set());
	const [focusedKey, setFocusedKey] = useState<string | null>(null);

	const visibleKeys = useMemo(
		() => keys.filter((key) => !hidden.has(key)),
		[keys, hidden],
	);

	const applyHidden = useCallback(
		(next: Set<string>): void => {
			setHidden(next);
			onHiddenChange?.(next);
		},
		[onHiddenChange],
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
		setHiddenKeys: setHidden,
		focusedSeriesIndex: focusedIndex >= 0 ? focusedIndex + indexOffset : null,
		setFocusedKey,
		onLegendAction,
	};
}
