/**
 * Represents the visibility state of a single series in a graph
 */
export interface SeriesVisibilityItem {
	label: string;
	show: boolean;
}

/**
 * Represents the stored visibility state for a widget/graph
 */
export interface GraphVisibilityState {
	name: string;
	dataIndex: SeriesVisibilityItem[];
}

/**
 * Context in which a panel is rendered. Used to vary behavior (e.g. persistence,
 * interactions) per context.
 */
export enum PanelMode {
	/** Panel opened in full-screen / standalone view (e.g. from a dashboard widget). */
	STANDALONE_VIEW = 'STANDALONE_VIEW',
	/** Panel in the widget builder while editing a dashboard. */
	DASHBOARD_EDIT = 'DASHBOARD_EDIT',
	/** Panel rendered as a widget on a dashboard (read-only view). */
	DASHBOARD_VIEW = 'DASHBOARD_VIEW',
}
