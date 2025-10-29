import type { MarkerQueryState } from 'components/PanelMarkersControl/types';
import { LOCALSTORAGE } from 'constants/localStorage';

// CHECK LOGIC AND CREATE UTIL
export function getMarkerStateFromQuery(
	urlQuery: URLSearchParams,
): MarkerQueryState | null {
	const showMarkers = urlQuery.get('showMarkers') === '1';
	const servicesRaw = urlQuery.get('markerServices') || '';

	if (!showMarkers) {
		return null;
	}

	const markerTypesParam = urlQuery.get('markerTypes') || '';

	const markerTypes = markerTypesParam
		.split(',')
		.map((t) => t.trim())
		.filter((t) => t.length > 0);

	const markerServices = servicesRaw
		.split(',')
		.map((s) => s.trim())
		.filter((s) => s.length > 0);

	return {
		showMarkers: 1,
		markerServices,
		markerTypes,
	};
}

export const getLocalStorageState = (key: string): MarkerQueryState | null => {
	const raw = localStorage.getItem(LOCALSTORAGE.MARKERS_OVERLAY_STATE);
	try {
		const parsed = raw ? JSON.parse(raw) : null;
		return parsed?.[key] ?? null;
	} catch (_) {
		return null;
	}
};

export const getQueryParamsFromState = (
	params: URLSearchParams,
	state: MarkerQueryState,
): URLSearchParams => {
	if (!state) {
		return params;
	}
	if (state.showMarkers) {
		params.set('showMarkers', String(state.showMarkers) || '0');
	}
	if (Array.isArray(state.markerServices) && state.markerServices.length > 0) {
		params.set('markerServices', state.markerServices.join(','));
	}
	if (Array.isArray(state.markerTypes) && state.markerTypes.length > 0) {
		params.set('markerTypes', state.markerTypes.join(','));
	}
	return params;
};

export const setLocalStorageState = (
	key: string,
	state: MarkerQueryState | null,
): void => {
	if (!key || key.trim().length === 0) {
		return;
	}

	try {
		const raw = localStorage.getItem(LOCALSTORAGE.MARKERS_OVERLAY_STATE);
		let obj: Record<string, unknown> = {};
		try {
			obj = raw ? JSON.parse(raw) : {};
		} catch (_) {
			obj = {};
		}
		obj[key] = state;
		localStorage.setItem(LOCALSTORAGE.MARKERS_OVERLAY_STATE, JSON.stringify(obj));
	} catch (_) {
		// ignore storage errors
	}
};

export const getInitialStateForControls = (
	key: string,
	urlQuery: URLSearchParams,
): MarkerQueryState | null => {
	const queryState = getMarkerStateFromQuery(urlQuery);
	const localStorageState = getLocalStorageState(key);
	return queryState ?? localStorageState;
};

export const clearLocalStorageState = (key: string): void => {
	if (!key || key.trim().length === 0) {
		return;
	}
	const raw = localStorage.getItem(LOCALSTORAGE.MARKERS_OVERLAY_STATE);
	let obj: Record<string, unknown> = {};
	try {
		obj = raw ? JSON.parse(raw) : {};
	} catch (_) {
		obj = {};
	}
	delete obj[key];
	localStorage.setItem(LOCALSTORAGE.MARKERS_OVERLAY_STATE, JSON.stringify(obj));
};
