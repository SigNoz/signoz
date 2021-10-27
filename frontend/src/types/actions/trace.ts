export const GET_TRACE_INITIAL_DATA_SUCCESS = 'GET_TRACE_INITIAL_DATA_SUCCESS';
export const GET_TRACE_INITIAL_DATA_ERROR = 'GET_TRACE_INITIAL_DATA_ERROR';
export const GET_TRACE_LOADING_START = 'GET_TRACE_LOADING_START';

export const UPDATE_TRACE_FILTER = 'UPDATE_TRACE_FILTER';

export interface TraceFilters {
	tags?: TraceReducer['tags'];
	service?: TraceReducer['service'];
	latency?: TraceReducer['latency'];
	operation?: TraceReducer['operation'];
	kind?: TraceReducer['kind'];
}

import { PayloadProps } from 'types/api/trace/getServiceList';
import { TraceReducer } from 'types/reducer/trace';

interface GetTraceLoading {
	type: typeof GET_TRACE_LOADING_START;
}

interface GetTraceInitialData {
	type: typeof GET_TRACE_INITIAL_DATA_SUCCESS;
	payload: {
		serviceList: PayloadProps;
		tags?: TraceReducer['tags'];
	};
}

export interface GetTraceInitialDataError {
	type: typeof GET_TRACE_INITIAL_DATA_ERROR;
	payload: {
		errorMessage: string;
	};
}

interface UpdateTraceFilter {
	type: typeof UPDATE_TRACE_FILTER;
	payload: TraceFilters;
}

export type TraceActions =
	| GetTraceLoading
	| GetTraceInitialData
	| GetTraceInitialDataError
	| UpdateTraceFilter;
