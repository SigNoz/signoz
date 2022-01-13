import { TraceReducer } from 'types/reducer/trace';

export const UPDATE_TRACE_FILTER = 'UPDATE_TRACE_FILTER';
export const GET_TRACE_FILTER = 'GET_TRACE_FILTER';
export const UPDATE_TRACE_FILTER_LOADING = 'UPDATE_TRACE_FILTER_LOADING';
export const SELECT_TRACE_FILTER = 'SELECT_TRACE_FILTER';

export interface UpdateFilter {
	type: typeof UPDATE_TRACE_FILTER;
	payload: {
		filter: TraceReducer['filter'];
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
	| SelectTraceFilter;
