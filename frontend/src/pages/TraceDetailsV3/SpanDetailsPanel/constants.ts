import { SPAN_ACTION } from './hooks/useSpanAttributeActions';

// Action identifiers for built-in PrettyView actions (copy, pin)
export const PRETTY_VIEW_ACTION = {
	COPY: 'copy',
	PIN: 'pin',
} as const;

// Which actions are visible per node type — drives the entire menu
export const VISIBLE_ACTIONS = {
	leaf: [
		PRETTY_VIEW_ACTION.COPY,
		PRETTY_VIEW_ACTION.PIN,
		SPAN_ACTION.FILTER_IN,
		SPAN_ACTION.FILTER_OUT,
		SPAN_ACTION.GROUP_BY,
	],
	nested: [PRETTY_VIEW_ACTION.COPY],
} as const;

export enum SpanDetailVariant {
	DRAWER = 'drawer',
	DIALOG = 'dialog',
	DOCKED = 'docked',
}

export const KEY_ATTRIBUTE_KEYS: Record<string, string[]> = {
	traces: [
		'service.name',
		'service.namespace',
		'deployment.environment',
		'timestamp',
		'duration_nano',
		'kind_string',
		'status_code_string',
		'http_method',
		'http_url',
		'http_host',
		'db_name',
		'db_operation',
		'external_http_method',
		'external_http_url',
		'response_status_code',
	],
};
