import {
	externalErrCodeMetricsActions,
	externalMetricsAvgDurationAction,
	getDbOverViewMetricsAction,
	getExternalMetricsAction,
	getFilteredTraceMetricsAction,
	getServiceMetricsAction,
	getServicesListAction,
	getTopEndpointsAction,
} from './metricsInterfaces';

export enum MetricsActionTypes {
	updateInput = 'UPDATE_INPUT',
	getServicesList = 'GET_SERVICE_LIST',
	getServiceMetrics = 'GET_SERVICE_METRICS',
	getAvgDurationMetrics = 'GET_AVG_DURATION_METRICS',
	getErrCodeMetrics = 'GET_ERR_CODE_METRICS',
	getDbOverviewMetrics = 'GET_DB_OVERVIEW_METRICS',
	getExternalMetrics = 'GET_EXTERNAL_METRICS',
	getTopEndpoints = 'GET_TOP_ENDPOINTS',
	getFilteredTraceMetrics = 'GET_FILTERED_TRACE_METRICS',
}

export type MetricsActions =
	| getServicesListAction
	| getServiceMetricsAction
	| getTopEndpointsAction
	| getFilteredTraceMetricsAction
	| getExternalMetricsAction
	| externalErrCodeMetricsActions
	| getDbOverViewMetricsAction
	| externalMetricsAvgDurationAction;
