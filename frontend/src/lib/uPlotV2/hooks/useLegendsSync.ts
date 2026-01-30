import { LegendItem } from 'lib/uPlotV2/config/types';
import {
	Dispatch,
	SetStateAction,
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from 'react';
import { UPlotConfigBuilder } from 'lib/uPlotV2/config/UPlotConfigBuilder';
import { get } from 'lodash-es';

export default function useLegendsSync({
	config,
	subscribeToFocusChange = true,
}: {
	config: UPlotConfigBuilder;
	subscribeToFocusChange?: boolean;
}): {
	focusedSeriesIndex: number | null;
	setFocusedSeriesIndex: Dispatch<SetStateAction<number | null>>;
	legendItemsMap: Record<number, LegendItem>;
} {
	const [legendItemsMap, setLegendItemsMap] = useState<
		Record<number, LegendItem>
	>({});
	const [focusedSeriesIndex, setFocusedSeriesIndex] = useState<number | null>(
		null,
	);

	const visibilityUpdatesRef = useRef<Record<number, boolean>>({});
	const visibilityRafIdRef = useRef<number | null>(null);

	const applyVisibilityUpdates = useCallback(
		(updates: Record<number, boolean>): void => {
			setLegendItemsMap(
				(prev): Record<number, LegendItem> => {
					let hasChanges = false;
					const next = { ...prev };

					for (const [idxStr, show] of Object.entries(updates)) {
						const idx = Number(idxStr);
						const current = next[idx];
						if (!current || current.show === show) {
							continue;
						}
						next[idx] = { ...current, show };
						hasChanges = true;
					}

					return hasChanges ? next : prev;
				},
			);
		},
		[],
	);

	const queueVisibilityUpdate = useCallback(
		(seriesIndex: number, show: boolean): void => {
			// Accumulate visibility updates
			visibilityUpdatesRef.current[seriesIndex] = show;

			// Schedule a single state update per frame
			if (visibilityRafIdRef.current !== null) {
				return;
			}

			visibilityRafIdRef.current = requestAnimationFrame(() => {
				const updates = visibilityUpdatesRef.current;
				visibilityUpdatesRef.current = {};
				visibilityRafIdRef.current = null;

				applyVisibilityUpdates(updates);
			});
		},
		[applyVisibilityUpdates],
	);

	const handleSetSeries = useCallback(
		(_u: uPlot, seriesIndex: number | null, opts: uPlot.Series): void => {
			// Using get because focus is not a property of uPlot.Series, but it's present in the opts.
			if (subscribeToFocusChange && get(opts, 'focus', false)) {
				setFocusedSeriesIndex(seriesIndex);
			}

			// Keep legend visibility in sync with uPlot series visibility.
			if (!seriesIndex || typeof opts.show !== 'boolean') {
				return;
			}

			queueVisibilityUpdate(seriesIndex, opts.show);
		},
		[queueVisibilityUpdate, subscribeToFocusChange],
	);

	useLayoutEffect(() => {
		setLegendItemsMap(config.getLegendItems());

		const removeHook = config.addHook('setSeries', handleSetSeries);

		return (): void => {
			removeHook();
		};
	}, [config, handleSetSeries]);

	useEffect(
		() => (): void => {
			if (visibilityRafIdRef.current != null) {
				cancelAnimationFrame(visibilityRafIdRef.current);
			}
		},
		[],
	);

	return {
		focusedSeriesIndex,
		setFocusedSeriesIndex,
		legendItemsMap,
	};
}
