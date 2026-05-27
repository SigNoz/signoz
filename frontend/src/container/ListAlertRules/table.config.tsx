import { Badge, BadgeColor } from '@signozhq/ui/badge';
import { SEVERITY_BADGE_COLORS } from 'components/Alerts/constants';
import LabelColumn from 'components/Alerts/LabelColumn';
import type { TableColumnDef } from 'components/TanStackTableView';
import TanStackTable from 'components/TanStackTableView';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';

import type { AlertRule } from './types';

const STATE_CONFIG: Record<string, { color: BadgeColor; label: string }> = {
	firing: { color: 'error', label: 'Firing' },
	inactive: { color: 'success', label: 'OK' },
	pending: { color: 'warning', label: 'Pending' },
	disabled: { color: 'secondary', label: 'Disabled' },
};

export function getAlertRuleColumns(
	formatTimezoneAdjustedTimestamp: (date: string, format: string) => string,
): TableColumnDef<AlertRule>[] {
	return [
		{
			id: 'state',
			header: 'Status',
			accessorKey: 'state',
			width: { fixed: '100px' },
			enableSort: true,
			enableRemove: false,
			enableMove: false,
			cell: ({ value }): JSX.Element => {
				const state = String(value ?? '').toLowerCase();
				const config = STATE_CONFIG[state] ?? {
					color: 'secondary' as BadgeColor,
					label: 'Unknown',
				};
				return (
					<Badge color={config.color} variant="outline">
						{config.label}
					</Badge>
				);
			},
		},
		{
			id: 'name',
			header: 'Alert Name',
			accessorKey: 'alert',
			width: { default: '100%' },
			enableSort: true,
			enableRemove: false,
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
			id: 'labels',
			header: 'Labels',
			accessorKey: 'labels',
			width: { default: '100%' },
			enableSort: false,
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
		{
			id: 'createdAt',
			header: 'Created At',
			accessorKey: 'createdAt',
			width: { default: '100%' },
			enableSort: true,
			enableMove: false,
			defaultVisibility: false,
			cell: ({ value }): JSX.Element => (
				<TanStackTable.Text>
					{value
						? formatTimezoneAdjustedTimestamp(String(value), DATE_TIME_FORMATS.UTC_US)
						: '-'}
				</TanStackTable.Text>
			),
		},
		{
			id: 'createdBy',
			header: 'Created By',
			accessorKey: 'createdBy',
			width: { default: '100%' },
			enableSort: false,
			enableMove: false,
			defaultVisibility: false,
			cell: ({ value }): JSX.Element => (
				<TanStackTable.Text>{String(value ?? '-')}</TanStackTable.Text>
			),
		},
		{
			id: 'updatedAt',
			header: 'Updated At',
			accessorKey: 'updatedAt',
			width: { default: '100%' },
			enableSort: true,
			enableMove: false,
			defaultVisibility: false,
			cell: ({ value }): JSX.Element => (
				<TanStackTable.Text>
					{value
						? formatTimezoneAdjustedTimestamp(String(value), DATE_TIME_FORMATS.UTC_US)
						: '-'}
				</TanStackTable.Text>
			),
		},
		{
			id: 'updatedBy',
			header: 'Updated By',
			accessorKey: 'updatedBy',
			width: { default: '100%' },
			enableSort: false,
			enableMove: false,
			defaultVisibility: false,
			cell: ({ value }): JSX.Element => (
				<TanStackTable.Text>{String(value ?? '-')}</TanStackTable.Text>
			),
		},
	];
}
