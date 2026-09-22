import { TelemetryFieldKey } from 'api/v5/v5';
import type { TableColumnDef } from 'components/TanStackTableView/types';
import { getFieldColumn, TracesTableRow } from '../TracesTable/getFieldColumn';
import { DEFAULT_PER_PAGE_OPTIONS } from 'hooks/queryPagination';

export const PER_PAGE_OPTIONS: number[] = [10, ...DEFAULT_PER_PAGE_OPTIONS];

/** Always present: it is the row's link to the trace, but it can be reordered. */
export const TRACE_ID_COLUMN_ID = 'trace_id';

/** Everything else starts hidden; only applied at first init, since the store persists hidden ids. */
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
		// The shared column builder pins anything in TIMESTAMP_FIELD_NAMES; these stay movable.
		enableMove: true,
		enableRemove: field.name !== TRACE_ID_COLUMN_ID,
		canBeHidden: field.name !== TRACE_ID_COLUMN_ID,
	}));
