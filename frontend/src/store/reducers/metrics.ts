import {
	servicesListItem,
	metricItem,
	topEndpointListItem,
	externalErrCodeMetricsItem,
	customMetricsItem,
	externalMetricsItem,
	dbOverviewMetricsItem,
	externalMetricsAvgDurationItem,
} from '../actions/MetricsActions';
import { MetricsActionTypes as ActionTypes } from '../actions/MetricsActions/metricsActionTypes';

export type MetricsInitialState = {
	serviceList?: servicesListItem[];
	metricItems?: metricItem[];
	topEndpointListItem?: topEndpointListItem[];
	externalMetricsAvgDurationItem?: externalMetricsAvgDurationItem[];
	externalErrCodeMetricsItem?: externalErrCodeMetricsItem[];
	externalMetricsItem?: externalMetricsItem[];
	dbOverviewMetricsItem?: dbOverviewMetricsItem[];
	customMetricsItem?: customMetricsItem[];
};
export const metricsInitialState: MetricsInitialState = {
	serviceList: [
		{
			serviceName: '',
			p99: 0,
			avgDuration: 0,
			numCalls: 0,
			callRate: 0,
			numErrors: 0,
			errorRate: 0,
		},
	],
	metricItems: [
		{
			timestamp: 0,
			p50: 0,
			p95: 0,
			p99: 0,
			numCalls: 0,
			callRate: 0.0,
			numErrors: 0,
			errorRate: 0,
		},
	],
	topEndpointListItem: [
		{
			p50: 0,
			p95: 0,
			p99: 0,
			numCalls: 0,
			name: '',
		},
	],
	externalMetricsAvgDurationItem: [
		{
			avgDuration: 0,
			timestamp: 0,
		},
	],
	externalErrCodeMetricsItem: [
		{
			callRate: 0,
			externalHttpUrl: '',
			numCalls: 0,
			timestamp: 0,
		},
	],
	externalMetricsItem: [
		{
			avgDuration: 0,
			callRate: 0,
			externalHttpUrl: '',
			numCalls: 0,
			timestamp: 0,
		},
	],
	dbOverviewMetricsItem: [
		{
			avgDuration: 0,
			callRate: 0,
			dbSystem: '',
			numCalls: 0,
			timestamp: 0,
		},
	],
	customMetricsItem: [
		{
			timestamp: 0,
			value: 0,
		},
	],
};

type ActionType = {
	type: string;
	payload: any;
};

export const metricsReducer = (
	state: MetricsInitialState = metricsInitialState,
	action: ActionType,
) => {
	switch (action.type) {
	case ActionTypes.getFilteredTraceMetrics:
		return {
			...state,
			customMetricsItem: action.payload,
		};
	case ActionTypes.getServiceMetrics:
		return {
			...state,
			metricItems: action.payload,
		};
	case ActionTypes.getDbOverviewMetrics:
		return {
			...state,
			dbOverviewMetricsItem: action.payload,
		};
	case ActionTypes.getExternalMetrics:
		return {
			...state,
			externalMetricsItem: action.payload,
		};
	case ActionTypes.getTopEndpoints:
		return {
			...state,
			topEndpointListItem: action.payload,
		};
	case ActionTypes.getErrCodeMetrics:
		return {
			...state,
			externalErrCodeMetricsItem: action.payload,
		};
	case ActionTypes.getAvgDurationMetrics:
		return {
			...state,
			externalMetricsAvgDurationItem: action.payload,
		};

	case ActionTypes.getServicesList:
		return {
			...state,
			serviceList: action.payload,
		};
	default:
		return {
			...state,
		};
	}
};
