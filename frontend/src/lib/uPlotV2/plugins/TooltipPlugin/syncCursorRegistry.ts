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
 * - Future: what to render inside the tooltip (matching groupBy, etc.)
 */
const metadataBySyncKey = new Map<string, TooltipSyncMetadata | undefined>();

export const syncCursorRegistry = {
	setMetadata(syncKey: string, metadata: TooltipSyncMetadata | undefined): void {
		metadataBySyncKey.set(syncKey, metadata);
	},

	getMetadata(syncKey: string): TooltipSyncMetadata | undefined {
		return metadataBySyncKey.get(syncKey);
	},
};
