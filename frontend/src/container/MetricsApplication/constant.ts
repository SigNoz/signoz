/* eslint-disable sonarjs/no-duplicate-string */

import { DownloadOptions } from 'container/Download/Download.types';
import { MenuItemKeys } from 'container/GridCardLayout/WidgetHeader/contants';
import {
	MetricAggregateOperator,
	TracesAggregatorOperator,
} from 'types/common/queryBuilder';

export const legend = {
	address: '{{address}}',
};

export const QUERYNAME_AND_EXPRESSION = ['A', 'B', 'C'];
export const LATENCY_AGGREGATEOPERATOR = [
	TracesAggregatorOperator.P50,
	TracesAggregatorOperator.P90,
	TracesAggregatorOperator.P99,
];
export const LATENCY_AGGREGATEOPERATOR_SPAN_METRICS = [
	MetricAggregateOperator.P50,
	MetricAggregateOperator.P90,
	MetricAggregateOperator.P99,
];

export const OPERATION_LEGENDS = ['Operations'];

export const MENU_ITEMS = [MenuItemKeys.View, MenuItemKeys.CreateAlerts];

export enum FORMULA {
	ERROR_PERCENTAGE = 'A*100/B',
	DATABASE_CALLS_AVG_DURATION = 'A/B',
	// The apdex formula is (satisfied_count + 0.5 * tolerating_count + 0 * frustating_count) / total_count
	// The satisfied_count is B, tolerating_count is C, total_count is A
	// But why do we have (B+C)/2 instead of B + C/2?
	// The way we issue the query is latency <= threshold, which means we over count i.e
	// query B => durationNano <= 500ms
	// query C => durationNano <= 2000ms
	// Since <= 2000ms includes <= 500ms, we over count, to correct we subtract B/2
	// so the full expression would be (B + C/2) - B/2 = (B+C)/2
	// However, if you add a filter on durationNano > 500ms, (filterItemC in overviewQueries) the query would be
	// B + C/2
	APDEX_TRACES = '((B + C)/2)/A',
	// The delta span metrics store delta compared to previous reporting interval
	// but not the counts for the current interval. The bucket counts are cumulative
	APDEX_DELTA_SPAN_METRICS = '((B + C)/2)/A',
	// Cumulative span metrics store the counts for all buckets
	// so we need to subtract B/2 to correct the over counting
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
	Scope = 'scope',
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
