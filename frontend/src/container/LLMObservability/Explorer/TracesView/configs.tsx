import type { ReactElement } from 'react';
import { generatePath, Link } from 'react-router-dom';
import TanStackTable from 'components/TanStackTableView';
import type { TableColumnDef } from 'components/TanStackTableView/types';
import ROUTES from 'constants/routes';
import { getMs } from 'container/Trace/Filters/Panel/PanelBody/Duration/util';

import { formatCellValue, TraceListRow } from '../tableUtils';

/**
 * Root-span columns. Fixed set — unlike the list view there are no user-selected
 * columns here, so nothing can be removed (there'd be no preference to sync to).
 */
export const columns: TableColumnDef<TraceListRow>[] = [
	{
		id: 'serviceName',
		header: 'Root Service Name',
		accessorFn: (row): unknown => row?.['service.name'],
		enableRemove: false,
		width: { min: 145 },
		cell: ({ value }): ReactElement => (
			<TanStackTable.Text>{formatCellValue(value)}</TanStackTable.Text>
		),
	},
	{
		id: 'name',
		header: 'Root Operation Name',
		accessorFn: (row): unknown => row?.name,
		enableRemove: false,
		width: { min: 145 },
		cell: ({ value }): ReactElement => (
			<TanStackTable.Text>{formatCellValue(value)}</TanStackTable.Text>
		),
	},
	{
		id: 'durationNano',
		header: 'Root Duration (in ms)',
		accessorFn: (row): unknown => row?.duration_nano,
		enableRemove: false,
		width: { min: 145 },
		cell: ({ value }): ReactElement => (
			<TanStackTable.Text>
				{value === undefined || value === null
					? ''
					: `${getMs(formatCellValue(value))}ms`}
			</TanStackTable.Text>
		),
	},
	{
		id: 'span_count',
		header: 'No of Spans',
		accessorFn: (row): unknown => row?.span_count,
		enableRemove: false,
		width: { min: 145 },
		cell: ({ value }): ReactElement => (
			<TanStackTable.Text>{formatCellValue(value)}</TanStackTable.Text>
		),
	},
	{
		id: 'traceID',
		header: 'TraceID',
		accessorFn: (row): unknown => row?.trace_id,
		enableRemove: false,
		width: { min: 145 },
		cell: ({ value }): ReactElement => {
			const traceID = formatCellValue(value);
			if (!traceID) {
				return <TanStackTable.Text> </TanStackTable.Text>;
			}
			return (
				<Link
					to={generatePath(ROUTES.TRACE_DETAIL, { id: traceID })}
					data-testid="trace-id"
				>
					{traceID}
				</Link>
			);
		},
	},
];
