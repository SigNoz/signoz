import { TraceReducer } from 'types/reducer/trace';

export const UPDATE_TRACE_FILTER = 'UPDATE_TRACE_FILTER';
export const GET_TRACE_FILTER = 'GET_TRACE_FILTER';
export const UPDATE_TRACE_FILTER_LOADING = 'UPDATE_TRACE_FILTER_LOADING';

export const SELECT_TRACE_FILTER = 'SELECT_TRACE_FILTER';
export const UPDATE_ALL_FILTERS = 'UPDATE_ALL_FILTERS';
export const UPDATE_SELECTED_TAGS = 'UPDATE_SELECTED_TAGS';
export const UPDATE_TAG_MODAL_VISIBILITY = 'UPDATE_TAG_MODAL_VISIBILITY';

export const UPDATE_SPANS_AGGREGATE = 'UPDATE_SPANS_AGGREGATE';

export const UPDATE_IS_TAG_ERROR = 'UPDATE_IS_TAG_ERROR';

export const UPDATE_SELECTED_FUNCTION = 'UPDATE_SELECTED_FUNCTION';
export const UPDATE_SELECTED_GROUP_BY = 'UPDATE_SELECTED_GROUP_BY';

export const UPDATE_TRACE_GRAPH_LOADING = 'UPDATE_TRACE_GRAPH_LOADING';
export const UPDATE_TRACE_GRAPH_ERROR = 'UPDATE_TRACE_GRAPH_ERROR';
export const UPDATE_TRACE_GRAPH_SUCCESS = 'UPDATE_TRACE_GRAPH_SUCCESS';

export const RESET_TRACE_FILTER = 'RESET_TRACE_FILTER';
export const UPDATE_FILTER_RESPONSE_SELECTED =
	'UPDATE_FILTER_RESPONSE_SELECTED';
export const UPDATE_FILTER_EXCLUDE = 'UPDATE_FILTER_EXCLUDE';

export const UPDATE_SPAN_ORDER = 'UPDATE_SPAN_ORDER';
export const UPDATE_SPANS_AGGREGATE_PAGE_NUMBER =
	'UPDATE_SPANS_AGGREGATE_PAGE_NUMBER';
export const UPDATE_SPANS_AGGREGATE_PAGE_SIZE =
	'UPDATE_SPANS_AGGREGATE_PAGE_SIZE';
export const UPDATE_SPAN_ORDER_PARAMS = 'UPDATE_SPAN_ORDER_PARAMS';
export const UPDATE_SPAN_UPDATE_FILTER_DISPLAY_VALUE =
	'UPDATE_SPAN_UPDATE_FILTER_DISPLAY_VALUE';

export interface UpdateFilter {
	type: typeof UPDATE_TRACE_FILTER;
	payload: {
		filter: TraceReducer['filter'];
	};
}

export interface UpdateSpansAggregate {
	type: typeof UPDATE_SPANS_AGGREGATE;
	payload: {
		spansAggregate: TraceReducer['spansAggregate'];
	};
}

export interface UpdateTagVisibility {
	type: typeof UPDATE_TAG_MODAL_VISIBILITY;
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

export interface UpdateSelected {
	type: typeof UPDATE_FILTER_RESPONSE_SELECTED;
	payload: {
		filterResponseSelected: TraceReducer['filterResponseSelected'];
	};
}

export interface UpdateAllFilters {
	type: typeof UPDATE_ALL_FILTERS;
	payload: {
		filter: TraceReducer['filter'];
		selectedFilter: TraceReducer['selectedFilter'];
		filterToFetchData: TraceReducer['filterToFetchData'];
		current: TraceReducer['spansAggregate']['currentPage'];
		selectedTags: TraceReducer['selectedTags'];
		userSelected: TraceReducer['userSelectedFilter'];
		isFilterExclude: TraceReducer['isFilterExclude'];
		order: TraceReducer['spansAggregate']['order'];
		pageSize: TraceReducer['spansAggregate']['pageSize'];
		orderParam: TraceReducer['spansAggregate']['orderParam'];
		spanKind?: TraceReducer['spanKind'];
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

export interface ResetTraceFilter {
	type: typeof RESET_TRACE_FILTER;
}

export interface GetTraceFilter {
	type: typeof GET_TRACE_FILTER;
	payload: {
		filter: TraceReducer['filter'];
	};
}

export interface UpdateIsTagError {
	type: typeof UPDATE_IS_TAG_ERROR;
	payload: {
		isTagModalError: TraceReducer['isTagModalError'];
	};
}

export interface UpdateSelectedGroupBy {
	type: typeof UPDATE_SELECTED_GROUP_BY;
	payload: {
		selectedGroupBy: TraceReducer['selectedGroupBy'];
	};
}

export interface UpdateSelectedFunction {
	type: typeof UPDATE_SELECTED_FUNCTION;
	payload: {
		selectedFunction: TraceReducer['selectedFunction'];
		yAxisUnit: string | undefined;
	};
}

export interface UpdateSpanLoading {
	type: typeof UPDATE_TRACE_GRAPH_LOADING;
	payload: {
		loading: TraceReducer['spansGraph']['loading'];
	};
}

export interface UpdateSpansError {
	type: typeof UPDATE_TRACE_GRAPH_ERROR;
	payload: {
		error: TraceReducer['spansGraph']['error'];
		errorMessage: TraceReducer['spansGraph']['errorMessage'];
	};
}

export interface UpdateFilterExclude {
	type: typeof UPDATE_FILTER_EXCLUDE;
	payload: {
		isFilterExclude: TraceReducer['isFilterExclude'];
	};
}

export interface UpdateSpans {
	type: typeof UPDATE_TRACE_GRAPH_SUCCESS;
	payload: {
		data: TraceReducer['spansGraph']['payload'];
	};
}

export interface UpdateSpansAggregatePageNumber {
	type: typeof UPDATE_SPANS_AGGREGATE_PAGE_NUMBER;
	payload: {
		currentPage: TraceReducer['spansAggregate']['currentPage'];
	};
}

export interface UpdateSpanOrder {
	type: typeof UPDATE_SPAN_ORDER;
	payload: {
		order: TraceReducer['spansAggregate']['order'];
	};
}

export interface UpdateSpanSize {
	type: typeof UPDATE_SPANS_AGGREGATE_PAGE_SIZE;
	payload: {
		pageSize: TraceReducer['spansAggregate']['pageSize'];
	};
}

export interface UpdateSpanParams {
	type: typeof UPDATE_SPAN_ORDER_PARAMS;
	payload: {
		orderParam: TraceReducer['spansAggregate']['orderParam'];
	};
}

export interface UpdateTraceFilterDisplayValue {
	type: typeof UPDATE_SPAN_UPDATE_FILTER_DISPLAY_VALUE;
	payload: TraceReducer['filterDisplayValue'];
}

export type TraceActions =
	| UpdateFilter
	| GetTraceFilter
	| UpdateFilterLoading
	| SelectTraceFilter
	| UpdateAllFilters
	| UpdateSelectedTags
	| UpdateTagVisibility
	| UpdateSpansAggregate
	| UpdateIsTagError
	| UpdateSelectedGroupBy
	| UpdateSelectedFunction
	| UpdateSpanLoading
	| UpdateSpansError
	| UpdateSpans
	| ResetTraceFilter
	| UpdateSelected
	| UpdateFilterExclude
	| UpdateSpanOrder
	| UpdateSpansAggregatePageNumber
	| UpdateSpanSize
	| UpdateSpanParams
	| UpdateTraceFilterDisplayValue;
