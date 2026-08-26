import { TelemetryFieldKey } from 'api/v5/v5';
import type { TableColumnDef } from 'components/TanStackTableView/types';
import {
	getFieldColumn,
	TracesTableRow,
} from 'container/TracesExplorer/TracesTable/getFieldColumn';
import { DEFAULT_PER_PAGE_OPTIONS } from 'hooks/queryPagination';

export const PER_PAGE_OPTIONS: number[] = [10, ...DEFAULT_PER_PAGE_OPTIONS];

/** Always visible: it is the row's link to the trace. */
export const TRACE_ID_COLUMN_ID = 'trace_id';

/**
 * Display-only columns: the trace list returns them, but the keys endpoint cannot
 * report them because ordering or filtering on one is an error. The orderable
 * aggregates are absent here on purpose — they come from the endpoint.
 */
export const DISPLAY_ONLY_FIELDS: TelemetryFieldKey[] = [
	{ name: 'service.name', fieldContext: 'resource' },
	{ name: 'root_span_name' },
	{ name: 'trace_duration_nano' },
	{ name: 'span_count' },
	{ name: TRACE_ID_COLUMN_ID },
	{ name: 'start_time' },
	{ name: 'end_time' },
	{ name: 'error_count' },
	{ name: 'input' },
	{ name: 'output' },
] as TelemetryFieldKey[];

/** Everything else starts hidden, including any aggregate the endpoint adds later. */
const DEFAULT_VISIBLE_FIELDS = new Set([
	'service.name',
	'root_span_name',
	'trace_duration_nano',
	'span_count',
	'llm_call_count',
	'total_tokens',
	'estimated_total_cost',
	TRACE_ID_COLUMN_ID,
]);

export const buildTraceViewColumns = (
	fields: TelemetryFieldKey[],
): TableColumnDef<TracesTableRow>[] =>
	fields.map((field) => ({
		...getFieldColumn(field),
		defaultVisibility: DEFAULT_VISIBLE_FIELDS.has(field.name),
		enableRemove: field.name !== TRACE_ID_COLUMN_ID,
		canBeHidden: field.name !== TRACE_ID_COLUMN_ID,
	}));
