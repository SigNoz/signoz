import { combineReducers } from "redux";
import {
	traceResponseNew,
	spansWSameTraceIDResponse,
	servicesListItem,
	metricItem,
	topEndpointListItem,
	externalMetricsItem,
	externalMetricsAvgDurationItem,
	usageDataItem,
	GlobalTime,
	externalErrCodeMetricsItem,
	serviceMapStore,
	customMetricsItem,
	TraceFilters,
} from "../actions";
import { updateGlobalTimeReducer } from "./global";
import {
	filteredTraceMetricsReducer,
	serviceMetricsReducer,
	externalErrCodeMetricsReducer,
	serviceTableReducer,
	topEndpointsReducer,
	dbOverviewMetricsReducer,
	externalMetricsReducer,
	externalAvgDurationMetricsReducer,
} from "./metrics";
import TraceFilterReducer from "./traceFilters";
import { traceItemReducer, tracesReducer } from "./traces";
import { usageDataReducer } from "./usage";
import { ServiceMapReducer } from "./serviceMap";
export interface StoreState {
	traceFilters: TraceFilters;
	traces: traceResponseNew;
	traceItem: spansWSameTraceIDResponse;
	servicesList: servicesListItem[];
	serviceMetrics: metricItem[];
	topEndpointsList: topEndpointListItem[];
	externalMetrics: externalMetricsItem[];
	dbOverviewMetrics: externalMetricsItem[];
	externalAvgDurationMetrics: externalMetricsAvgDurationItem[];
	externalErrCodeMetrics: externalErrCodeMetricsItem[];
	usageDate: usageDataItem[];
	globalTime: GlobalTime;
	filteredTraceMetrics: customMetricsItem[];
	serviceMap: serviceMapStore;
}

const reducers = combineReducers<StoreState>({
	traceFilters: TraceFilterReducer,
	traces: tracesReducer,
	traceItem: traceItemReducer,
	servicesList: serviceTableReducer,
	serviceMetrics: serviceMetricsReducer,
	dbOverviewMetrics: dbOverviewMetricsReducer,
	topEndpointsList: topEndpointsReducer,
	externalAvgDurationMetrics: externalAvgDurationMetricsReducer,
	externalMetrics: externalMetricsReducer,
	externalErrCodeMetrics: externalErrCodeMetricsReducer,
	usageDate: usageDataReducer,
	globalTime: updateGlobalTimeReducer,
	filteredTraceMetrics: filteredTraceMetricsReducer,
	serviceMap: ServiceMapReducer,
});

export default reducers;
