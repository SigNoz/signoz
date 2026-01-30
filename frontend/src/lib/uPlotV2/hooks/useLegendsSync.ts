import {
	Dispatch,
	SetStateAction,
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from 'react';
import { LegendItem } from 'lib/uPlotV2/config/types';
import { UPlotConfigBuilder } from 'lib/uPlotV2/config/UPlotConfigBuilder';
import { get } from 'lodash-es';

/**
 * Syncs legend UI state with the uPlot chart: which series is focused and each series' visibility.
 * Subscribes to the config's setSeries hook so legend items stay in sync when series are toggled
 * from the chart or from the Legend component.
 *
 * @param config - UPlot config builder; used to read legend items and to register the setSeries hook
 * @param subscribeToFocusChange - When true, updates focusedSeriesIndex when a series gains focus via setSeries
 * @returns focusedSeriesIndex, setFocusedSeriesIndex, and legendItemsMap for the Legend component
 */
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

	/** Pending visibility updates (series index -> show) to apply in the next RAF. */
	const visibilityUpdatesRef = useRef<Record<number, boolean>>({});
	/** RAF id for the batched visibility update; null when no update is scheduled. */
	const visibilityRafIdRef = useRef<number | null>(null);

	/**
	 * Applies a batch of visibility updates to legendItemsMap.
	 * Only updates entries that exist and whose show value changed; returns prev state if nothing changed.
	 */
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

	/**
	 * Queues a single series visibility update and schedules at most one state update per frame.
	 * Batches multiple visibility changes (e.g. from setSeries) into one setLegendItemsMap call.
	 */
	const queueVisibilityUpdate = useCallback(
		(seriesIndex: number, show: boolean): void => {
			visibilityUpdatesRef.current[seriesIndex] = show;

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

	/**
	 * Handler for uPlot's setSeries hook. Updates focused series when opts.focus is set,
	 * and queues legend visibility updates when opts.show changes so the legend stays in sync.
	 */
	const handleSetSeries = useCallback(
		(_u: uPlot, seriesIndex: number | null, opts: uPlot.Series): void => {
			if (subscribeToFocusChange && get(opts, 'focus', false)) {
				setFocusedSeriesIndex(seriesIndex);
			}

			if (!seriesIndex || typeof opts.show !== 'boolean') {
				return;
			}

			queueVisibilityUpdate(seriesIndex, opts.show);
		},
		[queueVisibilityUpdate, subscribeToFocusChange],
	);

	// Initialize legend items from config and subscribe to setSeries; cleanup on unmount or config change.
	useLayoutEffect(() => {
		setLegendItemsMap(config.getLegendItems());

		const removeHook = config.addHook('setSeries', handleSetSeries);

		return (): void => {
			removeHook();
		};
	}, [config, handleSetSeries]);

	// Cancel any pending RAF on unmount to avoid state updates after unmount.
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
