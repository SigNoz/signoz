import {
	ActionTypes,
	Action,
	servicesListItem,
	metricItem,
	topEndpointListItem,
	customMetricsItem,
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
