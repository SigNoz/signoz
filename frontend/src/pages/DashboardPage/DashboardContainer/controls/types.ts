import type { PanelActionId } from '../PanelsAndSectionsLayout/Panel/PanelActionsMenu/panelActionMeta';

/** Every control a host can show or hide, grouped by where it renders. */
export interface DashboardControls {
	header: { breadcrumbs: boolean; share: boolean; feedback: boolean };
	title: {
		name: boolean;
		description: boolean;
		tags: boolean;
		lock: boolean;
		publicBadge: boolean;
	};
	toolbar: {
		timeRange: boolean;
		autoRefresh: boolean;
		variables: boolean;
		addVariable: boolean;
	};
	dashboardActions: {
		fullscreen: boolean;
		rename: boolean;
		clone: boolean;
		lock: boolean;
		newSection: boolean;
		delete: boolean;
		configure: boolean;
		json: boolean;
		newPanel: boolean;
	};
	sectionActions: {
		addPanel: boolean;
		rename: boolean;
		clone: boolean;
		delete: boolean;
	};
	// Keyed by the panel menu's own ids, so a new panel action needs a control.
	// `drilldown` (click) and `zoom` (drag-select a time range) act on the chart itself.
	panelActions: Record<PanelActionId | 'drilldown' | 'zoom', boolean>;
	viewModal: { switchToEdit: boolean };
}

export type DashboardControlGroup = keyof DashboardControls;

export type DashboardControlId = {
	[
		G in DashboardControlGroup
	]: `${G}.${Extract<keyof DashboardControls[G], string>}`;
}[DashboardControlGroup];

/** A whole group as one boolean, or single items; omitted means shown. */
export type DashboardControlsInput = {
	[G in DashboardControlGroup]?: boolean | Partial<DashboardControls[G]>;
};
