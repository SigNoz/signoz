/**
 * AI-owned. Generated and maintained by coding agents alongside the specs that
 * use it. Do not hand-edit: regenerate it with the spec that needs the change.
 */
// The saved view spec of `/api/v2/saved_views`.

export type SavedViewSource = 'logs' | 'traces' | 'metrics' | 'meter';
export type SavedViewPanelType = 'list' | 'graph' | 'table';

export type SavedViewRequestType = 'raw' | 'time_series' | 'scalar';

export interface SavedViewColumn {
	name: string;
	signal?: string;
	fieldContext?: string;
	fieldDataType?: string;
}

export interface SavedViewDisplay {
	format?: string;
	maxLines?: number;
	fontSize?: string;
	color?: string;
}

export interface SavedViewSpec {
	displayName: string;
	panelType: SavedViewPanelType;
	requestType: SavedViewRequestType;
	queries: Record<string, unknown>[];
	selectedFields?: SavedViewColumn[];
	display?: SavedViewDisplay;
}

export interface PostableSavedView {
	generateName: true;
	source: SavedViewSource;
	schemaVersion: 'v2';
	spec: SavedViewSpec;
}

export interface GettableSavedView {
	id: string;
	name: string;
	source: SavedViewSource;
	createdBy: string;
	updatedBy?: string;
	spec: SavedViewSpec;
}

export interface LogsViewOptions {
	displayName: string;
	filter?: string;
	panelType?: SavedViewPanelType;
	/** Group by attributes of a graph or table view, as resource attributes. */
	groupBy?: string[];
	/** Defaults to timestamp and body, which a list view always shows. */
	columns?: SavedViewColumn[];
	display?: SavedViewDisplay;
}

export interface SeededView {
	id: string;
	displayName: string;
	/** The first query's filter, which the explorer sends once the view is open. */
	filter: string;
	/** What the explorer's own query for the view asks for: raw, time_series or scalar. */
	requestType: string;
}
