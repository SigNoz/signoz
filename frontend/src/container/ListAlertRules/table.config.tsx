import { Badge, BadgeColor } from '@signozhq/ui';
import { Typography } from '@signozhq/ui/typography';
import { LabelColumn, SEVERITY_BADGE_COLORS } from 'components/Alerts';
import TanStackTable from 'components/TanStackTableView';
import type { TableColumnDef } from 'components/TanStackTableView';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';

import type { AlertRule } from './types';

const STATE_CONFIG: Record<string, { color: BadgeColor; label: string }> = {
	firing: { color: 'error', label: 'Firing' },
	inactive: { color: 'success', label: 'OK' },
	pending: { color: 'warning', label: 'Pending' },
	disabled: { color: 'secondary', label: 'Disabled' },
};

const ALERT_TYPE_LABELS: Record<string, string> = {
	METRIC_BASED_ALERT: 'Metrics',
	LOGS_BASED_ALERT: 'Logs',
	TRACES_BASED_ALERT: 'Traces',
	EXCEPTIONS_BASED_ALERT: 'Exceptions',
};

const RULE_TYPE_LABELS: Record<string, string> = {
	threshold_rule: 'Threshold',
	promql_rule: 'PromQL',
	anomaly_rule: 'Anomaly',
};

export function getAlertRuleColumns(
	formatTimezoneAdjustedTimestamp: (date: string, format: string) => string,
): TableColumnDef<AlertRule>[] {
	return [
		{
			id: 'state',
			header: 'Status',
			accessorKey: 'state',
			width: { min: 80, default: 100 },
			enableSort: true,
			enableRemove: false,
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
			width: { min: 200, default: 300 },
			enableSort: true,
			enableRemove: false,
			cell: ({ value }): JSX.Element => (
				<Typography.Text>{String(value ?? '-')}</Typography.Text>
			),
		},
		{
			id: 'severity',
			header: 'Severity',
			accessorFn: (row) => row.labels?.severity ?? '',
			width: { min: 120, default: 120 },
			enableSort: true,
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
			id: 'alertType',
			header: 'Alert Type',
			accessorKey: 'alertType',
			width: { min: 140, default: 140 },
			enableSort: true,
			cell: ({ value }): JSX.Element => {
				const alertType = String(value ?? '');
				const label = ALERT_TYPE_LABELS[alertType] ?? alertType;
				return <TanStackTable.Text>{label || '-'}</TanStackTable.Text>;
			},
		},
		{
			id: 'ruleType',
			header: 'Rule Type',
			accessorKey: 'ruleType',
			width: { min: 140, default: 140 },
			enableSort: true,
			cell: ({ value }): JSX.Element => {
				const ruleType = String(value ?? '');
				const label = RULE_TYPE_LABELS[ruleType] ?? ruleType;
				return <TanStackTable.Text>{label || '-'}</TanStackTable.Text>;
			},
		},
		{
			id: 'frequency',
			header: 'Frequency',
			accessorKey: 'frequency',
			width: { min: 140, default: 140 },
			enableSort: false,
			cell: ({ value }): JSX.Element => (
				<TanStackTable.Text>{String(value ?? '-')}</TanStackTable.Text>
			),
		},
		{
			id: 'labels',
			header: 'Labels',
			accessorKey: 'labels',
			width: { min: 150, default: 250 },
			enableSort: false,
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
			id: 'preferredChannels',
			header: 'Channels',
			accessorKey: 'preferredChannels',
			width: { min: 120, default: 150 },
			enableSort: false,
			cell: ({ value }): JSX.Element => {
				const channels = value as string[] | undefined;
				if (!channels || channels.length === 0) {
					return <TanStackTable.Text>-</TanStackTable.Text>;
				}
				return <TanStackTable.Text>{channels.join(', ')}</TanStackTable.Text>;
			},
		},
		{
			id: 'evalWindow',
			header: 'Eval Window',
			accessorKey: 'evalWindow',
			width: { min: 80, default: 100 },
			enableSort: false,
			defaultVisibility: false,
			cell: ({ value }): JSX.Element => (
				<TanStackTable.Text>{String(value ?? '-')}</TanStackTable.Text>
			),
		},
		{
			id: 'createdAt',
			header: 'Created At',
			accessorKey: 'createdAt',
			width: { min: 180, default: 200 },
			enableSort: true,
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
			width: { min: 100, default: 120 },
			enableSort: false,
			defaultVisibility: false,
			cell: ({ value }): JSX.Element => (
				<TanStackTable.Text>{String(value ?? '-')}</TanStackTable.Text>
			),
		},
		{
			id: 'updatedAt',
			header: 'Updated At',
			accessorKey: 'updatedAt',
			width: { min: 180, default: 200 },
			enableSort: true,
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
			width: { min: 100, default: 120 },
			enableSort: false,
			defaultVisibility: false,
			cell: ({ value }): JSX.Element => (
				<TanStackTable.Text>{String(value ?? '-')}</TanStackTable.Text>
			),
		},
	];
}
