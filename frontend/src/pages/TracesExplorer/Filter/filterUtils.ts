export const AllTraceFilterKeyValue = {
	durationNano: 'Duration',
	status: 'Status',
	serviceName: 'Service Name',
	name: 'Operation / Name',
	rpcMethod: 'RPC Method',
	responseStatusCode: 'Status Code',
	httpHost: 'HTTP Host',
	httpMethod: 'HTTP Method',
	httpRoute: 'HTTP Route',
	httpUrl: 'HTTP Url',
	traceID: 'Trace ID',
};

export type AllTraceFilterKeys = keyof typeof AllTraceFilterKeyValue;

// Type for the values of AllTraceFilterKeyValue
export type AllTraceFilterValues = typeof AllTraceFilterKeyValue[AllTraceFilterKeys];

export const AllTraceFilterOptions = Object.keys(
	AllTraceFilterKeyValue,
) as (keyof typeof AllTraceFilterKeyValue)[];

export const statusFilterOption = ['error', 'ok'];
