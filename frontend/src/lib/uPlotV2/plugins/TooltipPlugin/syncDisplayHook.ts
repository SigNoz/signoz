import uPlot from 'uplot';

import type { ExtendedSeries } from '../../config/types';
import { syncCursorRegistry } from './syncCursorRegistry';
import {
	SyncTooltipFilterMode,
	type TooltipControllerState,
	type TooltipSyncMetadata,
} from './types';

/**
 * Flattens per-query groupBys into a deduped set of dimension keys.
 * A panel's effective groupBy is the union across all of its queries.
 */
function collectGroupByKeys(
	groupByPerQuery: TooltipSyncMetadata['groupByPerQuery'],
): Set<string> {
	const keys = new Set<string>();
	if (!groupByPerQuery) {
		return keys;
	}
	for (const groupBy of Object.values(groupByPerQuery)) {
		for (const dim of groupBy) {
			keys.add(dim.key);
		}
	}
	return keys;
}

/**
 * Returns the dimension keys present in both panels' groupBys.
 * An empty result means no overlap — series highlighting should not run.
 *
 *   exact    [A, B] vs [A, B]  → [A, B]   one match
 *   subset   [A]    vs [A, B]  → [A]      multiple receiver series may match
 *   superset [A, B] vs [A]     → [A]      one receiver series matches
 *   partial  [A, B] vs [B, C]  → [B]
 */
function getCommonGroupByKeys(
	a: TooltipSyncMetadata['groupByPerQuery'],
	b: TooltipSyncMetadata['groupByPerQuery'],
): string[] {
	const aKeys = collectGroupByKeys(a);
	const bKeys = collectGroupByKeys(b);
	if (aKeys.size === 0 || bKeys.size === 0) {
		return [];
	}
	const common: string[] = [];
	aKeys.forEach((key) => {
		if (bKeys.has(key)) {
			common.push(key);
		}
	});
	return common;
}

/**
 * Returns the 1-based indexes of every visible series whose metric matches
 * sourceMetric on all commonKeys. Hidden series (toggled off in the legend)
 * are excluded so the synced tooltip is suppressed when no visible series
 * would match.
 */
function findMatchingSeriesIndexes(
	series: uPlot.Series[],
	sourceMetric: Record<string, string>,
	commonKeys: string[],
): number[] {
	return series.reduce<number[]>((acc, s, i) => {
		if (i === 0 || s.show === false) {
			return acc;
		}
		const metric = (s as ExtendedSeries).metric;
		if (
			metric != null &&
			commonKeys.every((key) => metric[key] === sourceMetric[key])
		) {
			acc.push(i);
		}
		return acc;
	}, []);
}

function applySourceSync({
	uPlotInstance,
	syncKey,
	syncMetadata,
	focusedSeriesIndex,
}: {
	uPlotInstance: uPlot;
	syncKey: string;
	syncMetadata: TooltipSyncMetadata | undefined;
	focusedSeriesIndex: number | null;
}): void {
	syncCursorRegistry.setMetadata(syncKey, syncMetadata);
	const focusedSeries =
		focusedSeriesIndex != null
			? (uPlotInstance.series[focusedSeriesIndex] as ExtendedSeries)
			: null;
	syncCursorRegistry.setActiveSeriesMetric(
		syncKey,
		focusedSeries?.metric ?? null,
	);
}

/**
 * Computes receiver-side series filtering / highlighting for Tooltip sync.
 *
 * Returns the indexes that the tooltip render path should treat per
 * `syncMetadata.filterMode`:
 *   - Filtered (default): null = no filter, [] = no matches (suppress tooltip),
 *      number[] = allowed indexes (show only these).
 *   - All: null = no highlight (show all), number[] = highlight set (show all,
 *      emphasize matching rows). Never returns [] in this mode so the synced
 *      tooltip is not suppressed when matches are missing.
 */
function applyReceiverSync({
	uPlotInstance,
	yCrosshairEl,
	syncKey,
	syncMetadata,
	sourceMetadata,
	commonKeys,
}: {
	uPlotInstance: uPlot;
	yCrosshairEl: HTMLElement;
	syncKey: string;
	syncMetadata: TooltipSyncMetadata | undefined;
	sourceMetadata: TooltipSyncMetadata | undefined;
	commonKeys: string[];
}): number[] | null {
	yCrosshairEl.style.display =
		sourceMetadata?.yAxisUnit === syncMetadata?.yAxisUnit ? '' : 'none';

	const filterMode = syncMetadata?.filterMode ?? SyncTooltipFilterMode.Filtered;
	const noMatchResult: number[] | null =
		filterMode === SyncTooltipFilterMode.All ? null : [];

	if (commonKeys.length === 0) {
		uPlotInstance.setSeries(null, { focus: false });
		return noMatchResult;
	}

	if ((uPlotInstance.cursor.left ?? -1) < 0) {
		uPlotInstance.setSeries(null, { focus: false });
		return null;
	}

	const sourceSeriesMetric = syncCursorRegistry.getActiveSeriesMetric(syncKey);
	if (sourceSeriesMetric == null) {
		uPlotInstance.setSeries(null, { focus: false });
		return noMatchResult;
	}

	const matchingIdxs = findMatchingSeriesIndexes(
		uPlotInstance.series,
		sourceSeriesMetric,
		commonKeys,
	);

	if (matchingIdxs.length === 0) {
		uPlotInstance.setSeries(null, { focus: false });
		return noMatchResult;
	}

	uPlotInstance.setSeries(matchingIdxs[0], { focus: true });

	return matchingIdxs;
}

export function createSyncDisplayHook(
	syncKey: string,
	syncMetadata: TooltipSyncMetadata | undefined,
	controller: TooltipControllerState,
): (u: uPlot) => void {
	// Cached once — avoids a DOM query on every cursor move.
	let yCrosshairEl: HTMLElement | null = null;

	// groupBy on both panels is stable (set at config time). Recompute the
	// intersection only when the source panel's groupBy reference changes.
	let lastSourceGroupBy: TooltipSyncMetadata['groupByPerQuery'];
	let cachedCommonKeys: string[] = [];

	return (u: uPlot): void => {
		yCrosshairEl ??= u.root.querySelector<HTMLElement>('.u-cursor-y');
		if (!yCrosshairEl) {
			return;
		}

		if (u.cursor.event != null) {
			controller.syncedSeriesIndexes = null;
			applySourceSync({
				uPlotInstance: u,
				syncKey,
				syncMetadata,
				focusedSeriesIndex: controller.focusedSeriesIndex,
			});
			yCrosshairEl.style.display = '';
			return;
		}

		// Read metadata once and pass it down — avoids a second registry lookup
		// inside applyReceiverSync.
		const sourceMetadata = syncCursorRegistry.getMetadata(syncKey);

		if (sourceMetadata?.groupByPerQuery !== lastSourceGroupBy) {
			lastSourceGroupBy = sourceMetadata?.groupByPerQuery;
			cachedCommonKeys = getCommonGroupByKeys(
				sourceMetadata?.groupByPerQuery,
				syncMetadata?.groupByPerQuery,
			);
		}

		controller.syncedSeriesIndexes = applyReceiverSync({
			uPlotInstance: u,
			yCrosshairEl,
			syncKey,
			syncMetadata,
			sourceMetadata,
			commonKeys: cachedCommonKeys,
		});
	};
}
