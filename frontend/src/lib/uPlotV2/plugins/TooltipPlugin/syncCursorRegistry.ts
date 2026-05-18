import type { TooltipSyncMetadata } from './types';

/**
 * Module-level registry that tracks the metadata of the panel currently
 * acting as the cursor source (the one being hovered) per sync group.
 *
 * uPlot fires the source panel's setCursor hook before broadcasting to
 * receivers, so the registry is always populated before receivers read it.
 *
 * Receivers use this to make decisions such as:
 * - Whether to show the horizontal crosshair line (matching yAxisUnit)
 * - Which series to highlight when panels share the same groupBy
 */
const metadataBySyncKey = new Map<string, TooltipSyncMetadata | undefined>();
const activeSeriesMetricBySyncKey = new Map<
	string,
	Record<string, string> | null
>();

export const syncCursorRegistry = {
	setMetadata(syncKey: string, metadata: TooltipSyncMetadata | undefined): void {
		metadataBySyncKey.set(syncKey, metadata);
	},

	getMetadata(syncKey: string): TooltipSyncMetadata | undefined {
		return metadataBySyncKey.get(syncKey);
	},

	setActiveSeriesMetric(
		syncKey: string,
		metric: Record<string, string> | null,
	): void {
		activeSeriesMetricBySyncKey.set(syncKey, metric);
	},

	getActiveSeriesMetric(syncKey: string): Record<string, string> | null {
		return activeSeriesMetricBySyncKey.get(syncKey) ?? null;
	},
};
