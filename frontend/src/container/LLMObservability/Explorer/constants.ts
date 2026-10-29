import { TelemetrytypesFieldContextDTO } from 'api/generated/services/sigNoz.schemas';
import { PANEL_TYPES } from 'constants/queryBuilder';
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
export const TRACE_VIEW_COLUMN_EXTRA_FIELDS: TelemetryFieldKey[] = [
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

/**
 * Shown, in this order, until the user picks columns. The aggregates are the
 * keys the keys endpoint returns for builder_ai_query; the rest match
 * TRACE_VIEW_COLUMN_EXTRA_FIELDS, so both build the same column ids.
 */
export const TRACE_VIEW_DEFAULT_COLUMNS: TelemetryFieldKey[] = [
	{ name: 'trace_id' },
	{ name: 'service.name', fieldContext: 'resource' },
	{ name: 'root_span_name' },
	{
		name: 'estimated_total_cost',
		signal: 'traces',
		fieldContext: 'trace',
		fieldDataType: 'float64',
	},
	{ name: 'trace_duration_nano' },
	{ name: 'span_count' },
	{
		name: 'total_tokens',
		signal: 'traces',
		fieldContext: 'trace',
		fieldDataType: 'float64',
	},
	{
		name: 'input_tokens',
		signal: 'traces',
		fieldContext: 'trace',
		fieldDataType: 'float64',
	},
	{
		name: 'output_tokens',
		signal: 'traces',
		fieldContext: 'trace',
		fieldDataType: 'float64',
	},
	{
		name: 'distinct_tool_count',
		signal: 'traces',
		fieldContext: 'trace',
		fieldDataType: 'float64',
	},
	{
		name: 'llm_call_count',
		signal: 'traces',
		fieldContext: 'trace',
		fieldDataType: 'float64',
	},
	{
		name: 'tool_call_count',
		signal: 'traces',
		fieldContext: 'trace',
		fieldDataType: 'float64',
	},
	{ name: 'start_time' },
	{ name: 'end_time' },
	{ name: 'error_count' },
	{ name: 'input' },
	{ name: 'output' },
	{
		name: 'max_llm_duration_nano',
		signal: 'traces',
		fieldContext: 'trace',
		fieldDataType: 'float64',
	},
];

export const TRACE_VIEW_FIELD_KEYS = {
	fieldContext: TelemetrytypesFieldContextDTO.trace,
} as const;

export const TRACE_VIEW_BUILDER_QUERY_TYPE = 'builder_ai_query' as const;

export const TRACE_VIEW_ORDER_BY_EXTRA_FIELDS: TelemetryFieldKey[] = [
	{ name: 'last_activity_time' } as TelemetryFieldKey,
];
