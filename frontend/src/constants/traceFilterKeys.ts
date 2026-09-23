import { SPAN_ATTRIBUTES } from 'container/ApiMonitoring/Explorer/Domains/DomainDetails/constants';
import {
	BaseAutocompleteData,
	DataTypes,
} from 'types/api/queryBuilder/queryAutocompleteResponse';

/** Trace attribute key -> label shown in quick filters, the options menu and APM "view traces" links. */
export const AllTraceFilterKeyValue: Record<string, string> = {
	durationNanoMin: 'Duration',
	durationNano: 'Duration',
	duration_nano: 'Duration',
	durationNanoMax: 'Duration',
	'deployment.environment': 'Environment',
	hasError: 'Status',
	has_error: 'Status',
	serviceName: 'Service Name',
	'service.name': 'service.name',
	name: 'Operation / Name',
	rpcMethod: 'RPC Method',
	'rpc.method': 'RPC Method',
	responseStatusCode: 'Status Code',
	response_status_code: 'Status Code',
	httpHost: 'HTTP Host',
	http_host: 'HTTP Host',
	httpMethod: 'HTTP Method',
	http_method: 'HTTP Method',
	httpRoute: 'HTTP Route',
	'http.route': 'HTTP Route',
	httpUrl: 'HTTP URL',
	[SPAN_ATTRIBUTES.HTTP_URL]: 'HTTP URL',
	traceID: 'Trace ID',
	trace_id: 'Trace ID',
} as const;

export type AllTraceFilterKeys = keyof typeof AllTraceFilterKeyValue;

export const traceFilterKeys: Record<AllTraceFilterKeys, BaseAutocompleteData> =
	{
		durationNano: {
			key: 'durationNano',
			dataType: DataTypes.Float64,
			type: 'tag',
			id: 'durationNano--float64--tag--true',
		},
		hasError: {
			key: 'hasError',
			dataType: DataTypes.bool,
			type: 'tag',
			id: 'hasError--bool--tag--true',
		},
		serviceName: {
			key: 'serviceName',
			dataType: DataTypes.String,
			type: 'tag',
			id: 'serviceName--string--tag--true',
		},

		'deployment.environment': {
			key: 'deployment.environment',
			dataType: DataTypes.String,
			type: 'resource',
			id: 'deployment.environment--string--resource--false',
		},
		name: {
			key: 'name',
			dataType: DataTypes.String,
			type: 'tag',
			id: 'name--string--tag--true',
		},
		rpcMethod: {
			key: 'rpcMethod',
			dataType: DataTypes.String,
			type: 'tag',
			id: 'rpcMethod--string--tag--true',
		},
		responseStatusCode: {
			key: 'responseStatusCode',
			dataType: DataTypes.String,
			type: 'tag',
			id: 'responseStatusCode--string--tag--true',
		},
		httpHost: {
			key: 'httpHost',
			dataType: DataTypes.String,
			type: 'tag',
			id: 'httpHost--string--tag--true',
		},
		httpMethod: {
			key: 'httpMethod',
			dataType: DataTypes.String,
			type: 'tag',
			id: 'httpMethod--string--tag--true',
		},
		httpRoute: {
			key: 'httpRoute',
			dataType: DataTypes.String,
			type: 'tag',
			id: 'httpRoute--string--tag--true',
		},
		httpUrl: {
			key: 'httpUrl',
			dataType: DataTypes.String,
			type: 'tag',
			id: 'httpUrl--string--tag--true',
		},
		traceID: {
			key: 'traceID',
			dataType: DataTypes.String,
			type: 'tag',
			id: 'traceID--string--tag--true',
		},
		durationNanoMin: {
			key: 'durationNanoMin',
			dataType: DataTypes.Float64,
			type: 'tag',
			id: 'durationNanoMin--float64--tag--true',
		},
		durationNanoMax: {
			key: 'durationNanoMax',
			dataType: DataTypes.Float64,
			type: 'tag',
			id: 'durationNanoMax--float64--tag--true',
		},
	} as const;
