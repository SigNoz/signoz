import { Tooltip } from 'antd';
import { TableColumnDef } from 'components/TanStackTableView';
import TanStackTable from 'components/TanStackTableView';
import { Group } from 'lucide-react';

import { ValidateColumnValueWrapper } from '../components';
import { formatBytes } from '../commonUtils';
import K8sGroupCell from '../Base/K8sGroupCell';
import { K8sClusterData, K8sClustersListPayload } from './api';

import styles from './table.module.scss';
import { ExpandButtonWrapper } from 'container/InfraMonitoringK8s/components';

export function getK8sClusterRowKey(cluster: K8sClusterData): string {
	return (
		cluster.clusterUID ||
		cluster.meta.k8s_cluster_uid ||
		cluster.meta.k8s_cluster_name
	);
}

export function getK8sClusterItemKey(cluster: K8sClusterData): string {
	return cluster.meta.k8s_cluster_name;
}

export const getK8sClustersListQuery = (): K8sClustersListPayload => ({
	filters: {
		items: [],
		op: 'and',
	},
	orderBy: { columnName: 'cpu', order: 'desc' },
});

export const k8sClustersColumnsConfig: TableColumnDef<K8sClusterData>[] = [
	{
		id: 'clusterGroup',
		header: (): React.ReactNode => (
			<div className={styles.entityGroupHeader}>
				<Group size={14} /> CLUSTER GROUP
			</div>
		),
		accessorFn: (row): string => row.meta.k8s_cluster_name || '',
		width: { min: 300 },
		enableSort: false,
		enableRemove: false,
		enableMove: false,
		pin: 'left',
		visibilityBehavior: 'hidden-on-collapse',
		cell: ({ isExpanded, toggleExpanded, row }): JSX.Element | null => {
			return (
				<ExpandButtonWrapper
					isExpanded={isExpanded}
					toggleExpanded={toggleExpanded}
				>
					<K8sGroupCell row={row} />
				</ExpandButtonWrapper>
			);
		},
	},
	{
		id: 'clusterName',
		header: 'Cluster Name',
		accessorFn: (row): string => row.meta.k8s_cluster_name || '',
		width: { min: 290 },
		enableSort: false,
		enableRemove: false,
		enableMove: false,
		pin: 'left',
		visibilityBehavior: 'hidden-on-expand',
		cell: ({ value }): React.ReactNode => {
			const clusterName = value as string;
			return (
				<Tooltip title={clusterName}>
					<TanStackTable.Text>{clusterName}</TanStackTable.Text>
				</Tooltip>
			);
		},
	},
	{
		id: 'cpu',
		header: 'CPU Usage (cores)',
		accessorFn: (row): number => row.cpuUsage,
		width: { min: 220 },
		enableSort: true,
		cell: ({ value }): React.ReactNode => {
			const cpu = value as number;
			return (
				<ValidateColumnValueWrapper value={cpu}>
					<TanStackTable.Text>{cpu}</TanStackTable.Text>
				</ValidateColumnValueWrapper>
			);
		},
	},
	{
		id: 'cpu_allocatable',
		header: 'CPU Alloc (cores)',
		accessorFn: (row): number => row.cpuAllocatable,
		width: { min: 220 },
		enableSort: true,
		cell: ({ value }): React.ReactNode => {
			const cpuAllocatable = value as number;
			return (
				<ValidateColumnValueWrapper value={cpuAllocatable}>
					<TanStackTable.Text>{cpuAllocatable}</TanStackTable.Text>
				</ValidateColumnValueWrapper>
			);
		},
	},
	{
		id: 'memory',
		header: 'Memory Usage (WSS)',
		accessorFn: (row): number => row.memoryUsage,
		width: { min: 220 },
		enableSort: true,
		cell: ({ value }): React.ReactNode => {
			const memory = value as number;
			return (
				<ValidateColumnValueWrapper value={memory}>
					<TanStackTable.Text>{formatBytes(memory)}</TanStackTable.Text>
				</ValidateColumnValueWrapper>
			);
		},
	},
	{
		id: 'memory_allocatable',
		header: 'Memory Allocatable',
		accessorFn: (row): number => row.memoryAllocatable,
		width: { min: 220 },
		enableSort: true,
		cell: ({ value }): React.ReactNode => {
			const memoryAllocatable = value as number;
			return (
				<ValidateColumnValueWrapper value={memoryAllocatable}>
					<TanStackTable.Text>{formatBytes(memoryAllocatable)}</TanStackTable.Text>
				</ValidateColumnValueWrapper>
			);
		},
	},
];
