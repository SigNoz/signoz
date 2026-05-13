import { BellDot, ChevronDown, ChevronRight } from '@signozhq/icons';
import { Badge } from '@signozhq/ui/badge';
import { Button } from '@signozhq/ui/button';
import { SEVERITY_BADGE_COLORS } from 'components/Alerts';
import TanStackTable from 'components/TanStackTableView';
import type { TableColumnDef } from 'components/TanStackTableView';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import AlertStatusTag from './components/AlertStatusTag';
import { LabelColumn } from 'components/Alerts';
import styles from './TriggeredAlerts.module.scss';
import type { Alert, GroupedAlert } from './types';

export function getAlertColumns(
	formatTimezoneAdjustedTimestamp: (date: string, format: string) => string,
): TableColumnDef<Alert>[] {
	return [
		{
			id: 'status',
			header: 'Status',
			accessorFn: (row) => row.status?.state,
			width: { min: 120, default: 120 },
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
			width: { min: 200, default: 330 },
			enableSort: true,
			enableMove: false,
			cell: ({ value }): JSX.Element => (
				<TanStackTable.Text>{String(value ?? '-')}</TanStackTable.Text>
			),
		},
		{
			id: 'severity',
			header: 'Severity',
			accessorFn: (row) => row.labels?.severity ?? '',
			width: { min: 150, default: 150 },
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
			width: { min: 200, default: 300 },
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
			const tags = Object.entries(groupRow.groupLabels)
				.filter(([, v]) => v)
				.map(([k, v]) => `${k}:${v}`);

			return (
				<div className={styles.groupCell}>
					<Button
						variant="ghost"
						color="secondary"
						size="icon"
						onClick={(e): void => {
							e.stopPropagation();
							toggleExpanded();
						}}
						prefix={
							isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
						}
					/>
					<div className={styles.tagsContainer}>
						{tags.map((tag) => (
							<Badge color="error" key={tag} variant="outline">
								{tag}
							</Badge>
						))}
					</div>
				</div>
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
