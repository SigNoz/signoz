import { Badge } from '@signozhq/ui/badge';
import { AlertmanagertypesMaintenanceStatusDTO } from 'api/generated/services/sigNoz.schemas';
import type { TableColumnDef } from 'components/TanStackTableView';
import TanStackTable from 'components/TanStackTableView';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { toRelativeTime } from 'pages/AlertList/NotificationChannels/utils/relativeTime';

import styles from './PlannedDowntime.module.scss';
import {
	formatRepeats,
	formatScheduleDuration,
	formatWindow,
} from './PlannedDowntimeutils';
import { DowntimeSchedulesTableData } from './types';

const STATUS_BADGE: Record<
	AlertmanagertypesMaintenanceStatusDTO,
	{ label: string; color: 'success' | 'info' | 'secondary' }
> = {
	[AlertmanagertypesMaintenanceStatusDTO.active]: {
		label: 'Active',
		color: 'success',
	},
	[AlertmanagertypesMaintenanceStatusDTO.upcoming]: {
		label: 'Upcoming',
		color: 'info',
	},
	[AlertmanagertypesMaintenanceStatusDTO.expired]: {
		label: 'Expired',
		color: 'secondary',
	},
};

export function getPlannedDowntimeColumns(
	formatTimezoneAdjustedTimestamp: (date: string, format: string) => string,
): TableColumnDef<DowntimeSchedulesTableData>[] {
	const textCell = (value: string | undefined): JSX.Element => (
		<TanStackTable.Text title={value || undefined}>
			{value || '-'}
		</TanStackTable.Text>
	);

	const timestampCell = (
		row: DowntimeSchedulesTableData,
		value: string | undefined,
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
			header: 'Downtime',
			accessorKey: 'name',
			width: { default: '100%', min: '200px' },
			enableSort: true,
			enableResize: true,
			enableRemove: false,
			enableMove: false,
			cell: ({ row }): JSX.Element => (
				<TanStackTable.Text
					title={row.name}
					data-testid={`downtime-row-${row.id}-name`}
				>
					{row.name}
				</TanStackTable.Text>
			),
		},
		{
			id: 'status',
			header: 'Status',
			accessorKey: 'status',
			width: { default: '110px', min: '100px' },
			enableSort: true,
			enableResize: true,
			enableMove: false,
			cell: ({ row }): JSX.Element => {
				const status = STATUS_BADGE[row.status];
				return status ? (
					<Badge textTransform="none" variant="outlined" color={status.color}>
						{status.label}
					</Badge>
				) : (
					textCell(row.status)
				);
			},
		},
		{
			id: 'window',
			header: 'Schedule',
			accessorFn: (row) => row.schedule?.startTime,
			width: { default: '340px', min: '220px' },
			enableSort: true,
			enableResize: true,
			enableMove: false,
			cell: ({ row }): JSX.Element => textCell(formatWindow(row.schedule)),
		},
		{
			id: 'timezone',
			header: 'Timezone',
			accessorFn: (row) => row.schedule?.timezone,
			width: { default: '130px', min: '110px' },
			defaultVisibility: false,
			enableSort: false,
			enableResize: true,
			enableMove: false,
			cell: ({ row }): JSX.Element => textCell(row.schedule?.timezone),
		},
		{
			id: 'repeats',
			header: 'Repeats',
			accessorFn: (row) => row.schedule?.recurrence?.repeatType,
			width: { default: '180px', min: '120px' },
			enableSort: false,
			enableResize: true,
			enableMove: false,
			cell: ({ row }): JSX.Element => textCell(formatRepeats(row.schedule)),
		},
		{
			id: 'duration',
			header: 'Duration',
			accessorFn: (row) => row.schedule?.recurrence?.duration,
			width: { default: '110px', min: '90px' },
			defaultVisibility: false,
			enableSort: false,
			enableResize: true,
			enableMove: false,
			cell: ({ row }): JSX.Element =>
				textCell(formatScheduleDuration(row.schedule)),
		},
		{
			id: 'alertsSilenced',
			header: 'Alerts Silenced',
			accessorKey: 'alertIds',
			width: { default: '200px', min: '140px' },
			enableSort: false,
			enableResize: true,
			enableMove: false,
			cell: ({ row }): JSX.Element =>
				row.alertOptions.length ? (
					<div
						className={styles.badges}
						title={row.alertOptions
							.flatMap((alert) =>
								typeof alert.label === 'string' ? [alert.label] : [],
							)
							.join(', ')}
					>
						{row.alertOptions.map((alert) => (
							<Badge
								key={alert.value}
								textTransform="none"
								variant="solid"
								color="secondary"
							>
								{alert.label}
							</Badge>
						))}
					</div>
				) : (
					<Badge textTransform="none" variant="solid" color="secondary">
						All alert rules
					</Badge>
				),
		},
		{
			id: 'description',
			header: 'Description',
			accessorKey: 'description',
			width: { default: '200px', min: '120px' },
			defaultVisibility: false,
			enableSort: false,
			enableResize: true,
			enableMove: false,
			cell: ({ row }): JSX.Element => textCell(row.description),
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
