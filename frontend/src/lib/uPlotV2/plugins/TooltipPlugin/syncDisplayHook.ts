import uPlot from 'uplot';

import type { ExtendedSeries } from '../../config/types';
import { syncCursorRegistry } from './syncCursorRegistry';
import type { TooltipControllerState, TooltipSyncMetadata } from './types';

/**
 * Returns the dimension keys present in both groupBy arrays.
 * An empty result means no overlap — series highlighting should not run.
 *
 *   exact    [A, B] vs [A, B]  → [A, B]   one match
 *   subset   [A]    vs [A, B]  → [A]      multiple receiver series may match
 *   superset [A, B] vs [A]     → [A]      one receiver series matches
 *   partial  [A, B] vs [B, C]  → [B]
 */
function getCommonGroupByKeys(
	a: TooltipSyncMetadata['groupBy'],
	b: TooltipSyncMetadata['groupBy'],
): string[] {
	if (
		!Array.isArray(a) ||
		a.length === 0 ||
		!Array.isArray(b) ||
		b.length === 0
	) {
		return [];
	}
	const bKeys = new Set(b.map((g) => g.key));
	return a.filter((g) => bKeys.has(g.key)).map((g) => g.key);
}

/**
 * Returns the 1-based indexes of every series whose metric matches
 * sourceMetric on all commonKeys.
 */
function findMatchingSeriesIndexes(
	series: uPlot.Series[],
	sourceMetric: Record<string, string>,
	commonKeys: string[],
): number[] {
	return series.reduce<number[]>((acc, s, i) => {
		if (i === 0) {
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
 * Returns:
 *   null      – no groupBy filtering configured or cursor off-chart (no-op for tooltip)
 *   []        – groupBy configured but no receiver series match the source (hide synced tooltip)
 *   number[]  – 1-based indexes of matching receiver series (show only these)
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

	if (commonKeys.length === 0) {
		return null;
	}

	if ((uPlotInstance.cursor.left ?? -1) < 0) {
		uPlotInstance.setSeries(null, { focus: false });
		return null;
	}

	const sourceSeriesMetric = syncCursorRegistry.getActiveSeriesMetric(syncKey);
	if (sourceSeriesMetric == null) {
		uPlotInstance.setSeries(null, { focus: false });
		return [];
	}

	const matchingIdxs = findMatchingSeriesIndexes(
		uPlotInstance.series,
		sourceSeriesMetric,
		commonKeys,
	);

	if (matchingIdxs.length === 0) {
		uPlotInstance.setSeries(null, { focus: false });
		return [];
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
	let lastSourceGroupBy: TooltipSyncMetadata['groupBy'];
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

		if (sourceMetadata?.groupBy !== lastSourceGroupBy) {
			lastSourceGroupBy = sourceMetadata?.groupBy;
			cachedCommonKeys = getCommonGroupByKeys(
				sourceMetadata?.groupBy,
				syncMetadata?.groupBy,
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
