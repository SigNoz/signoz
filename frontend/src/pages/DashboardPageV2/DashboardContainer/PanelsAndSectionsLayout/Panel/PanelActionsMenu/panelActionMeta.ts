import type { PanelActionCapabilities } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/panelDefinition';
import type { ComponentTypes } from 'utils/permission';

/**
 * Every action the panel menu can offer. `Record<PanelActionId, …>` below
 * forces a meta entry per id — adding an action without declaring its gates is
 * a compile error.
 */
export type PanelActionId =
	| 'view'
	| 'edit'
	| 'clone'
	| 'download'
	| 'createAlert'
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
 * WidgetHeader rules. The third gate — context (dashboard editable, target
 * sections available) — is runtime state resolved in `usePanelActionItems`,
 * not declarable here.
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
