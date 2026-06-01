import React from 'react';
import { Color } from '@signozhq/design-tokens';
import { Container, Info } from '@signozhq/icons';
import { Tooltip } from 'antd';
import {
	InframonitoringtypesHostRecordDTO,
	InframonitoringtypesHostStatusDTO,
} from 'api/generated/services/sigNoz.schemas';
import TanStackTable, { TableColumnDef } from 'components/TanStackTableView';
import { getGroupByEl } from 'container/InfraMonitoringK8s/Base/utils';
import {
	EntityProgressBar,
	ExpandButtonWrapper,
	GroupedStatusCounts,
	ValidateColumnValueWrapper,
} from 'container/InfraMonitoringK8s/components';
import {
	INFRA_MONITORING_ATTR_KEYS,
	InfraMonitoringEntity,
} from 'container/InfraMonitoringK8s/constants';
import { useInfraMonitoringGroupBy } from 'container/InfraMonitoringK8s/hooks';
import EntityGroupHeader from 'container/InfraMonitoringK8s/Base/EntityGroupHeader';

import { HostnameCell } from './utils';

import styles from './table.module.scss';
import { Badge, BadgeColor } from '@signozhq/ui/badge';

const statusMap: Record<
	InframonitoringtypesHostStatusDTO,
	{
		label: string;
		color: BadgeColor;
	}
> = {
	[InframonitoringtypesHostStatusDTO.active]: {
		label: 'ACTIVE',
		color: 'forest',
	},
	[InframonitoringtypesHostStatusDTO.inactive]: {
		label: 'INACTIVE',
		color: 'amber',
	},
	['']: {
		label: 'UNKNOWN',
		color: 'secondary',
	},
};

function hostRowSource(host: InframonitoringtypesHostRecordDTO): {
	meta: Record<string, string>;
} {
	return {
		meta: {
			...(host.meta ?? {}),
			[INFRA_MONITORING_ATTR_KEYS.HOST_NAME]: host.hostName ?? '',
		},
	};
}

export function getHostRowKey(host: InframonitoringtypesHostRecordDTO): string {
	return host.hostName || 'unknown';
}

export function getHostItemKey(
	host: InframonitoringtypesHostRecordDTO,
): string {
	return host.hostName ?? '';
}

function HostGroupCell({
	row,
}: {
	row: InframonitoringtypesHostRecordDTO;
}): JSX.Element {
	const [groupBy] = useInfraMonitoringGroupBy();
	const synthetic = hostRowSource(row);
	return getGroupByEl(synthetic, groupBy) as JSX.Element;
}

export type HostColumnConfigType =
	TableColumnDef<InframonitoringtypesHostRecordDTO>;
