import { TelemetryFieldKey } from 'api/v5/v5';
import type { TableColumnDef } from 'components/TanStackTableView/types';
import {
	getFieldColumn,
	TracesTableRow,
} from 'container/TracesExplorer/TracesTable/getFieldColumn';

const TRACE_FIELDS = [
	{ name: 'service.name', fieldContext: 'resource' },
	{ name: 'name' },
	{ name: 'duration_nano' },
	{ name: 'span_count' },
	{ name: 'trace_id' },
] as TelemetryFieldKey[];

export const columns: TableColumnDef<TracesTableRow>[] = TRACE_FIELDS.map(
	(field) => ({
		...getFieldColumn(field),
		enableRemove: false,
		canBeHidden: false,
	}),
);
