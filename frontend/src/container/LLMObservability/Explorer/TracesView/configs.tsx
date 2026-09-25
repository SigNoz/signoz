import { TelemetryFieldKey } from 'api/v5/v5';
import type { TableColumnDef } from 'components/TanStackTableView/types';
import { getFieldColumn, TracesTableRow } from '../TracesTable/getFieldColumn';
import { DEFAULT_PER_PAGE_OPTIONS } from 'hooks/queryPagination';

export const PER_PAGE_OPTIONS: number[] = [10, ...DEFAULT_PER_PAGE_OPTIONS];

/** Always present: it is the row's link to the trace, but it can be reordered. */
export const TRACE_ID_COLUMN_ID = 'trace_id';

/** Fallback order, until the user drags a column; unlisted fields keep the order the keys endpoint returns them in. */
const DEFAULT_COLUMN_ORDER = [
	TRACE_ID_COLUMN_ID,
	'service.name',
	'root_span_name',
	'estimated_total_cost',
	'trace_duration_nano',
	'span_count',
	'total_tokens',
	'input_tokens',
	'output_tokens',
	'distinct_tool_count',
	'llm_call_count',
	'tool_call_count',
	'start_time',
	'end_time',
	'error_count',
	'input',
	'output',
	'max_llm_duration_nano',
];

const orderRank = (field: TelemetryFieldKey): number => {
	const index = DEFAULT_COLUMN_ORDER.indexOf(field.name);
	return index === -1 ? Number.MAX_SAFE_INTEGER : index;
};

export const sortByDefaultOrder = (
	fields: TelemetryFieldKey[],
): TelemetryFieldKey[] =>
	[...fields].sort((a, b) => orderRank(a) - orderRank(b));

/** Anything the keys endpoint adds beyond the ordered set starts hidden; only applied at first init, since the store persists hidden ids. */
const DEFAULT_VISIBLE_FIELDS = new Set(DEFAULT_COLUMN_ORDER);

export const buildTraceViewColumns = (
	fields: TelemetryFieldKey[],
): TableColumnDef<TracesTableRow>[] =>
	fields.map((field) => ({
		...getFieldColumn(field),
		defaultVisibility: DEFAULT_VISIBLE_FIELDS.has(field.name),
		// The shared column builder pins anything in TIMESTAMP_FIELD_NAMES; these stay movable.
		enableMove: true,
		enableRemove: field.name !== TRACE_ID_COLUMN_ID,
		canBeHidden: field.name !== TRACE_ID_COLUMN_ID,
	}));
