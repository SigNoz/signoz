import { AlertmanagertypesListedNotificationChannelDTO } from 'api/generated/services/sigNoz.schemas';
import type { TableColumnDef } from 'components/TanStackTableView';
import TanStackTable from 'components/TanStackTableView';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';

import { CHANNEL_KIND_LABEL } from './constants';
import styles from './table.module.scss';
import { toRelativeTime } from './utils/relativeTime';

type Channel = AlertmanagertypesListedNotificationChannelDTO;

export function getChannelColumns(
	formatTimezoneAdjustedTimestamp: (date: string, format: string) => string,
): TableColumnDef<Channel>[] {
	const timestampCell = ({
		row,
		value,
	}: {
		row: Channel;
		value: unknown;
	}): JSX.Element => {
		if (typeof value !== 'string' || !value) {
			return <TanStackTable.Text>-</TanStackTable.Text>;
		}

		return (
			<TanStackTable.HoverTooltip
				rowId={row.id}
				arrow
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
			cell: ({ row, value }): JSX.Element => (
				<TanStackTable.Text
					title={String(value ?? '')}
					data-testid={`channel-row-${row.id}-name`}
				>
					{String(value ?? '-')}
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
			cell: ({ row, value }): JSX.Element => (
				<TanStackTable.Text data-testid={`channel-row-${row.id}-kind`}>
					{CHANNEL_KIND_LABEL[row.kind] ?? String(value ?? '-')}
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
			cell: timestampCell,
		},
		{
			id: 'updatedAt',
			header: 'Updated At',
			accessorKey: 'updatedAt',
			width: { default: '150px', min: '120px' },
			enableSort: true,
			enableResize: true,
			enableMove: false,
			cell: timestampCell,
		},
	];
}
