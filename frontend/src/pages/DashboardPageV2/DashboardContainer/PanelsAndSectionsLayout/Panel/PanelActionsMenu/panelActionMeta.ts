import type { PanelActionCapabilities } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/panelDefinition';

/**
 * Every action the panel menu can offer: per-kind gated capabilities (minus
 * `search` and `drilldown`, which are renderer-wired controls, not menu items)
 * plus the chrome actions every kind gets. The `Record<PanelActionId, …>` below
 * forces a meta entry per id, so adding an action without declaring its gates is
 * a compile error.
 */
export type PanelActionId =
	| Exclude<keyof PanelActionCapabilities, 'search' | 'drilldown'>
	| 'move'
	| 'delete';

export interface PanelActionMeta {
	/**
	 * Kind gate: the PanelActionCapabilities flag this action requires.
	 * Chrome actions (move/clone/delete) are layout concerns available for
	 * every panel kind — including kinds V2 can't render — so they declare none.
	 */
	capability?: keyof PanelActionCapabilities;
}

/**
 * Single source of truth for the kind gate on each panel action. Whether the
 * user may take it (dashboard edit rights) and whether the context allows it
 * (target sections present) are runtime state resolved in `usePanelActionItems`.
 */
export const PANEL_ACTION_META: Record<PanelActionId, PanelActionMeta> = {
	view: { capability: 'view' },
	edit: { capability: 'edit' },
	clone: {},
	// Single entry for every export format (CSV/PNG/SVG); the per-format options
	// live in usePanelActionItems.
	download: { capability: 'download' },
	createAlert: { capability: 'createAlert' },
	// Moving a panel between sections mutates the dashboard layout.
	move: {},
	delete: {},
};
