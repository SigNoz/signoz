import type { Dispatch } from 'react';
import { useReducer } from 'react';

import type { MarkerControlState, MarkerQueryState } from '../types';

export const MARKER_ACTIONS = {
	TOGGLE_SHOW_MARKERS: 'toggleShowMarkers',
	SET_MARKER_SERVICES: 'setMarkerServices',
	SET_MARKER_TYPES: 'setMarkerTypes',
	SET_DEFAULTS_ON: 'setDefaultsOn',
	RESET: 'reset',
} as const;

export type MarkerActionType = typeof MARKER_ACTIONS[keyof typeof MARKER_ACTIONS];

export type MarkerControlAction =
	| { type: typeof MARKER_ACTIONS.TOGGLE_SHOW_MARKERS; payload: boolean }
	| { type: typeof MARKER_ACTIONS.SET_MARKER_SERVICES; payload: string[] }
	| { type: typeof MARKER_ACTIONS.SET_MARKER_TYPES; payload: string[] }
	| {
			type: typeof MARKER_ACTIONS.SET_DEFAULTS_ON;
			payload: { markerServices: string[]; markerTypes: string[] };
	  }
	| { type: typeof MARKER_ACTIONS.RESET };

function normalizeInitialState(
	state: MarkerQueryState | null,
): MarkerControlState {
	return {
		showMarkers: state?.showMarkers ? 1 : 0,
		markerServices: state?.markerServices || [],
		markerTypes: state?.markerTypes || [],
	};
}

function reducer(
	state: MarkerControlState,
	action: MarkerControlAction,
): MarkerControlState {
	switch (action.type) {
		case MARKER_ACTIONS.TOGGLE_SHOW_MARKERS:
			return { ...state, showMarkers: action.payload ? 1 : 0 };
		case MARKER_ACTIONS.SET_MARKER_SERVICES:
			return { ...state, markerServices: action.payload };
		case MARKER_ACTIONS.SET_MARKER_TYPES:
			return { ...state, markerTypes: action.payload };
		case MARKER_ACTIONS.SET_DEFAULTS_ON:
			return {
				...state,
				showMarkers: 1,
				markerServices: action.payload.markerServices,
				markerTypes: action.payload.markerTypes,
			};
		case MARKER_ACTIONS.RESET:
			return { showMarkers: 0, markerServices: [], markerTypes: [] };
		default:
			return state;
	}
}

export default function useMarkerControlState(
	initialQueryState: MarkerQueryState | null,
): {
	store: MarkerControlState;
	dispatch: Dispatch<MarkerControlAction>;
} {
	const initial = normalizeInitialState(initialQueryState);
	const [store, dispatch] = useReducer(reducer, initial);
	return { store, dispatch };
}
