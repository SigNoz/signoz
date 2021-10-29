export const GET_TRACE_INITIAL_DATA_SUCCESS = 'GET_TRACE_INITIAL_DATA_SUCCESS';
export const GET_TRACE_INITIAL_DATA_ERROR = 'GET_TRACE_INITIAL_DATA_ERROR';
export const GET_TRACE_LOADING_START = 'GET_TRACE_LOADING_START';
export const GET_TRACE_LOADING_END = 'GET_TRACE_LOADING_END';

export const UPDATE_TRACE_SELECTED_SERVICE = 'UPDATE_TRACE_SELECTED_SERVICE';
export const UPDATE_TRACE_SELECTED_OPERATION =
	'UPDATE_TRACE_SELECTED_OPERATION';
export const UPDATE_TRACE_SELECTED_LATENCY_VALUE =
	'UPDATE_TRACE_SELECTED_LATENCY_VALUE';
export const UPDATE_TRACE_SELECTED_KIND = 'UPDATE_TRACE_SELECTED_KIND';
export const UPDATE_TRACE_SELECTED_TAGS = 'UPDATE_TRACE_SELECTED_TAGS';
export const UPDATE_SELECTED_TRACE_DATA = 'UPDATE_SELECTED_TRACE_DATA';

import { TraceReducer } from 'types/reducer/trace';

interface GetTraceLoading {
	type: typeof GET_TRACE_LOADING_START | typeof GET_TRACE_LOADING_END;
}

interface GetTraceInitialData {
	type: typeof GET_TRACE_INITIAL_DATA_SUCCESS;
	payload: {
		serviceList: TraceReducer['serviceList'];
		selectedTags: TraceReducer['selectedTags'];
		operationList: TraceReducer['operationsList'];
		tagsSuggestions: TraceReducer['tagsSuggestions'];
		spansList: TraceReducer['spanList'];
		selectedService: TraceReducer['selectedService'];
		selectedOperation: TraceReducer['selectedOperation'];
		selectedLatency: TraceReducer['selectedLatency'];
		selectedKind: TraceReducer['selectedKind'];
	};
}

interface UpdateSelectedDate {
	type: typeof UPDATE_SELECTED_TRACE_DATA;
	payload: {
		operationList: TraceReducer['operationsList'];
		tagsSuggestions: TraceReducer['tagsSuggestions'];
		spansList: TraceReducer['spanList'];
		selectedKind: TraceReducer['selectedKind'];
		selectedService: TraceReducer['selectedService'];
		selectedLatency: TraceReducer['selectedLatency'];
		selectedOperation: TraceReducer['selectedOperation'];
	};
}

export interface GetTraceInitialDataError {
	type: typeof GET_TRACE_INITIAL_DATA_ERROR;
	payload: {
		errorMessage: string;
	};
}

interface UpdateTraceSelectedService {
	type: typeof UPDATE_TRACE_SELECTED_SERVICE;
	payload: {
		selectedService: TraceReducer['selectedService'];
	};
}

interface UpdateTraceSelectedOperation {
	type: typeof UPDATE_TRACE_SELECTED_OPERATION;
	payload: {
		selectedOperation: TraceReducer['selectedOperation'];
	};
}

interface UpdateTraceSelectedKind {
	type: typeof UPDATE_TRACE_SELECTED_KIND;
	payload: {
		selectedKind: TraceReducer['selectedKind'];
	};
}

interface UpdateTraceSelectedLatencyValue {
	type: typeof UPDATE_TRACE_SELECTED_LATENCY_VALUE;
	payload: {
		selectedLatency: TraceReducer['selectedLatency'];
	};
}

interface UpdateTraceSelectedTags {
	type: typeof UPDATE_TRACE_SELECTED_TAGS;
	payload: {
		selectedTags: TraceReducer['selectedTags'];
	};
}

export type TraceActions =
	| GetTraceLoading
	| GetTraceInitialData
	| GetTraceInitialDataError
	| UpdateTraceSelectedService
	| UpdateTraceSelectedLatencyValue
	| UpdateTraceSelectedKind
	| UpdateTraceSelectedOperation
	| UpdateTraceSelectedTags
	| UpdateSelectedDate;
