import { PanelMode } from 'container/DashboardContainer/visualization/panels/types';
import { SelectionPreferencesSource } from 'lib/uPlotV2/config/types';

// Drag-to-zoom "selection preference" wiring, driven by the render context.

/**
 * Whether a chart's drag-selection preference should be persisted. Only the
 * dashboard view persists it; editor/preview keep it ephemeral so an in-progress
 * edit doesn't mutate saved state.
 */
export function shouldSaveSelectionPreference(panelMode: PanelMode): boolean {
	return panelMode === PanelMode.DASHBOARD_VIEW;
}

/** Where the preference is stored: localStorage for view contexts, in-memory otherwise. */
export function resolveSelectionPreferencesSource(
	panelMode: PanelMode,
): SelectionPreferencesSource {
	return panelMode === PanelMode.DASHBOARD_VIEW ||
		panelMode === PanelMode.STANDALONE_VIEW
		? SelectionPreferencesSource.LOCAL_STORAGE
		: SelectionPreferencesSource.IN_MEMORY;
}
