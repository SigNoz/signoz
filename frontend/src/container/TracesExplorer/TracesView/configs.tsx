import { TelemetryFieldKey } from 'api/v5/v5';
import type { TableColumnDef } from 'components/TanStackTableView/types';
import {
	getFieldColumn,
	TracesTableRow,
} from 'container/TracesExplorer/TracesTable/getFieldColumn';
import { DEFAULT_PER_PAGE_OPTIONS } from 'hooks/queryPagination';

export const PER_PAGE_OPTIONS: number[] = [10, ...DEFAULT_PER_PAGE_OPTIONS];

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
