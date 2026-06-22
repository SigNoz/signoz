import { PanelMode } from 'container/DashboardContainer/visualization/panels/types';
import { SelectionPreferencesSource } from 'lib/uPlotV2/config/types';

/**
 * Drag-to-zoom "selection preference" wiring, grouped on its own so the base
 * config builder stays focused on assembling the chart. Both helpers are driven
 * purely by the render context (`PanelMode`).
 */

/**
 * Whether a chart's drag-selection preference should be persisted. Only the
 * read-only dashboard view persists it; editor/preview contexts keep it
 * ephemeral so an in-progress edit doesn't mutate saved state.
 */
export function shouldSaveSelectionPreference(panelMode: PanelMode): boolean {
	return panelMode === PanelMode.DASHBOARD_VIEW;
}

/**
 * Where the chart reads/writes its selection preference: localStorage for the
 * persisted view contexts, in-memory otherwise.
 */
export function resolveSelectionPreferencesSource(
	panelMode: PanelMode,
): SelectionPreferencesSource {
	return panelMode === PanelMode.DASHBOARD_VIEW ||
		panelMode === PanelMode.STANDALONE_VIEW
		? SelectionPreferencesSource.LOCAL_STORAGE
		: SelectionPreferencesSource.IN_MEMORY;
}
