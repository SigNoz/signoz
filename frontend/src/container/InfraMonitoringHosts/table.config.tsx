import React from 'react';
import { Tag, Tooltip } from 'antd';
import { HostData } from 'api/infraMonitoring/getHostLists';
import TanStackTable, { TableColumnDef } from 'components/TanStackTableView';
import { getGroupByEl } from 'container/InfraMonitoringK8s/Base/utils';
import {
	EntityProgressBar,
	ExpandButtonWrapper,
	ValidateColumnValueWrapper,
} from 'container/InfraMonitoringK8s/components';
import { InfraMonitoringEntity } from 'container/InfraMonitoringK8s/constants';
import { useInfraMonitoringGroupBy } from 'container/InfraMonitoringK8s/hooks';
import EntityGroupHeader from 'container/InfraMonitoringK8s/Base/EntityGroupHeader';

import { HostnameCell } from './utils';

import styles from './table.module.scss';
import { Container, Info } from '@signozhq/icons';

function hostRowSource(host: HostData): { meta: Record<string, string> } {
	return {
		meta: {
			...(host.meta ?? {}),
			host_name: host.hostName ?? '',
			'host.name': host.hostName ?? '',
			os_type: host.os ?? '',
			'os.type': host.os ?? '',
		},
	};
}

export function getHostRowKey(host: HostData): string {
	return host.hostName || 'unknown';
}

export function getHostItemKey(host: HostData): string {
	return host.hostName ?? '';
}

function HostGroupCell({ row }: { row: HostData }): JSX.Element {
	const [groupBy] = useInfraMonitoringGroupBy();
	const synthetic = hostRowSource(row);
	return getGroupByEl(synthetic, groupBy) as JSX.Element;
}

export const hostColumnsConfig: TableColumnDef<HostData>[] = [
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
		id: 'active',
		header: (): React.ReactNode => (
			<div className={styles.statusHeader}>
				Status
				<Tooltip title="Sent system metrics in last 10 mins">
					<Info size="md" />
				</Tooltip>
			</div>
		),
		accessorFn: (row): boolean => row.active,
		width: { min: 150, default: 150 },
		enableSort: false,
		cell: ({ value }): React.ReactNode => {
			const active = value as boolean;
			return (
				<Tag
					bordered
					className={`${styles.statusTag} ${
						active ? styles.statusTagActive : styles.statusTagInactive
					}`}
				>
					{active ? 'ACTIVE' : 'INACTIVE'}
				</Tag>
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
				<TanStackTable.Text>{`${Number((wait * 100).toFixed(1))}%`}</TanStackTable.Text>
			);
		},
	},
	{
		id: 'load15',
		header: (): React.ReactNode => (
			<div className={styles.columnHeaderRight}>Load Avg</div>
		),
		accessorFn: (row): number => row.load15,
		width: { min: 100, default: 100 },
		enableSort: true,
		cell: ({ value }): React.ReactNode => (
			<TanStackTable.Text>{value as number}</TanStackTable.Text>
		),
	},
];
