import { LOCALSTORAGE } from 'constants/localStorage';

import { GraphVisibilityState, SeriesVisibilityItem } from '../types';

/**
 * Retrieves the stored series visibility for a specific widget from localStorage by index.
 * Index 0 is the x-axis (time); indices 1, 2, ... are data series (same order as uPlot plot.series).
 * @param widgetId - The unique identifier of the widget
 * @returns visibility[i] = show state for series at index i, or null if not found
 */
export function getStoredSeriesVisibility(
	widgetId: string,
): SeriesVisibilityItem[] | null {
	try {
		const storedData = localStorage.getItem(LOCALSTORAGE.GRAPH_VISIBILITY_STATES);

		if (!storedData) {
			return null;
		}

		const visibilityStates: GraphVisibilityState[] = JSON.parse(storedData);
		const widgetState = visibilityStates.find((state) => state.name === widgetId);

		if (!widgetState?.dataIndex?.length) {
			return null;
		}

		return widgetState.dataIndex;
	} catch (error) {
		if (error instanceof SyntaxError) {
			// If the stored data is malformed, remove it
			localStorage.removeItem(LOCALSTORAGE.GRAPH_VISIBILITY_STATES);
		}
		// Silently handle parsing errors - fall back to default visibility
		return null;
	}
}

export function updateSeriesVisibilityToLocalStorage(
	widgetId: string,
	seriesVisibility: SeriesVisibilityItem[],
): void {
	let visibilityStates: GraphVisibilityState[] = [];
	try {
		const storedData = localStorage.getItem(LOCALSTORAGE.GRAPH_VISIBILITY_STATES);
		visibilityStates = JSON.parse(storedData || '[]');
	} catch (error) {
		if (error instanceof SyntaxError) {
			visibilityStates = [];
		}
	}
	const widgetState = visibilityStates.find((state) => state.name === widgetId);

	if (widgetState) {
		widgetState.dataIndex = seriesVisibility;
	} else {
		visibilityStates = [
			...visibilityStates,
			{
				name: widgetId,
				dataIndex: seriesVisibility,
			},
		];
	}

	localStorage.setItem(
		LOCALSTORAGE.GRAPH_VISIBILITY_STATES,
		JSON.stringify(visibilityStates),
	);
}
