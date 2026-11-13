export const legend = {
	address: '{{address}}',
};

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
	StatusCode = 'status.code',
	Operation = 'operation',
	OperationName = 'operationName',
	OTelServiceName = 'service.name',
	ServiceName = 'serviceName',
	SignozLatencyCount = 'signoz_latency.count',
	SignozDBLatencyCount = 'signoz_db_latency_count',
	DatabaseCallCount = 'signoz_database_call_count',
	DatabaseCallLatencySum = 'signoz_database_call_latency_sum',
	SignozDbLatencySum = 'signoz_db_latency_sum',
	SignozCallsTotal = 'signoz_calls_total',
	SignozExternalCallLatencyCount = 'signoz_external_call_latency_count',
	SignozExternalCallLatencySum = 'signoz_external_call_latency_sum',
	SignozLatencyBucket = 'signoz_latency.bucket',
	DbSystem = 'db.system',
}
