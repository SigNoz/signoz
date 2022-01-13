import { TraceReducer } from 'types/reducer/trace';

export const UPDATE_TRACE_FILTER = 'UPDATE_TRACE_FILTER';
export const GET_TRACE_FILTER = 'GET_TRACE_FILTER';
export const UPDATE_TRACE_FILTER_LOADING = 'UPDATE_TRACE_FILTER_LOADING';
export const SELECT_TRACE_FILTER = 'SELECT_TRACE_FILTER';
export const UPDATE_FILTER_TO_FETCH_DATA = 'UPDATE_FILTER_TO_UPDATE_DATA';
export const UPDATE_ALL_FILTERS = 'UPDATE_ALL_FILTERS';

export interface UpdateFilter {
	type: typeof UPDATE_TRACE_FILTER;
	payload: {
		filter: TraceReducer['filter'];
	};
}

export interface UpdateAllFilters {
	type: typeof UPDATE_ALL_FILTERS;
	payload: {
		filter: TraceReducer['filter'];
		selectedFilter: TraceReducer['selectedFilter'];
		filterToFetchData: TraceReducer['filterToFetchData'];
	};
}

export interface UpdateFilterToFetchData {
	type: typeof UPDATE_FILTER_TO_FETCH_DATA;
	payload: {
		filterToFetchData: TraceReducer['filterToFetchData'];
	};
}

export interface UpdateFilterLoading {
	type: typeof UPDATE_TRACE_FILTER_LOADING;
	payload: {
		filterLoading: TraceReducer['filterLoading'];
	};
}

export interface SelectTraceFilter {
	type: typeof SELECT_TRACE_FILTER;
	payload: {
		selectedFilter: TraceReducer['selectedFilter'];
	};
}

export interface GetTraceFilter {
	type: typeof GET_TRACE_FILTER;
	payload: {
		filter: TraceReducer['filter'];
	};
}

export type TraceActions =
	| UpdateFilter
	| GetTraceFilter
	| UpdateFilterLoading
	| SelectTraceFilter
	| UpdateFilterToFetchData
	| UpdateAllFilters;
