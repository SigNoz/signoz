// File: frontend/src/container/DashboardContainer/visualization/panels/utils/legendVisibilityUtils.ts
import getLocalStorageKey from 'api/browser/localstorage/get';
import removeLocalStorageKey from 'api/browser/localstorage/remove';
import setLocalStorageKey from 'api/browser/localstorage/set';
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
		const storedData = getLocalStorageKey(LOCALSTORAGE.GRAPH_VISIBILITY_STATES);

		if (!storedData) {
			return null;
		}

		const visibilityStates: GraphVisibilityState[] = JSON.parse(storedData);
		if (!Array.isArray(visibilityStates)) {
			return null;
		}

		const widgetState = visibilityStates.find((state) => state.name === widgetId);

		if (!widgetState?.dataIndex?.length) {
			return null;
		}

		return widgetState.dataIndex;
	} catch (error) {
		if (error instanceof SyntaxError) {
			console.error('Failed to parse stored series visibility state:', error);
		} else {
			console.error('Unexpected error when retrieving series visibility:', error);
		}
		return null;
	}
}

/**
 * Updates the series visibility state for a specific widget in localStorage.
 * @param widgetId - The unique identifier of the widget
 * @param visibility - Array of visibility states for each series index
 */
export function updateSeriesVisibilityToLocalStorage(
	widgetId: string,
	visibility: SeriesVisibilityItem[],
): void {
	try {
		const storedData = getLocalStorageKey(LOCALSTORAGE.GRAPH_VISIBILITY_STATES);
		let visibilityStates: GraphVisibilityState[] = [];

		if (storedData) {
			try {
				const parsed = JSON.parse(storedData);
				if (Array.isArray(parsed)) {
					visibilityStates = parsed;
				}
			} catch (parseError) {
				console.error('Failed to parse existing visibility states, initializing empty array');
			}
		}

		const existingIndex = visibilityStates.findIndex((state) => state.name === widgetId);

		if (existingIndex > -1) {
			visibilityStates[existingIndex] = { name: widgetId, dataIndex: visibility };
		} else {
			visibilityStates.push({ name: widgetId, dataIndex: visibility });
		}

		setLocalStorageKey(LOCALSTORAGE.GRAPH_VISIBILITY_STATES, JSON.stringify(visibilityStates));
	} catch (error) {
		console.error('Failed to update series visibility in localStorage:', error);
	}
}

/**
 * Removes the series visibility state for a specific widget from localStorage.
 * @param widgetId - The unique identifier of the widget
 */
export function removeSeriesVisibilityFromLocalStorage(widgetId: string): void {
	try {
		const storedData = getLocalStorageKey(LOCALSTORAGE.GRAPH_VISIBILITY_STATES);

		if (!storedData) {
			return;
		}

		const visibilityStates: GraphVisibilityState[] = JSON.parse(storedData);

		if (!Array.isArray(visibilityStates)) {
			return;
		}

		const filteredStates = visibilityStates.filter((state) => state.name !== widgetId);

		if (filteredStates.length === visibilityStates.length) {
			return;
		}

		setLocalStorageKey(LOCALSTORAGE.GRAPH_VISIBILITY_STATES, JSON.stringify(filteredStates));
	} catch (error) {
		if (error instanceof SyntaxError) {
			console.error('Failed to parse visibility states during removal:', error);
		} else {
			console.error('Failed to remove series visibility from localStorage:', error);
		}
	}
}