import {
	ActionTypes,
	Action,
	servicesListItem,
	metricItem,
	topEndpointListItem,
	externalErrCodeMetricsItem,
	customMetricsItem,
	externalMetricsItem,
	dbOverviewMetricsItem,
	externalMetricsAvgDurationItem,
} from "../actions";

export const serviceTableReducer = (
	state: servicesListItem[] = [
		{
			serviceName: "",
			p99: 0,
			avgDuration: 0,
			numCalls: 0,
			callRate: 0,
			numErrors: 0,
			errorRate: 0,
		},
	],
	action: Action,
) => {
	switch (action.type) {
		case ActionTypes.getServicesList:
			return action.payload;
		default:
			return state;
	}
};

export const serviceMetricsReducer = (
	state: metricItem[] = [
		{
			timestamp: 0,
			p50: 0,
			p90: 0,
			p99: 0,
			numCalls: 0,
			callRate: 0.0,
			numErrors: 0,
			errorRate: 0,
		},
	],
	action: Action,
) => {
	switch (action.type) {
		case ActionTypes.getServiceMetrics:
			return action.payload;
		default:
			return state;
	}
};

export const topEndpointsReducer = (
	state: topEndpointListItem[] = [
		{ p50: 0, p90: 0, p99: 0, numCalls: 0, name: "" },
	],
	action: Action,
) => {
	switch (action.type) {
		case ActionTypes.getTopEndpoints:
			return action.payload;
		default:
			return state;
	}
};

export const externalAvgDurationMetricsReducer = (
	state: externalMetricsAvgDurationItem[] = [
		{
			avgDuration: 0,
			timestamp: 0,
		},
	],
	action: Action,
) => {
	switch (action.type) {
		case ActionTypes.getAvgDurationMetrics:
			return action.payload;
		default:
			return state;
	}
};

export const externalErrCodeMetricsReducer = (
	state: externalErrCodeMetricsItem[] = [
		{
			callRate: 0,
			externalHttpUrl: "",
			numCalls: 0,
			timestamp: 0,
		},
	],
	action: Action,
) => {
	switch (action.type) {
		case ActionTypes.getErrCodeMetrics:
			return action.payload;
		default:
			return state;
	}
};

export const externalMetricsReducer = (
	state: externalMetricsItem[] = [
		{
			avgDuration: 0,
			callRate: 0,
			externalHttpUrl: "",
			numCalls: 0,
			timestamp: 0,
		},
	],
	action: Action,
) => {
	switch (action.type) {
		case ActionTypes.getExternalMetrics:
			return action.payload;
		default:
			return state;
	}
};

export const dbOverviewMetricsReducer = (
	state: dbOverviewMetricsItem[] = [
		{
			avgDuration: 0,
			callRate: 0,
			dbSystem: "",
			numCalls: 0,
			timestamp: 0,
		},
	],
	action: Action,
) => {
	switch (action.type) {
		case ActionTypes.getDbOverviewMetrics:
			return action.payload;
		default:
			return state;
	}
};

export const filteredTraceMetricsReducer = (
	state: customMetricsItem[] = [{ timestamp: 0, value: 0 }],
	action: Action,
) => {
	switch (action.type) {
		case ActionTypes.getFilteredTraceMetrics:
			return action.payload;
		default:
			return state;
	}
};
