import { Tooltip } from 'antd';
import { TableColumnDef } from 'components/TanStackTableView';
import TanStackTable from 'components/TanStackTableView';
import { Group } from 'lucide-react';

import { ValidateColumnValueWrapper } from '../components';
import { formatBytes } from '../commonUtils';
import K8sGroupCell from '../Base/K8sGroupCell';
import { K8sNodeData, K8sNodesListPayload } from './api';

import styles from './table.module.scss';
import { ExpandButtonWrapper } from 'container/InfraMonitoringK8s/components';

export function getK8sNodeRowKey(node: K8sNodeData): string {
	return node.nodeUID || node.meta.k8s_node_uid || node.meta.k8s_node_name;
}

export function getK8sNodeItemKey(node: K8sNodeData): string {
	return node.meta.k8s_node_name;
}

export const getK8sNodesListQuery = (): K8sNodesListPayload => ({
	filters: {
		items: [],
		op: 'and',
	},
	orderBy: { columnName: 'cpu', order: 'desc' },
});

export const k8sNodesColumnsConfig: TableColumnDef<K8sNodeData>[] = [
	{
		id: 'nodeGroup',
		header: (): React.ReactNode => (
			<div className={styles.entityGroupHeader}>
				<Group size={14} /> NODE GROUP
			</div>
		),
		accessorFn: (row): string => row.meta.k8s_node_name || '',
		width: { min: 300 },
		enableSort: false,
		enableRemove: false,
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
		id: 'nodeName',
		header: 'Node Name',
		accessorFn: (row): string => row.meta.k8s_node_name || '',
		width: { min: 290 },
		enableSort: false,
		enableRemove: false,
		visibilityBehavior: 'hidden-on-expand',
		cell: ({ value }): React.ReactNode => {
			const nodeName = value as string;
			return (
				<Tooltip title={nodeName}>
					<TanStackTable.Text>{nodeName}</TanStackTable.Text>
				</Tooltip>
			);
		},
	},
	{
		id: 'clusterName',
		header: 'Cluster Name',
		accessorFn: (row): string => row.meta.k8s_cluster_name || '',
		width: { min: 150, default: 150 },
		enableSort: false,
		cell: ({ value }): React.ReactNode => (
			<TanStackTable.Text>{value as string}</TanStackTable.Text>
		),
	},
	{
		id: 'cpu',
		header: 'CPU Usage (cores)',
		accessorFn: (row): number => row.nodeCPUUsage,
		width: { min: 200, default: 200 },
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
		accessorFn: (row): number => row.nodeCPUAllocatable,
		width: { min: 200, default: 200 },
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
		accessorFn: (row): number => row.nodeMemoryUsage,
		width: { min: 240, default: 240 },
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
		accessorFn: (row): number => row.nodeMemoryAllocatable,
		width: { min: 240, default: 240 },
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
