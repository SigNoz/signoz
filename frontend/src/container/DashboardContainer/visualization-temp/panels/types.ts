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
