import type { TableColumnDef } from 'components/TanStackTableView';
import TanStackTable from 'components/TanStackTableView';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';

import { CHANNEL_KIND_LABEL } from './constants';
import styles from './table.module.scss';
import type { Channel } from './types';
import { toRelativeTime } from './utils/relativeTime';

export function getChannelColumns(
	formatTimezoneAdjustedTimestamp: (date: string, format: string) => string,
): TableColumnDef<Channel>[] {
	const timestampCell = (row: Channel, value: string): JSX.Element => {
		if (!value) {
			return <TanStackTable.Text>-</TanStackTable.Text>;
		}

		return (
			<TanStackTable.HoverTooltip
				rowId={row.id}
				title={formatTimezoneAdjustedTimestamp(
					value,
					DATE_TIME_FORMATS.DASH_DATETIME,
				)}
			>
				{/* A plain inline-block hugs the text. TanStackTable.Text is a
				    `-webkit-box` for line clamping, which fills the cell and leaves
				    the arrow pointing at the cell's middle instead of the words. */}
				<span className={styles.timeText}>{toRelativeTime(value)}</span>
			</TanStackTable.HoverTooltip>
		);
	};

	return [
		{
			id: 'name',
			header: 'Channel',
			accessorKey: 'displayName',
			width: { default: '100%', min: '220px' },
			enableSort: true,
			enableResize: true,
			enableRemove: false,
			enableMove: false,
			cell: ({ row }): JSX.Element => (
				<TanStackTable.Text
					title={row.displayName}
					data-testid={`channel-row-${row.id}-name`}
				>
					{row.displayName}
				</TanStackTable.Text>
			),
		},
		{
			id: 'kind',
			header: 'Type',
			accessorKey: 'kind',
			width: { default: '150px', min: '110px' },
			enableSort: false,
			enableResize: true,
			enableMove: false,
			cell: ({ row }): JSX.Element => (
				<TanStackTable.Text data-testid={`channel-row-${row.id}-kind`}>
					{CHANNEL_KIND_LABEL[row.kind]}
				</TanStackTable.Text>
			),
		},
		{
			id: 'createdAt',
			header: 'Created At',
			accessorKey: 'createdAt',
			width: { default: '150px', min: '120px' },
			enableSort: true,
			enableResize: true,
			enableMove: false,
			cell: ({ row }): JSX.Element => timestampCell(row, row.createdAt),
		},
		{
			id: 'updatedAt',
			header: 'Updated At',
			accessorKey: 'updatedAt',
			width: { default: '150px', min: '120px' },
			enableSort: true,
			enableResize: true,
			enableMove: false,
			cell: ({ row }): JSX.Element => timestampCell(row, row.updatedAt),
		},
	];
}
