import { Badge } from '@signozhq/ui/badge';
import type { TableColumnDef } from 'components/TanStackTableView';
import TanStackTable from 'components/TanStackTableView';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { toRelativeTime } from 'pages/AlertList/NotificationChannels/utils/relativeTime';

import styles from './RoutingPolicies.module.scss';
import { RoutingPolicy } from './types';

export function getRoutingPolicyColumns(
	formatTimezoneAdjustedTimestamp: (date: string, format: string) => string,
): TableColumnDef<RoutingPolicy>[] {
	const textCell = (value: string | null | undefined): JSX.Element => (
		<TanStackTable.Text title={value ?? undefined}>
			{value || '-'}
		</TanStackTable.Text>
	);

	const timestampCell = (
		row: RoutingPolicy,
		value: string | null | undefined,
	): JSX.Element => {
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
				<span className={styles.timeText}>{toRelativeTime(value)}</span>
			</TanStackTable.HoverTooltip>
		);
	};

	return [
		{
			id: 'name',
			header: 'Routing Policy',
			accessorKey: 'name',
			width: { default: '100%', min: '220px' },
			enableSort: true,
			enableResize: true,
			enableRemove: false,
			enableMove: false,
			cell: ({ row }): JSX.Element => (
				<TanStackTable.Text
					title={row.name}
					data-testid={`routing-policy-row-${row.id}-name`}
				>
					{row.name}
				</TanStackTable.Text>
			),
		},
		{
			id: 'expression',
			header: 'Expression',
			accessorKey: 'expression',
			width: { default: '260px', min: '160px' },
			enableSort: false,
			enableResize: true,
			enableMove: false,
			cell: ({ row }): JSX.Element => (
				<TanStackTable.Text className={styles.expression} title={row.expression}>
					{row.expression}
				</TanStackTable.Text>
			),
		},
		{
			id: 'channels',
			header: 'Channels',
			accessorKey: 'channels',
			width: { default: '220px', min: '140px' },
			enableSort: false,
			enableResize: true,
			enableMove: false,
			cell: ({ row }): JSX.Element =>
				row.channels?.length ? (
					<div className={styles.badges} title={row.channels.join(', ')}>
						{row.channels.map((channel) => (
							<Badge
								key={channel}
								textTransform="none"
								variant="solid"
								color="secondary"
							>
								{channel}
							</Badge>
						))}
					</div>
				) : (
					<TanStackTable.Text>-</TanStackTable.Text>
				),
		},
		{
			id: 'createdBy',
			header: 'Created By',
			accessorKey: 'createdBy',
			width: { default: '180px', min: '120px' },
			defaultVisibility: false,
			enableSort: false,
			enableResize: true,
			enableMove: false,
			cell: ({ row }): JSX.Element => textCell(row.createdBy),
		},
		{
			id: 'createdAt',
			header: 'Created At',
			accessorKey: 'createdAt',
			width: { default: '150px', min: '120px' },
			defaultVisibility: false,
			enableSort: true,
			enableResize: true,
			enableMove: false,
			cell: ({ row }): JSX.Element => timestampCell(row, row.createdAt),
		},
		{
			id: 'updatedBy',
			header: 'Updated By',
			accessorKey: 'updatedBy',
			width: { default: '180px', min: '120px' },
			defaultVisibility: false,
			enableSort: false,
			enableResize: true,
			enableMove: false,
			cell: ({ row }): JSX.Element => textCell(row.updatedBy),
		},
		{
			id: 'updatedAt',
			header: 'Updated At',
			accessorKey: 'updatedAt',
			width: { default: '150px', min: '120px' },
			defaultVisibility: false,
			enableSort: true,
			enableResize: true,
			enableMove: false,
			cell: ({ row }): JSX.Element => timestampCell(row, row.updatedAt),
		},
	];
}
