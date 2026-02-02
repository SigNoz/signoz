import { LOCALSTORAGE } from 'constants/localStorage';

import { GraphVisibilityState, SeriesVisibilityItem } from '../types';

/**
 * Retrieves the visibility map for a specific widget from localStorage
 * @param widgetId - The unique identifier of the widget
 * @returns A Map of series labels to their visibility state, or null if not found
 */
export function getStoredSeriesVisibility(
	widgetId: string,
): Map<string, boolean> | null {
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

		return new Map(widgetState.dataIndex.map((item) => [item.label, item.show]));
	} catch {
		// Silently handle parsing errors - fall back to default visibility
		return null;
	}
}

export function updateSeriesVisibilityToLocalStorage(
	widgetId: string,
	seriesVisibility: SeriesVisibilityItem[],
): void {
	try {
		const storedData = localStorage.getItem(LOCALSTORAGE.GRAPH_VISIBILITY_STATES);

		let visibilityStates: GraphVisibilityState[];

		if (!storedData) {
			visibilityStates = [
				{
					name: widgetId,
					dataIndex: seriesVisibility,
				},
			];
		} else {
			visibilityStates = JSON.parse(storedData);
		}
		const widgetState = visibilityStates.find((state) => state.name === widgetId);

		if (!widgetState) {
			visibilityStates = [
				...visibilityStates,
				{
					name: widgetId,
					dataIndex: seriesVisibility,
				},
			];
		} else {
			widgetState.dataIndex = seriesVisibility;
		}

		localStorage.setItem(
			LOCALSTORAGE.GRAPH_VISIBILITY_STATES,
			JSON.stringify(visibilityStates),
		);
	} catch {
		// Silently handle parsing errors - fall back to default visibility
	}
}
