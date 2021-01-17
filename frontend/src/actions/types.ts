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
	updateTraceFilters,
	updateInput,
	fetchTraces,
	fetchTraceItem,
	getServicesList,
	getServiceMetrics,
	getTopEndpoints,
	getUsageData,
	updateTimeInterval,
	getFilteredTraceMetrics,
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