export const hostColumnsConfig: HostColumnConfigType[] = [
	{
		id: 'hostGroup',
		header: (): React.ReactNode => <EntityGroupHeader title="HOST GROUP" />,
		accessorFn: (row): string => row.hostName ?? '',
		width: { min: 300 },
		enableSort: false,
		enableRemove: false,
		enableMove: false,
		pin: 'left',
		visibilityBehavior: 'hidden-on-collapse',
		cell: ({ row, isExpanded, toggleExpanded }): React.ReactNode => (
			<ExpandButtonWrapper isExpanded={isExpanded} toggleExpanded={toggleExpanded}>
				<HostGroupCell row={row} />
			</ExpandButtonWrapper>
		),
	},
	{
		id: 'hostName',
		header: (): React.ReactNode => (
			<EntityGroupHeader title="Hostname" icon={<Container size={14} />} />
		),
		accessorFn: (row): string => row.hostName ?? '',
		width: { min: 290 },
		enableSort: false,
		enableRemove: false,
		enableMove: false,
		pin: 'left',
		visibilityBehavior: 'hidden-on-expand',
		cell: ({ value }): React.ReactNode => (
			<HostnameCell hostName={value as string} />
		),
	},
	{
		id: 'status',
		header: (): React.ReactNode => (
			<div className={styles.statusHeader}>
				Status
				<Tooltip title="Sent system metrics in last 10 mins">
					<Info size="md" />
				</Tooltip>
			</div>
		),
		accessorFn: (row): string => row.status,
		width: { min: 150, default: 150 },
		enableSort: false,
		cell: ({ value, groupMeta, row }): React.ReactNode => {
			const status = value as InframonitoringtypesHostStatusDTO;

			if (groupMeta) {
				return (
					<GroupedStatusCounts
						items={[
							{
								value: row.activeHostCount,
								label: 'Active',
								color: Color.BG_FOREST_500,
							},
							{
								value: row.inactiveHostCount,
								label: 'Inactive',
								color: Color.BG_AMBER_500,
							},
						]}
					/>
				);
			}

			const statusDetails = statusMap[status] || statusMap[''];
			return (
				<Badge
					variant="outline"
					color={statusDetails.color}
					className={`${styles.statusTag}`}
				>
					{statusDetails.label}
				</Badge>
			);
		},
	},
	{
		id: 'cpu',
		header: (): React.ReactNode => (
			<div className={styles.columnHeaderRight}>CPU Usage</div>
		),
		accessorFn: (row): number => row.cpu,
		width: { min: 220 },
		enableSort: true,
		cell: ({ value }): React.ReactNode => {
			const cpu = value as number;
			return (
				<div className={styles.progressContainer}>
					<ValidateColumnValueWrapper
						value={cpu}
						entity={InfraMonitoringEntity.HOSTS}
						attribute="CPU metric"
					>
						<EntityProgressBar value={cpu} type="cpu" />
					</ValidateColumnValueWrapper>
				</div>
			);
		},
	},
	{
		id: 'memory',
		header: (): React.ReactNode => (
			<div className={`${styles.columnHeaderRight} ${styles.memoryUsageHeader}`}>
				Memory Usage
				<Tooltip title="Excluding cache memory">
					<Info size="md" />
				</Tooltip>
			</div>
		),
		accessorFn: (row): number => row.memory,
		width: { min: 220 },
		enableSort: true,
		cell: ({ value }): React.ReactNode => {
			const memory = value as number;
			return (
				<div className={styles.progressContainer}>
					<ValidateColumnValueWrapper
						value={memory}
						entity={InfraMonitoringEntity.HOSTS}
						attribute="memory metric"
					>
						<EntityProgressBar value={memory} type="memory" />
					</ValidateColumnValueWrapper>
				</div>
			);
		},
	},
	{
		id: 'wait',
		header: (): React.ReactNode => (
			<div className={styles.columnHeaderRight}>IOWait</div>
		),
		accessorFn: (row): number => row.wait,
		width: { min: 100, default: 100 },
		enableSort: true,
		cell: ({ value }): React.ReactNode => {
			const wait = value as number;

			return (
				<ValidateColumnValueWrapper
					value={wait}
					entity={InfraMonitoringEntity.HOSTS}
					attribute="IOWait metric"
				>
					<TanStackTable.Text>
						{`${Number((wait * 100).toFixed(1))}%`}
					</TanStackTable.Text>
				</ValidateColumnValueWrapper>
			);
		},
	},
	{
		id: 'load15',
		header: (): React.ReactNode => (
			<div className={styles.columnHeaderRight}>Load Avg (15min)</div>
		),
		accessorFn: (row): number => row.load15,
		width: { min: 170, default: 100 },
		enableSort: true,
		cell: ({ value }): React.ReactNode => {
			const load15 = Number(value);

			return (
				<ValidateColumnValueWrapper
					value={load15}
					entity={InfraMonitoringEntity.HOSTS}
					attribute="load average metric"
				>
					<TanStackTable.Text>{load15.toFixed(2)}</TanStackTable.Text>
				</ValidateColumnValueWrapper>
			);
		},
	},
	{
		id: 'diskUsage',
		header: (): React.ReactNode => (
			<div className={styles.columnHeaderRight}>Disk Usage</div>
		),
		accessorFn: (row): number => row.diskUsage,
		width: { min: 120, default: 120 },
		enableSort: true,
		cell: ({ value }): React.ReactNode => {
			const diskUsage = value as number;

			return (
				<ValidateColumnValueWrapper
					value={diskUsage}
					entity={InfraMonitoringEntity.HOSTS}
					attribute="disk usage metric"
				>
					<TanStackTable.Text>
						{`${Number((diskUsage * 100).toFixed(1))}%`}
					</TanStackTable.Text>
				</ValidateColumnValueWrapper>
			);
		},
	},
];
