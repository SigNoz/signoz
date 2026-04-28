import { Tooltip } from 'antd';
import TanStackTable, { TableColumnDef } from 'components/TanStackTableView';
import { Group } from 'lucide-react';

import { ValidateColumnValueWrapper } from '../components';
import { formatBytes } from '../commonUtils';
import K8sGroupCell from '../Base/K8sGroupCell';
import { K8sNamespacesData, K8sNamespacesListPayload } from './api';

import styles from './table.module.scss';
import { ExpandButtonWrapper } from 'container/InfraMonitoringK8s/components';

export function getK8sNamespaceRowKey(namespace: K8sNamespacesData): string {
	return namespace.namespaceName || namespace.meta.k8s_namespace_name;
}

export function getK8sNamespaceItemKey(namespace: K8sNamespacesData): string {
	return namespace.meta.k8s_namespace_name;
}

export const getK8sNamespacesListQuery = (): K8sNamespacesListPayload => ({
	filters: {
		items: [],
		op: 'and',
	},
	orderBy: { columnName: 'cpu', order: 'desc' },
});

export const k8sNamespacesColumnsConfig: TableColumnDef<K8sNamespacesData>[] = [
	{
		id: 'namespaceGroup',
		header: (): React.ReactNode => (
			<div className={styles.entityGroupHeader}>
				<Group size={14} /> NAMESPACE GROUP
			</div>
		),
		accessorFn: (row): string => row.meta.k8s_namespace_name || '',
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
		id: 'namespaceName',
		header: 'Namespace Name',
		accessorFn: (row): string => row.namespaceName || '',
		width: { min: 290 },
		enableSort: false,
		enableRemove: false,
		enableMove: false,
		pin: 'left',
		visibilityBehavior: 'hidden-on-expand',
		cell: ({ value }): React.ReactNode => {
			const namespaceName = value as string;
			return (
				<Tooltip title={namespaceName}>
					<TanStackTable.Text>{namespaceName}</TanStackTable.Text>
				</Tooltip>
			);
		},
	},
	{
		id: 'clusterName',
		header: 'Cluster Name',
		accessorFn: (row): string => row.meta.k8s_cluster_name || '',
		width: { default: 150 },
		enableSort: false,
		cell: ({ value }): React.ReactNode => (
			<TanStackTable.Text>{value as string}</TanStackTable.Text>
		),
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
		id: 'memory',
		header: 'Mem Usage (WSS)',
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
];
