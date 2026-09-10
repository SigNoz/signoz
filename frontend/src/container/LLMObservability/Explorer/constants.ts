import { TelemetrytypesFieldContextDTO } from 'api/generated/services/sigNoz.schemas';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { FieldKeysConfig } from 'hooks/querySuggestions/useFieldKeys';
import { TelemetryFieldKey } from 'types/api/v5/queryRange';

export const DEFAULT_PANEL_TYPE = PANEL_TYPES.TRACE;

export const TOOLBAR_VIEWS = {
	trace: {
		name: 'trace',
		label: 'Trace',
		disabled: false,
		show: true,
		key: 'trace',
	},
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
	fieldContext: TelemetrytypesFieldContextDTO.trace,
} as const;

export const TRACE_VIEW_ORDER_BY_CONFIG: FieldKeysConfig = {
	...TRACE_VIEW_KEYS,
	staticFields: [{ name: 'last_activity_time' }],
};

export const TRACE_VIEW_COLUMN_CONFIG: FieldKeysConfig = {
	...TRACE_VIEW_KEYS,
	staticFields: AI_O11Y_DISPLAY_ONLY_FIELDS,
};
