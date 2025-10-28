export interface MarkerControlState {
	showMarkers: number;
	markerServices: string[];
	markerTypes: string[];
}

export type MarkerQueryState = MarkerControlState | null;
