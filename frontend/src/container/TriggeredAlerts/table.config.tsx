import { BellDot } from '@signozhq/icons';
import { Badge } from '@signozhq/ui/badge';
import { SEVERITY_BADGE_COLORS } from 'components/Alerts/constants';
import type { TableColumnDef } from 'components/TanStackTableView';
import TanStackTable from 'components/TanStackTableView';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import AlertStatusTag from './components/AlertStatusTag';
import LabelColumn from 'components/Alerts/LabelColumn';
import styles from './TriggeredAlerts.module.scss';
import type { Alert, GroupedAlert } from './types';
import { GroupTagsCell } from 'container/TriggeredAlerts/components/GroupTagsCell';

export function getAlertColumns(
	formatTimezoneAdjustedTimestamp: (date: string, format: string) => string,
): TableColumnDef<Alert>[] {
	return [
		{
			id: 'status',
			header: 'Status',
			accessorFn: (row) => row.status?.state,
			width: { fixed: '100px' },
			enableSort: false,
			enableMove: false,
			cell: ({ value }): JSX.Element => (
				<AlertStatusTag state={String(value ?? '')} />
			),
		},
		{
			id: 'alertName',
			header: 'Alert Name',
			accessorFn: (row) => row.labels?.alertname ?? '',
			width: { default: '100%' },
			enableSort: true,
			enableMove: false,
			cell: ({ value }): JSX.Element => (
				<TanStackTable.Text title={value}>
					{String(value ?? '-')}
				</TanStackTable.Text>
			),
		},
		{
			id: 'severity',
			header: 'Severity',
			accessorFn: (row) => row.labels?.severity ?? '',
			width: { fixed: '120px' },
			enableSort: true,
			enableMove: false,
			cell: ({ value }): JSX.Element => {
				const severity = String(value ?? '').toLowerCase();
				if (!severity) {
					return <TanStackTable.Text>-</TanStackTable.Text>;
				}
				return (
					<Badge
						color={SEVERITY_BADGE_COLORS[severity] ?? 'secondary'}
						variant="outline"
					>
						{severity}
					</Badge>
				);
			},
		},
		{
			id: 'firingSince',
			header: 'Firing Since',
			accessorKey: 'startsAt',
			width: { min: 280, default: 280 },
			enableSort: true,
			enableMove: false,
			cell: ({ value }): JSX.Element => (
				<TanStackTable.Text>
					{value
						? formatTimezoneAdjustedTimestamp(String(value), DATE_TIME_FORMATS.UTC_US)
						: '-'}
				</TanStackTable.Text>
			),
		},
		{
			id: 'labels',
			header: 'Labels',
			accessorKey: 'labels',
			width: { default: '100%' },
			enableMove: false,
			cell: ({ value }): JSX.Element => {
				const labels = value as Record<string, string> | undefined;
				if (!labels) {
					return <TanStackTable.Text>-</TanStackTable.Text>;
				}

				const tagKeys = Object.keys(labels).filter((k) => k !== 'severity');
				if (!tagKeys.length) {
					return <TanStackTable.Text>-</TanStackTable.Text>;
				}

				return <LabelColumn labels={tagKeys} value={labels} color="sakura" />;
			},
		},
	];
}

export const groupedColumns: TableColumnDef<GroupedAlert>[] = [
	{
		id: 'groupTags',
		header: (): JSX.Element => (
			<div className={styles.groupHeader}>
				<BellDot size={14} />
				<span>Group</span>
			</div>
		),
		accessorFn: (row) => row.groupKey,
		width: { default: '100%' },
		enableRemove: false,
		enableMove: false,
		pin: 'left',
		cell: ({ row: groupRow, isExpanded, toggleExpanded }): JSX.Element => {
			return (
				<GroupTagsCell
					groupRow={groupRow}
					isExpanded={isExpanded}
					toggleExpanded={toggleExpanded}
				/>
			);
		},
	},
	{
		id: 'alertCount',
		header: 'Alerts',
		accessorFn: (row) => row.alerts.length,
		width: { min: 80, default: 100 },
		enableMove: false,
		cell: ({ value }): JSX.Element => (
			<TanStackTable.Text>{String(value)}</TanStackTable.Text>
		),
	},
];
