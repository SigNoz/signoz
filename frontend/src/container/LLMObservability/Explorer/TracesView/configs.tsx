import { TelemetryFieldKey } from 'api/v5/v5';
import type { TableColumnDef } from 'components/TanStackTableView/types';
import {
	getFieldColumn,
	TracesTableRow,
} from 'container/TracesExplorer/TracesTable/getFieldColumn';
import { DEFAULT_PER_PAGE_OPTIONS } from 'hooks/queryPagination';

import AITraceFieldCell from './AITraceFieldCell';

export const PER_PAGE_OPTIONS: number[] = [10, ...DEFAULT_PER_PAGE_OPTIONS];

/** Always visible: it is the row's link to the trace. */
export const TRACE_ID_COLUMN_ID = 'trace_id';

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
		cell: ({ value }: { value: unknown }): JSX.Element => (
			<AITraceFieldCell name={field.name} value={value} />
		),
		defaultVisibility: DEFAULT_VISIBLE_FIELDS.has(field.name),
		enableRemove: field.name !== TRACE_ID_COLUMN_ID,
		canBeHidden: field.name !== TRACE_ID_COLUMN_ID,
	}));
