import { TelemetryFieldKey } from 'api/v5/v5';
import type { TableColumnDef } from 'components/TanStackTableView/types';
import { buildCompositeKey } from 'container/OptionsMenu/utils';
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

/** Anything the keys endpoint adds beyond the ordered set starts hidden; only applied while no selection is stored. */
const DEFAULT_VISIBLE_FIELDS = new Set(DEFAULT_COLUMN_ORDER);

/** Matches the id getFieldColumn derives, so fields and columns address alike. */
export const columnIdOf = (field: TelemetryFieldKey): string =>
	buildCompositeKey(field.name, field.fieldContext, field.fieldDataType);

export const getDefaultTraceViewFields = (
	availableFields: TelemetryFieldKey[],
): TelemetryFieldKey[] =>
	availableFields.filter((field) => DEFAULT_VISIBLE_FIELDS.has(field.name));

/** The selection the old column store encoded; `null` when it matches the defaults. */
export const getLegacyTraceViewSelection = (
	availableFields: TelemetryFieldKey[],
	hiddenColumnIds: string[],
	columnOrder: string[],
): TelemetryFieldKey[] | null => {
	const hidden = new Set(hiddenColumnIds);

	// A saved order lists exactly the columns the user kept.
	if (columnOrder.length) {
		const orderIndex = new Map(columnOrder.map((id, index) => [id, index]));
		const kept = availableFields
			.filter((field) => orderIndex.has(columnIdOf(field)))
			.filter((field) => !hidden.has(columnIdOf(field)));
		return kept.length
			? kept.sort(
					(a, b) =>
						(orderIndex.get(columnIdOf(a)) ?? 0) -
						(orderIndex.get(columnIdOf(b)) ?? 0),
				)
			: null;
	}

	const defaults = getDefaultTraceViewFields(availableFields);
	const kept = defaults.filter((field) => !hidden.has(columnIdOf(field)));
	return kept.length === defaults.length ? null : kept;
};

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
