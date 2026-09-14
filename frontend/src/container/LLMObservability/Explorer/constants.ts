import { TelemetrytypesFieldContextDTO } from 'api/generated/services/sigNoz.schemas';
import { FieldKeysConfig } from 'hooks/querySuggestions/useFieldKeysSuggestion';
import { TelemetryFieldKey } from 'types/api/v5/queryRange';

export const TOOLBAR_VIEWS = {
	list: {
		name: 'list',
		label: 'List',
		show: true,
		key: 'list',
	},
	timeseries: {
		name: 'timeseries',
		label: 'Timeseries',
		disabled: false,
		show: true,
		key: 'timeseries',
	},
	trace: {
		name: 'trace',
		label: 'Trace',
		disabled: false,
		show: true,
		key: 'trace',
	},
	table: {
		name: 'table',
		label: 'Table',
		disabled: false,
		show: true,
		key: 'table',
	},
	clickhouse: {
		name: 'clickhouse',
		label: 'Clickhouse',
		disabled: false,
		show: false,
		key: 'clickhouse',
	},
};

export const TRACE_VIEW_DEFAULT_ORDER_BY = 'last_activity_time:desc';

/** Display-only: ordering or filtering on one is an error, so the keys endpoint omits them. */
export const AI_O11Y_DISPLAY_ONLY_FIELDS: TelemetryFieldKey[] = [
	{ name: 'service.name', fieldContext: 'resource' },
	{ name: 'root_span_name' },
	{ name: 'trace_duration_nano' },
	{ name: 'span_count' },
	{ name: 'trace_id' },
	{ name: 'start_time' },
	{ name: 'end_time' },
	{ name: 'error_count' },
	{ name: 'input' },
	{ name: 'output' },
] as TelemetryFieldKey[];

const TRACE_VIEW_KEYS = {
	builderQueryType: 'builder_ai_query',
} as const;

export const TRACE_VIEW_FIELD_CONTEXT = TelemetrytypesFieldContextDTO.trace;

export const TRACE_VIEW_ORDER_BY_STATIC_FIELDS: TelemetryFieldKey[] = [
	{ name: 'last_activity_time' } as TelemetryFieldKey,
];

export const TRACE_VIEW_ORDER_BY_CONFIG: FieldKeysConfig = {
	...TRACE_VIEW_KEYS,
};

export const TRACE_VIEW_COLUMN_CONFIG: FieldKeysConfig = {
	...TRACE_VIEW_KEYS,
};
