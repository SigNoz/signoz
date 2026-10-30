import { TelemetryFieldKey } from 'api/v5/v5';
import type { TableColumnDef } from 'components/TanStackTableView/types';
import { getFieldColumn, TracesTableRow } from '../TracesTable/getFieldColumn';
import { DEFAULT_PER_PAGE_OPTIONS } from 'hooks/queryPagination';

export const PER_PAGE_OPTIONS: number[] = [10, ...DEFAULT_PER_PAGE_OPTIONS];

/** Always present: it is the row's link to the trace, but it can be reordered. */
export const TRACE_ID_COLUMN_ID = 'trace_id';

export const REQUIRED_FIELDS: readonly string[] = [TRACE_ID_COLUMN_ID];

export const withTraceId = (
	fields: TelemetryFieldKey[],
): TelemetryFieldKey[] =>
	fields.some((field) => field.name === TRACE_ID_COLUMN_ID)
		? fields
		: [{ name: TRACE_ID_COLUMN_ID } as TelemetryFieldKey, ...fields];

export const buildTraceViewColumns = (
	fields: TelemetryFieldKey[],
): TableColumnDef<TracesTableRow>[] =>
	fields.map((field) => ({
		...getFieldColumn(field),
		// The shared column builder pins anything in TIMESTAMP_FIELD_NAMES; these stay movable.
		enableMove: true,
		enableRemove: field.name !== TRACE_ID_COLUMN_ID,
		canBeHidden: field.name !== TRACE_ID_COLUMN_ID,
	}));
