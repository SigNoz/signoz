import { Tooltip } from 'antd';
import { TableColumnDef } from 'components/TanStackTableView';
import TanStackTable from 'components/TanStackTableView';
import { Group } from 'lucide-react';

import { EntityProgressBar, ValidateColumnValueWrapper } from '../components';
import { formatBytes } from '../commonUtils';
import { InfraMonitoringEntity } from '../constants';
import K8sGroupCell from '../Base/K8sGroupCell';
import { K8sPodsData } from './api';

import styles from './table.module.scss';
import { ExpandButtonWrapper } from 'container/InfraMonitoringK8s/components';

export function getK8sPodRowKey(pod: K8sPodsData): string {
	return pod.podUID || pod.meta.k8s_pod_uid || pod.meta.k8s_pod_name;
}

export function getK8sPodItemKey(pod: K8sPodsData): string {
	return pod.podUID;
}

export const k8sPodColumnsConfig: TableColumnDef<K8sPodsData>[] = [
	{
		id: 'podGroup',
		header: (): React.ReactNode => (
			<div className={styles.entityGroupHeader}>
				<Group size={14} /> POD GROUP
			</div>
		),
		accessorFn: (row): string => row.meta.k8s_pod_name || '',
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
		id: 'podName',
		header: 'Pod Name',
		accessorFn: (row): string => row.meta.k8s_pod_name || '',
		width: { min: 290 },
		enableSort: false,
		enableRemove: false,
		visibilityBehavior: 'hidden-on-expand',
		cell: ({ value }): React.ReactNode => {
			const podName = value as string;
			return (
				<Tooltip title={podName}>
					<TanStackTable.Text>{podName}</TanStackTable.Text>
				</Tooltip>
			);
		},
	},
	{
		id: 'cpu_request',
		header: 'CPU Req Usage (%)',
		accessorFn: (row): number => row.podCPURequest,
		width: { min: 200 },
		enableSort: true,
		cell: ({ value }): React.ReactNode => {
			const cpuRequest = value as number;
			return (
				<ValidateColumnValueWrapper
					value={cpuRequest}
					entity={InfraMonitoringEntity.PODS}
					attribute="CPU Request"
				>
					<div className={styles.progressBar}>
						<EntityProgressBar value={cpuRequest} type="request" />
					</div>
				</ValidateColumnValueWrapper>
			);
		},
	},
	{
		id: 'cpu_limit',
		header: 'CPU Limit Usage (%)',
		accessorFn: (row): number => row.podCPULimit,
		width: { min: 200 },
		enableSort: true,
		cell: ({ value }): React.ReactNode => {
			const cpuLimit = value as number;
			return (
				<ValidateColumnValueWrapper
					value={cpuLimit}
					entity={InfraMonitoringEntity.PODS}
					attribute="CPU Limit"
				>
					<div className={styles.progressBar}>
						<EntityProgressBar value={cpuLimit} type="limit" />
					</div>
				</ValidateColumnValueWrapper>
			);
		},
	},
	{
		id: 'cpu',
		header: 'CPU Usage (cores)',
		accessorFn: (row): number => row.podCPU,
		width: { min: 190 },
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
		id: 'memory_request',
		header: 'Mem Req Usage (%)',
		accessorFn: (row): number => row.podMemoryRequest,
		width: { min: 200 },
		enableSort: true,
		cell: ({ value }): React.ReactNode => {
			const memoryRequest = value as number;
			return (
				<ValidateColumnValueWrapper
					value={memoryRequest}
					entity={InfraMonitoringEntity.PODS}
					attribute="Memory Request"
				>
					<div className={styles.progressBar}>
						<EntityProgressBar value={memoryRequest} type="request" />
					</div>
				</ValidateColumnValueWrapper>
			);
		},
	},
	{
		id: 'memory_limit',
		header: 'Mem Limit Usage (%)',
		accessorFn: (row): number => row.podMemoryLimit,
		width: { min: 200 },
		enableSort: true,
		cell: ({ value }): React.ReactNode => {
			const memoryLimit = value as number;
			return (
				<ValidateColumnValueWrapper
					value={memoryLimit}
					entity={InfraMonitoringEntity.PODS}
					attribute="Memory Limit"
				>
					<div className={styles.progressBar}>
						<EntityProgressBar value={memoryLimit} type="limit" />
					</div>
				</ValidateColumnValueWrapper>
			);
		},
	},
	{
		id: 'memory',
		header: 'Mem Usage (WSS)',
		accessorFn: (row): number => row.podMemory,
		width: { min: 200, default: '100%' },
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
		id: 'namespace',
		header: 'Namespace',
		accessorFn: (row): string => row.meta.k8s_namespace_name || '',
		width: { default: 100 },
		enableSort: false,
		defaultVisibility: false,
		cell: ({ value }): React.ReactNode => (
			<TanStackTable.Text>{value as string}</TanStackTable.Text>
		),
	},
	{
		id: 'node',
		header: 'Node',
		accessorFn: (row): string => row.meta.k8s_node_name || '',
		width: { default: 100 },
		enableSort: false,
		defaultVisibility: false,
		cell: ({ value }): React.ReactNode => (
			<TanStackTable.Text>{value as string}</TanStackTable.Text>
		),
	},
	{
		id: 'cluster',
		header: 'Cluster',
		accessorFn: (row): string => row.meta.k8s_cluster_name || '',
		width: { default: 100 },
		enableSort: false,
		defaultVisibility: false,
		cell: ({ value }): React.ReactNode => (
			<TanStackTable.Text>{value as string}</TanStackTable.Text>
		),
	},
];
