import type { PanelActionCapabilities } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/panelDefinition';
import type { ComponentTypes } from 'utils/permission';

/**
 * Every action the panel menu can offer: per-kind gated capabilities (minus
 * `search`, a header control) plus the chrome actions every kind gets. The
 * `Record<PanelActionId, …>` below forces a meta entry per id, so adding an
 * action without declaring its gates is a compile error.
 */
export type PanelActionId =
	| Exclude<keyof PanelActionCapabilities, 'search'>
	| 'move'
	| 'delete';

export interface PanelActionMeta {
	/**
	 * Role gate: componentPermission key checked against the current user.
	 * Absent = available to every role (V1 parity: view, download and
	 * create-alerts were never role-gated).
	 */
	permission?: ComponentTypes;
	/**
	 * Kind gate: the PanelActionCapabilities flag this action requires.
	 * Chrome actions (move/clone/delete) are layout concerns available for
	 * every panel kind — including kinds V2 can't render — so they declare none.
	 */
	capability?: keyof PanelActionCapabilities;
}

/**
 * Single source of truth for how each panel action is gated, mirroring V1's
 * WidgetHeader rules. The third gate — context (editable, target sections) — is
 * runtime state resolved in `usePanelActionItems`, not declarable here.
 */
export const PANEL_ACTION_META: Record<PanelActionId, PanelActionMeta> = {
	view: { capability: 'view' },
	edit: { permission: 'edit_widget', capability: 'edit' },
	clone: { permission: 'edit_widget' },
	download: { capability: 'download' },
	createAlert: { capability: 'createAlert' },
	// Moving a panel between sections mutates the dashboard layout.
	move: { permission: 'edit_dashboard' },
	delete: { permission: 'delete_widget' },
};
