import { MetricsActionTypes } from './metricsActionTypes';

export interface servicesListItem {
	serviceName: string;
	p99: number;
	avgDuration: number;
	numCalls: number;
	callRate: number;
	numErrors: number;
	errorRate: number;
}

export interface metricItem {
	timestamp: number;
	p50: number;
	p95: number;
	p99: number;
	numCalls: number;
	callRate: number;
	numErrors: number;
	errorRate: number;
}

export interface externalMetricsAvgDurationItem {
	avgDuration: number;
	timestamp: number;
}

export interface externalErrCodeMetricsItem {
	externalHttpUrl: string;
	numCalls: number;
	timestamp: number;
	callRate: number;
}
export interface topEndpointListItem {
	p50: number;
	p95: number;
	p99: number;
	numCalls: number;
	name: string;
}

export interface externalMetricsItem {
	avgDuration: number;
	callRate: number;
	externalHttpUrl: string;
	numCalls: number;
	timestamp: number;
}

export interface dbOverviewMetricsItem {
	avgDuration: number;
	callRate: number;
	dbSystem: string;
	numCalls: number;
	timestamp: number;
}

export interface customMetricsItem {
	timestamp: number;
	value: number;
}

export interface getServicesListAction {
	type: MetricsActionTypes.getServicesList;
	payload: servicesListItem[];
}

export interface externalErrCodeMetricsActions {
	type: MetricsActionTypes.getErrCodeMetrics;
	payload: externalErrCodeMetricsItem[];
}
export interface externalMetricsAvgDurationAction {
	type: MetricsActionTypes.getAvgDurationMetrics;
	payload: externalMetricsAvgDurationItem[];
}
export interface getServiceMetricsAction {
	type: MetricsActionTypes.getServiceMetrics;
	payload: metricItem[];
}
export interface getExternalMetricsAction {
	type: MetricsActionTypes.getExternalMetrics;
	payload: externalMetricsItem[];
}

export interface getDbOverViewMetricsAction {
	type: MetricsActionTypes.getDbOverviewMetrics;
	payload: dbOverviewMetricsItem[];
}
export interface getTopEndpointsAction {
	type: MetricsActionTypes.getTopEndpoints;
	payload: topEndpointListItem[];
}

export interface getFilteredTraceMetricsAction {
	type: MetricsActionTypes.getFilteredTraceMetrics;
	payload: customMetricsItem[];
}
