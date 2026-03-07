export enum VIEWS {
	ALL_ENDPOINTS = 'all_endpoints',
	ENDPOINT_STATS = 'endpoint_stats',
	TOP_ERRORS = 'top_errors',
}

export const VIEW_TYPES = {
	ALL_ENDPOINTS: VIEWS.ALL_ENDPOINTS,
	ENDPOINT_STATS: VIEWS.ENDPOINT_STATS,
	TOP_ERRORS: VIEWS.TOP_ERRORS,
};

// Span attribute keys - these are the source of truth for all attribute keys
export const SPAN_ATTRIBUTES = {
	HTTP_URL: 'http_url',
	RESPONSE_STATUS_CODE: 'response_status_code',
	SERVER_NAME: 'http_host',
	SERVER_PORT: 'net.peer.port',
} as const;
