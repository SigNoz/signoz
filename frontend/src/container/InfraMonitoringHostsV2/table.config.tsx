import React from 'react';
import { Color } from '@signozhq/design-tokens';
import { Container } from '@signozhq/icons';
import {
	InframonitoringtypesHostRecordDTO,
	InframonitoringtypesHostStatusDTO,
} from 'api/generated/services/sigNoz.schemas';
import TanStackTable, { TableColumnDef } from 'components/TanStackTableView';
import { getGroupByEl } from 'container/InfraMonitoringK8sV2/Base/utils';
import {
	EntityProgressBar,
	ExpandButtonWrapper,
	GroupedStatusCounts,
	ValidateColumnValueWrapper,
} from 'container/InfraMonitoringK8sV2/components';
import {
	INFRA_MONITORING_ATTR_KEYS,
	InfraMonitoringEntity,
} from 'container/InfraMonitoringK8sV2/constants';
import { useInfraMonitoringGroupBy } from 'container/InfraMonitoringK8sV2/hooks';
import ColumnHeader from 'container/InfraMonitoringK8sV2/Base/ColumnHeader';
import EntityGroupHeader from 'container/InfraMonitoringK8sV2/Base/EntityGroupHeader';

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
		header: (): React.ReactNode => <EntityGroupHeader title="Host Group" />,
		accessorFn: (row): string => row.hostName ?? '',
		width: { min: 290 },
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
			<EntityGroupHeader
				title="Hostname"
				icon={<Container size={14} />}
				docPath="/infrastructure-monitoring/host-monitoring#hostname"
			/>
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
			<ColumnHeader
				tooltip="Sent system metrics in last 10 mins."
				docPath="/infrastructure-monitoring/host-monitoring#status"
			>
				Status
			</ColumnHeader>
		),
		accessorFn: (row): string => row.status,
		width: { min: 140 },
		enableSort: false,
		cell: ({ value, groupMeta, row, rowId }): React.ReactNode => {
			const status = value as InframonitoringtypesHostStatusDTO;

			if (groupMeta) {
				return (
					<GroupedStatusCounts
						rowId={rowId}
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
			<ColumnHeader docPath="/infrastructure-monitoring/host-monitoring#cpu-usage">
				CPU Usage
			</ColumnHeader>
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
			<ColumnHeader
				tooltip="Excluding cache memory."
				docPath="/infrastructure-monitoring/host-monitoring#memory-usage"
			>
				Memory Usage
				<br /> (WSS)
			</ColumnHeader>
		),
		accessorFn: (row): number => row.memory,
		width: { min: 200 },
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
			<ColumnHeader docPath="/infrastructure-monitoring/host-monitoring#iowait">
				IOWait
			</ColumnHeader>
		),
		accessorFn: (row): number => row.wait,
		width: { min: 120 },
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
			<ColumnHeader docPath="/infrastructure-monitoring/host-monitoring#load-avg">
				Load Avg
				<br /> (15min)
			</ColumnHeader>
		),
		accessorFn: (row): number => row.load15,
		width: { min: 160 },
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
			<ColumnHeader docPath="/infrastructure-monitoring/host-monitoring#disk-usage">
				Disk Usage
			</ColumnHeader>
		),
		accessorFn: (row): number => row.diskUsage,
		width: { min: 200 },
		enableSort: true,
		cell: ({ value }): React.ReactNode => {
			const diskUsage = value as number;

			return (
				<div className={styles.progressContainer}>
					<ValidateColumnValueWrapper
						value={diskUsage}
						entity={InfraMonitoringEntity.HOSTS}
						attribute="disk usage metric"
					>
						<EntityProgressBar value={diskUsage} type="disk" />
					</ValidateColumnValueWrapper>
				</div>
			);
		},
	},
];
