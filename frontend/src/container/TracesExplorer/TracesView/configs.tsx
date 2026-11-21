import type { TelemetryFieldKey } from 'api/v5/v5';
import { PANEL_TYPES } from 'constants/queryBuilder';
import type { TableColumnDef } from 'components/TanStackTableView/types';
import type { TracesTableRow } from 'container/TracesExplorer/TracesTable/getFieldColumn';
import { getFieldColumn } from 'container/TracesExplorer/TracesTable/getFieldColumn';

const TRACE_FIELDS = [
	{ name: 'service.name', fieldContext: 'resource' },
	{ name: 'name' },
	{ name: 'duration_nano' },
	{ name: 'span_count' },
	{ name: 'trace_id' },
] as TelemetryFieldKey[];

export const columns: TableColumnDef<TracesTableRow>[] = TRACE_FIELDS.map(
	(field) => ({
		...getFieldColumn(field, PANEL_TYPES.TRACE),
		enableRemove: false,
		canBeHidden: false,
	}),
);
