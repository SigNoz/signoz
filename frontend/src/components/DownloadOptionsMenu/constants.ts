// TODO: Remove this hack once backend correctly returns all columns when selectFields is empty (traces).
// See: https://github.com/SigNoz/signoz/issues/...
import { TelemetryFieldKey } from 'api/v5/v5';

export const ALL_TRACE_COLUMNS: TelemetryFieldKey[] = [
	// intrinsic span fields
	{
		name: 'timestamp',
		signal: 'traces',
		fieldContext: 'span',
		fieldDataType: 'number',
	},
	{
		name: 'trace_id',
		signal: 'traces',
		fieldContext: 'span',
		fieldDataType: 'string',
	},
	{
		name: 'span_id',
		signal: 'traces',
		fieldContext: 'span',
		fieldDataType: 'string',
	},
	{
		name: 'parent_span_id',
		signal: 'traces',
		fieldContext: 'span',
		fieldDataType: 'string',
	},
	{
		name: 'trace_state',
		signal: 'traces',
		fieldContext: 'span',
		fieldDataType: 'string',
	},
	{
		name: 'flags',
		signal: 'traces',
		fieldContext: 'span',
		fieldDataType: 'number',
	},
	{
		name: 'name',
		signal: 'traces',
		fieldContext: 'span',
		fieldDataType: 'string',
	},
	{
		name: 'kind_string',
		signal: 'traces',
		fieldContext: 'span',
		fieldDataType: 'string',
	},
	{
		name: 'duration_nano',
		signal: 'traces',
		fieldContext: 'span',
		fieldDataType: 'number',
	},
	{
		name: 'status_code',
		signal: 'traces',
		fieldContext: 'span',
		fieldDataType: 'number',
	},
	{
		name: 'status_message',
		signal: 'traces',
		fieldContext: 'span',
		fieldDataType: 'string',
	},
	{
		name: 'status_code_string',
		signal: 'traces',
		fieldContext: 'span',
		fieldDataType: 'string',
	},
	// derived span fields
	{
		name: 'response_status_code',
		signal: 'traces',
		fieldContext: 'span',
		fieldDataType: 'string',
	},
	{
		name: 'external_http_url',
		signal: 'traces',
		fieldContext: 'span',
		fieldDataType: 'string',
	},
	{
		name: 'http_url',
		signal: 'traces',
		fieldContext: 'span',
		fieldDataType: 'string',
	},
	{
		name: 'external_http_method',
		signal: 'traces',
		fieldContext: 'span',
		fieldDataType: 'string',
	},
	{
		name: 'http_method',
		signal: 'traces',
		fieldContext: 'span',
		fieldDataType: 'string',
	},
	{
		name: 'http_host',
		signal: 'traces',
		fieldContext: 'span',
		fieldDataType: 'string',
	},
	{
		name: 'db_name',
		signal: 'traces',
		fieldContext: 'span',
		fieldDataType: 'string',
	},
	{
		name: 'db_operation',
		signal: 'traces',
		fieldContext: 'span',
		fieldDataType: 'string',
	},
	{
		name: 'has_error',
		signal: 'traces',
		fieldContext: 'span',
		fieldDataType: 'bool',
	},
	{
		name: 'is_remote',
		signal: 'traces',
		fieldContext: 'span',
		fieldDataType: 'string',
	},
	// resource fields
	{
		name: 'service.name',
		signal: 'traces',
		fieldContext: 'resource',
		fieldDataType: 'string',
	},
	{
		name: 'cloud.account.id',
		signal: 'traces',
		fieldContext: 'resource',
		fieldDataType: 'string',
	},
	{
		name: 'cloud.platform',
		signal: 'traces',
		fieldContext: 'resource',
		fieldDataType: 'string',
	},
	{
		name: 'cloud.provider',
		signal: 'traces',
		fieldContext: 'resource',
		fieldDataType: 'string',
	},
	{
		name: 'cloud.region',
		signal: 'traces',
		fieldContext: 'resource',
		fieldDataType: 'string',
	},
	{
		name: 'deployment.environment',
		signal: 'traces',
		fieldContext: 'resource',
		fieldDataType: 'string',
	},
	{
		name: 'host.name',
		signal: 'traces',
		fieldContext: 'resource',
		fieldDataType: 'string',
	},
	{
		name: 'k8s.cluster.name',
		signal: 'traces',
		fieldContext: 'resource',
		fieldDataType: 'string',
	},
	{
		name: 'k8s.namespace.name',
		signal: 'traces',
		fieldContext: 'resource',
		fieldDataType: 'string',
	},
	{
		name: 'k8s.node.name',
		signal: 'traces',
		fieldContext: 'resource',
		fieldDataType: 'string',
	},
	{
		name: 'k8s.pod.name',
		signal: 'traces',
		fieldContext: 'resource',
		fieldDataType: 'string',
	},
	{
		name: 'k8s.pod.start_time',
		signal: 'traces',
		fieldContext: 'resource',
		fieldDataType: 'string',
	},
	{
		name: 'k8s.pod.uid',
		signal: 'traces',
		fieldContext: 'resource',
		fieldDataType: 'string',
	},
	{
		name: 'k8s.statefulset.name',
		signal: 'traces',
		fieldContext: 'resource',
		fieldDataType: 'string',
	},
	{
		name: 'service.version',
		signal: 'traces',
		fieldContext: 'resource',
		fieldDataType: 'string',
	},
	{
		name: 'signoz.deployment.tier',
		signal: 'traces',
		fieldContext: 'resource',
		fieldDataType: 'string',
	},
	{
		name: 'signoz.workload',
		signal: 'traces',
		fieldContext: 'resource',
		fieldDataType: 'string',
	},
	{
		name: 'signoz.workspace.key.id',
		signal: 'traces',
		fieldContext: 'resource',
		fieldDataType: 'string',
	},
	// span attributes
	{
		name: 'client.address',
		signal: 'traces',
		fieldContext: 'attribute',
		fieldDataType: 'string',
	},
	{
		name: 'http.request.method',
		signal: 'traces',
		fieldContext: 'attribute',
		fieldDataType: 'string',
	},
	{
		name: 'http.response.body.size',
		signal: 'traces',
		fieldContext: 'attribute',
		fieldDataType: 'string',
	},
	{
		name: 'http.response.status_code',
		signal: 'traces',
		fieldContext: 'attribute',
		fieldDataType: 'string',
	},
	{
		name: 'http.route',
		signal: 'traces',
		fieldContext: 'attribute',
		fieldDataType: 'string',
	},
	{
		name: 'network.peer.address',
		signal: 'traces',
		fieldContext: 'attribute',
		fieldDataType: 'string',
	},
	{
		name: 'network.peer.port',
		signal: 'traces',
		fieldContext: 'attribute',
		fieldDataType: 'string',
	},
	{
		name: 'network.protocol.version',
		signal: 'traces',
		fieldContext: 'attribute',
		fieldDataType: 'string',
	},
	{
		name: 'server.address',
		signal: 'traces',
		fieldContext: 'attribute',
		fieldDataType: 'string',
	},
	{
		name: 'url.path',
		signal: 'traces',
		fieldContext: 'attribute',
		fieldDataType: 'string',
	},
	{
		name: 'url.scheme',
		signal: 'traces',
		fieldContext: 'attribute',
		fieldDataType: 'string',
	},
	{
		name: 'db.operation',
		signal: 'traces',
		fieldContext: 'attribute',
		fieldDataType: 'string',
	},
	{
		name: 'db.statement',
		signal: 'traces',
		fieldContext: 'attribute',
		fieldDataType: 'string',
	},
	{
		name: 'db.system',
		signal: 'traces',
		fieldContext: 'attribute',
		fieldDataType: 'string',
	},
];

export const DownloadFormats = {
	CSV: 'csv',
	JSONL: 'jsonl',
};

export const DownloadColumnsScopes = {
	ALL: 'all',
	SELECTED: 'selected',
};

export const DownloadRowCounts = {
	TEN_K: 10_000,
	THIRTY_K: 30_000,
	FIFTY_K: 50_000,
};
