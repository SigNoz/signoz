import { FetchTracesAction, FetchTraceItemAction } from "./traces";
import { updateTraceFiltersAction, updateInputTagAction } from "./traceFilters";
import {
	getServicesListAction,
	getServiceMetricsAction,
	getTopEndpointsAction,
	getFilteredTraceMetricsAction,
} from "./metrics";
import { getUsageDataAction } from "./usage";
import { updateTimeIntervalAction } from "./global";

export enum ActionTypes {
	updateTraceFilters = "UPDATE_TRACES_FILTER",
	updateInput = "UPDATE_INPUT",
	fetchTraces = "FETCH_TRACES",
	fetchTraceItem = "FETCH_TRACE_ITEM",
	getServicesList = "GET_SERVICE_LIST",
	getServiceMetrics = "GET_SERVICE_METRICS",
	getTopEndpoints = "GET_TOP_ENDPOINTS",
	getUsageData = "GET_USAGE_DATE",
	updateTimeInterval = "UPDATE_TIME_INTERVAL",
	getFilteredTraceMetrics = "GET_FILTERED_TRACE_METRICS",
}

export type Action =
	| FetchTraceItemAction
	| FetchTracesAction
	| updateTraceFiltersAction
	| updateInputTagAction
	| getServicesListAction
	| getServiceMetricsAction
	| getTopEndpointsAction
	| getUsageDataAction
	| updateTimeIntervalAction
	| getFilteredTraceMetricsAction;
