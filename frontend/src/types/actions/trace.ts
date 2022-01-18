import { TraceReducer } from 'types/reducer/trace';

export const UPDATE_TRACE_FILTER = 'UPDATE_TRACE_FILTER';
export const GET_TRACE_FILTER = 'GET_TRACE_FILTER';
export const UPDATE_TRACE_FILTER_LOADING = 'UPDATE_TRACE_FILTER_LOADING';
export const SELECT_TRACE_FILTER = 'SELECT_TRACE_FILTER';
export const UPDATE_ALL_FILTERS = 'UPDATE_ALL_FILTERS';
export const UPDATE_SELECTED_TAGS = 'UPDATE_SELECTED_TAGS';
export const UPDATE_TAG_MODAL_VISIBLITY = 'UPDATE_TAG_MODAL_VISIBLITY';
export const UPDATE_SPANS_AGGREEGATE = 'UPDATE_SPANS_AGGREEGATE';

export interface UpdateFilter {
	type: typeof UPDATE_TRACE_FILTER;
	payload: {
		filter: TraceReducer['filter'];
	};
}
export interface UpdateSpansAggregate {
	type: typeof UPDATE_SPANS_AGGREEGATE;
	payload: {
		spansAggregate: TraceReducer['spansAggregate'];
	};
}
export interface UpdateTagVisiblity {
	type: typeof UPDATE_TAG_MODAL_VISIBLITY;
	payload: {
		isTagModalOpen: TraceReducer['isTagModalOpen'];
	};
}

export interface UpdateSelectedTags {
	type: typeof UPDATE_SELECTED_TAGS;
	payload: {
		selectedTags: TraceReducer['selectedTags'];
	};
}

export interface UpdateAllFilters {
	type: typeof UPDATE_ALL_FILTERS;
	payload: {
		filter: TraceReducer['filter'];
		selectedFilter: TraceReducer['selectedFilter'];
		filterToFetchData: TraceReducer['filterToFetchData'];
		current: TraceReducer['spansAggregate']['currentPage'];
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
	| UpdateAllFilters
	| UpdateSelectedTags
	| UpdateTagVisiblity
	| UpdateSpansAggregate;
