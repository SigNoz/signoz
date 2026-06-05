import TanStackTable from 'components/TanStackTableView';
import type { TableColumnDef } from 'components/TanStackTableView/types';
import { buildCompositeKey } from 'container/OptionsMenu/utils';
import { getMs } from 'container/Trace/Filters/Panel/PanelBody/Duration/util';
import { DEFAULT_PER_PAGE_OPTIONS } from 'hooks/queryPagination';

export const PER_PAGE_OPTIONS: number[] = [10, ...DEFAULT_PER_PAGE_OPTIONS];

// Trace-grouped (group-by-trace) row shape. Distinct from logs' `ListItem.data`
// (which is `Omit<ILog, 'timestamp' | 'span_id'>` — the legacy logs shape).
// Trace rows ship trace-summary fields; runtime keys often contain dots (e.g.
// `service.name`), so the row indexes via string keys, not nested-property access.
export type TraceRow = {
	'service.name': string;
	name: string;
	duration_nano: number | string;
	span_count: number | string;
	trace_id: string;
};

export const columns: TableColumnDef<TraceRow>[] = [
	{
		id: buildCompositeKey('service.name', 'resource'),
		header: 'Root Service Name',
		accessorFn: (row): unknown => row['service.name'],
		cell: ({ value }): JSX.Element => (
			<TanStackTable.Text>{String(value ?? '')}</TanStackTable.Text>
		),
		width: { min: 192 },
	},
	{
		id: 'name',
		header: 'Root Operation Name',
		accessorFn: (row): unknown => row.name,
		cell: ({ value }): JSX.Element => (
			<TanStackTable.Text data-testid="trace-id">
				{String(value ?? '')}
			</TanStackTable.Text>
		),
		width: { min: 200 },
	},
	{
		id: 'duration_nano',
		header: 'Root Duration (in ms)',
		accessorFn: (row): unknown => row.duration_nano,
		cell: ({ value }): JSX.Element => (
			<TanStackTable.Text>{getMs(String(value))}ms</TanStackTable.Text>
		),
		width: { min: 130 },
	},
	{
		id: 'span_count',
		header: 'No of Spans',
		accessorFn: (row): unknown => row.span_count,
		cell: ({ value }): JSX.Element => (
			<TanStackTable.Text>{String(value ?? '')}</TanStackTable.Text>
		),
		width: { min: 100 },
	},
	{
		id: 'trace_id',
		header: 'TraceID',
		accessorFn: (row): unknown => row.trace_id,
		cell: ({ value }): JSX.Element => (
			<TanStackTable.Text>{String(value ?? '')}</TanStackTable.Text>
		),
		width: { min: 250 },
	},
];
