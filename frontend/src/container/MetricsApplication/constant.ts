/* eslint-disable sonarjs/no-duplicate-string */

import { DownloadOptions } from 'container/Download/Download.types';
import { MenuItemKeys } from 'container/GridCardLayout/WidgetHeader/contants';

export const legend = {
	address: '{{address}}',
};

export const QUERYNAME_AND_EXPRESSION = ['A', 'B', 'C'];
export const LATENCY_AGGREGATEOPERATOR = ['p50', 'p90', 'p99'];
export const LATENCY_AGGREGATEOPERATOR_SPAN_METRICS = [
	'hist_quantile_50',
	'hist_quantile_90',
	'hist_quantile_99',
];
export const OPERATION_LEGENDS = ['Operations'];

export const MENU_ITEMS = [MenuItemKeys.View, MenuItemKeys.CreateAlerts];

export enum FORMULA {
	ERROR_PERCENTAGE = 'A*100/B',
	DATABASE_CALLS_AVG_DURATION = 'A/B',
	APDEX_TRACES = '((B + C)/2)/A',
	APDEX_DELTA_SPAN_METRICS = '((B + C)/2)/A',
	APDEX_CUMULATIVE_SPAN_METRICS = '((B + C)/2)/A',
}

export const TOP_LEVEL_OPERATIONS = ['{{.top_level_operations}}'];

export enum GraphTitle {
	APDEX = 'Apdex',
	LATENCY = 'Latency',
	RATE_PER_OPS = 'Rate (ops/s)',
	ERROR_PERCENTAGE = 'Error Percentage',
	DATABASE_CALLS_RPS = 'Database Calls RPS',
	DATABASE_CALLS_AVG_DURATION = 'Database Calls Avg Duration',
	EXTERNAL_CALL_ERROR_PERCENTAGE = 'External Call Error Percentage',
	EXTERNAL_CALL_DURATION = 'External Call duration',
	EXTERNAL_CALL_RPS_BY_ADDRESS = 'External Call RPS(by Address)',
	EXTERNAL_CALL_DURATION_BY_ADDRESS = 'External Call duration(by Address)',
}

export enum KeyOperationTableHeader {
	P50 = 'P50',
	P90 = 'P90',
	P99 = 'P99',
	NUM_OF_CALLS = 'Number of Calls',
	ERROR_RATE = 'Error Rate',
	OPERATION_PR_SECOND = 'Op/s',
}

export enum MetricsType {
	Tag = 'tag',
	Resource = 'resource',
}

export enum WidgetKeys {
	Le = 'le',
	Name = 'name',
	HasError = 'hasError',
	Address = 'address',
	DurationNano = 'durationNano',
	StatusCode = 'status_code',
	Operation = 'operation',
	OperationName = 'operationName',
	Service_name = 'service_name',
	ServiceName = 'serviceName',
	SignozLatencyCount = 'signoz_latency_count',
	SignozDBLatencyCount = 'signoz_db_latency_count',
	DatabaseCallCount = 'signoz_database_call_count',
	DatabaseCallLatencySum = 'signoz_database_call_latency_sum',
	SignozDbLatencySum = 'signoz_db_latency_sum',
	SignozCallsTotal = 'signoz_calls_total',
	SignozExternalCallLatencyCount = 'signoz_external_call_latency_count',
	SignozExternalCallLatencySum = 'signoz_external_call_latency_sum',
	Signoz_latency_bucket = 'signoz_latency_bucket',
}

export const topOperationMetricsDownloadOptions: DownloadOptions = {
	isDownloadEnabled: true,
	fileName: 'top-operation',
} as const;

export const SERVICE_CHART_ID = {
	latency: 'SERVICE_OVERVIEW_LATENCY',
	error: 'SERVICE_OVERVIEW_ERROR',
	rps: 'SERVICE_OVERVIEW_RPS',
	apdex: 'SERVICE_OVERVIEW_APDEX',
	errorPercentage: 'SERVICE_OVERVIEW_ERROR_PERCENTAGE',
	dbCallsRPS: 'SERVICE_DATABASE_CALLS_RPS',
	dbCallsAvgDuration: 'SERVICE_DATABASE_CALLS_AVG_DURATION',
	externalCallDurationByAddress: 'SERVICE_EXTERNAL_CALLS_DURATION_BY_ADDRESS',
	externalCallErrorPercentage: 'SERVICE_EXTERNAL_CALLS_ERROR_PERCENTAGE',
	externalCallDuration: 'SERVICE_EXTERNAL_CALLS_DURATION',
	externalCallRPSByAddress: 'SERVICE_EXTERNAL_CALLS_RPS_BY_ADDRESS',
};
