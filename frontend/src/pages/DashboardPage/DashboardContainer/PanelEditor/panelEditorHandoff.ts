import type { DashboardtypesPanelSpecDTO } from 'api/generated/services/sigNoz.schemas';

/**
 * Router location state for opening the panel editor pre-loaded with edits instead of
 * the saved panel. The View modal sets this so "Switch to Edit Mode" carries its
 * drilldown-edited spec (queries/plugin) into the editor.
 */
export interface PanelEditorHandoffState {
	editSpec?: DashboardtypesPanelSpecDTO;
}
