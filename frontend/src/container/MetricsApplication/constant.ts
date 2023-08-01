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

export enum FORMULA {
	ERROR_PERCENTAGE = 'A*100/B',
	DATABASE_CALLS_AVG_DURATION = 'A/B',
}

export enum GraphTitle {
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
}

export enum DataType {
	STRING = 'string',
	FLOAT64 = 'float64',
	INT64 = 'int64',
}

export enum MetricsType {
	Tag = 'tag',
	Resource = 'resource',
}

export enum WidgetKeys {
	Name = 'name',
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
