import type { TelemetrytypesSemconvMigrationReportEntryDTO } from 'api/generated/services/sigNoz.schemas';
import type { TableColumnDef } from 'components/TanStackTableView';
import TanStackTable from 'components/TanStackTableView';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';

import styles from './SemconvMigrationReport.module.scss';

export function getSemconvMigrationRowKey(
	entry: TelemetrytypesSemconvMigrationReportEntryDTO,
): string {
	return JSON.stringify([entry.current, entry.old, entry.signal]);
}

export function getSemconvMigrationReportColumns(
	formatTimezoneAdjustedTimestamp: (date: number, format: string) => string,
): TableColumnDef<TelemetrytypesSemconvMigrationReportEntryDTO>[] {
	return [
		{
			id: 'old',
			header: 'Old name',
			accessorKey: 'old',
			width: { default: '180px', min: '140px' },
			enableSort: false,
			enableMove: false,
			enableRemove: false,
			cell: ({ row }): JSX.Element => (
				<TanStackTable.Text title={row.old}>{row.old}</TanStackTable.Text>
			),
		},
		{
			id: 'current',
			header: 'Current name',
			accessorKey: 'current',
			width: { default: '220px', min: '160px' },
			enableSort: false,
			enableMove: false,
			enableRemove: false,
			cell: ({ row }): JSX.Element => (
				<TanStackTable.Text title={row.current}>{row.current}</TanStackTable.Text>
			),
		},
		{
			id: 'signal',
			header: 'Signal',
			accessorKey: 'signal',
			width: { default: '70px', min: '70px' },
			enableSort: false,
			enableMove: false,
			enableRemove: false,
			cell: ({ row }): JSX.Element => (
				<TanStackTable.Text>{row.signal}</TanStackTable.Text>
			),
		},
		{
			id: 'services',
			header: 'Services',
			accessorKey: 'services',
			width: { default: '100%', min: '120px' },
			enableSort: false,
			enableMove: false,
			enableRemove: false,
			cell: ({ row }): JSX.Element => {
				// While the report loads, the table calls this with a placeholder
				// row that has no fields.
				const services = row.services?.join(', ');
				return (
					<TanStackTable.Text
						className={styles.services}
						title={services}
						data-testid={`semconv-migration-services-${row.signal}-${row.old}`}
					>
						{services}
					</TanStackTable.Text>
				);
			},
		},
		{
			id: 'lastSeen',
			header: 'Last seen',
			accessorKey: 'lastSeenUnixMilli',
			width: { default: '130px', min: '130px', passLastColumnFill: true },
			enableSort: false,
			enableMove: false,
			enableRemove: false,
			cell: ({ row }): JSX.Element => (
				<TanStackTable.Text>
					{formatTimezoneAdjustedTimestamp(
						row.lastSeenUnixMilli,
						DATE_TIME_FORMATS.ISO_DATETIME,
					)}
				</TanStackTable.Text>
			),
		},
	];
}
