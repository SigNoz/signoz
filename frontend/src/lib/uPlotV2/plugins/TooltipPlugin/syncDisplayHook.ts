import { isEqual } from 'lodash-es';
import uPlot from 'uplot';

import type { ExtendedSeries } from '../../config/types';
import { syncCursorRegistry } from './syncCursorRegistry';
import type { TooltipControllerState, TooltipSyncMetadata } from './types';

/**
 * Returns true only when both panels declare a non-empty groupBy that is
 * structurally identical — the precondition for cross-panel series highlighting.
 */
function groupByMatches(
	a: TooltipSyncMetadata['groupBy'],
	b: TooltipSyncMetadata['groupBy'],
): boolean {
	return (
		Array.isArray(a) &&
		a.length > 0 &&
		Array.isArray(b) &&
		b.length > 0 &&
		isEqual(a, b)
	);
}

/**
 * Called on the panel that owns the real mouse event.
 * Publishes its metadata and the metric of the currently focused series so
 * that receiver panels can read both when their own setCursor fires.
 */
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
 * Called on every panel that is receiving a synced cursor update.
 *
 * - Crosshair visibility: shown only when the source's y-axis unit matches ours.
 * - Series highlighting: when both panels share the same groupBy, the series
 *   whose metric matches the source's active series is focused; all others dim.
 *   If no match is found (or the source has no active series) all series unfocus.
 */
function applyReceiverSync({
	uPlotInstance,
	yCrosshairEl,
	syncKey,
	syncMetadata,
}: {
	uPlotInstance: uPlot;
	yCrosshairEl: HTMLElement;
	syncKey: string;
	syncMetadata: TooltipSyncMetadata | undefined;
}): void {
	const sourceMetadata = syncCursorRegistry.getMetadata(syncKey);

	yCrosshairEl.style.display =
		sourceMetadata?.yAxisUnit === syncMetadata?.yAxisUnit ? '' : 'none';

	if (!groupByMatches(sourceMetadata?.groupBy, syncMetadata?.groupBy)) {
		return;
	}

	// When the synced cursor is off-plot the source has left — unfocus immediately
	// rather than reading a stale metric from the registry.
	if ((uPlotInstance.cursor.left ?? -1) < 0) {
		uPlotInstance.setSeries(null, { focus: false });
		return;
	}

	const sourceSeriesMetric = syncCursorRegistry.getActiveSeriesMetric(syncKey);
	const matchingSeriesIdx =
		sourceSeriesMetric != null
			? uPlotInstance.series.findIndex(
					(s, i) =>
						i > 0 && isEqual((s as ExtendedSeries).metric, sourceSeriesMetric),
			  )
			: -1;
	uPlotInstance.setSeries(matchingSeriesIdx > 0 ? matchingSeriesIdx : null, {
		focus: matchingSeriesIdx > 0,
	});
}

/**
 * Factory that returns the setCursor hook responsible for all cross-panel
 * display synchronisation: crosshair visibility and series highlighting.
 *
 * Follows the same factory pattern as createSetCursorHandler /
 * createSetSeriesHandler in tooltipController.ts.
 */
export function createSyncDisplayHook(
	syncKey: string,
	syncMetadata: TooltipSyncMetadata | undefined,
	controller: TooltipControllerState,
): (u: uPlot) => void {
	return (u: uPlot): void => {
		const yCrosshairEl = u.root.querySelector<HTMLElement>('.u-cursor-y');
		if (!yCrosshairEl) {
			return;
		}

		/**
		 * When the cursor moves, the source panel (where the mouse event occurs) writes
		 * to the registry and all panels read from it. When the cursor leaves the plot,
		 * the source clears its active series metric.
		 *
		 * only the source panel has access to the real mouse event
		 */
		if (u.cursor.event != null) {
			applySourceSync({
				uPlotInstance: u,
				syncKey,
				syncMetadata,
				focusedSeriesIndex: controller.focusedSeriesIndex,
			});
			yCrosshairEl.style.display = '';
		} else {
			applyReceiverSync({ uPlotInstance: u, yCrosshairEl, syncKey, syncMetadata });
		}
	};
}
