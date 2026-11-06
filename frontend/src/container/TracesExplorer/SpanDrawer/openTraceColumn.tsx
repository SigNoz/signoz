import type { TableColumnDef } from 'components/TanStackTableView/types';
import { TracesTableRow } from 'container/TracesExplorer/TracesTable/getFieldColumn';

import OpenTraceButton from './OpenTraceButton';

export const OPEN_TRACE_COLUMN: TableColumnDef<TracesTableRow> = {
	id: 'open-trace',
	header: '',
	pin: 'left',
	enableMove: false,
	enableResize: false,
	enableRemove: false,
	canBeHidden: false,
	width: { fixed: 32 },
	cell: ({ row, rowId }): JSX.Element => (
		<OpenTraceButton row={row} rowId={rowId} />
	),
};
