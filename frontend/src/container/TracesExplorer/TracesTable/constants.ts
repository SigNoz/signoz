// Field-name allowlists that drive signal-specific cell rendering. Both legacy
// camelCase and snake_case variants are listed because the API has shipped both.
export const TIMESTAMP_FIELD_NAMES = new Set(['timestamp']);

export const STATUS_FIELD_NAMES = new Set([
	'httpMethod',
	'http_method',
	'http.method',
	'http.request.method',
	'responseStatusCode',
	'response_status_code',
	'http.status_code',
	'http.response.status_code',
]);

export const DURATION_FIELD_NAMES = new Set(['durationNano', 'duration_nano']);

export const TRACE_ID_FIELD_NAMES = new Set(['traceID', 'trace_id']);
