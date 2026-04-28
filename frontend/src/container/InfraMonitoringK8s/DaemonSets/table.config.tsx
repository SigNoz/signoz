import { Tooltip } from 'antd';
import { TableColumnDef } from 'components/TanStackTableView';
import TanStackTable from 'components/TanStackTableView';
import { Group } from 'lucide-react';

import { EntityProgressBar, ValidateColumnValueWrapper } from '../components';
import { formatBytes } from '../commonUtils';
import { InfraMonitoringEntity } from '../constants';
import K8sGroupCell from '../Base/K8sGroupCell';
import { K8sDaemonSetsData } from './api';

import styles from './table.module.scss';
import { ExpandButtonWrapper } from 'container/InfraMonitoringK8s/components';

export function getK8sDaemonSetRowKey(daemonSet: K8sDaemonSetsData): string {
	return (
		daemonSet.daemonSetName ||
		daemonSet.meta.k8s_daemonset_name ||
		`${daemonSet.meta.k8s_namespace_name}-${daemonSet.meta.k8s_daemonset_name}`
	);
}

export function getK8sDaemonSetItemKey(daemonSet: K8sDaemonSetsData): string {
	return daemonSet.meta.k8s_daemonset_name;
}

export const k8sDaemonSetsColumnsConfig: TableColumnDef<K8sDaemonSetsData>[] = [
	{
		id: 'daemonSetGroup',
		header: (): React.ReactNode => (
			<div className={styles.entityGroupHeader}>
				<Group size={14} /> DAEMONSET GROUP
			</div>
		),
		accessorFn: (row): string => row.meta.k8s_daemonset_name || '',
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
		id: 'daemonsetName',
		header: 'DaemonSet Name',
		accessorFn: (row): string => row.meta.k8s_daemonset_name || '',
		width: { min: 290 },
		enableSort: false,
		enableRemove: false,
		enableMove: false,
		pin: 'left',
		visibilityBehavior: 'hidden-on-expand',
		cell: ({ value }): React.ReactNode => {
			const daemonsetName = value as string;
			return (
				<Tooltip title={daemonsetName}>
					<TanStackTable.Text>{daemonsetName}</TanStackTable.Text>
				</Tooltip>
			);
		},
	},
	{
		id: 'namespaceName',
		header: 'Namespace Name',
		accessorFn: (row): string => row.meta.k8s_namespace_name || '',
		width: { default: 100 },
		enableSort: false,
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
		id: 'available_nodes',
		header: 'Available',
		accessorFn: (row): number => row.availableNodes,
		width: { min: 140 },
		enableSort: true,
		cell: ({ value }): React.ReactNode => {
			const availableNodes = value as number;
			return (
				<ValidateColumnValueWrapper value={availableNodes}>
					<TanStackTable.Text>{availableNodes}</TanStackTable.Text>
				</ValidateColumnValueWrapper>
			);
		},
	},
	{
		id: 'desired_nodes',
		header: 'Desired',
		accessorFn: (row): number => row.desiredNodes,
		width: { min: 140 },
		enableSort: true,
		cell: ({ value }): React.ReactNode => {
			const desiredNodes = value as number;
			return (
				<ValidateColumnValueWrapper value={desiredNodes}>
					<TanStackTable.Text>{desiredNodes}</TanStackTable.Text>
				</ValidateColumnValueWrapper>
			);
		},
	},
	{
		id: 'cpu_request',
		header: 'CPU Req Usage (%)',
		accessorFn: (row): number => row.cpuRequest,
		width: { min: 200, default: 200 },
		enableSort: true,
		cell: ({ value }): React.ReactNode => {
			const cpuRequest = value as number;
			return (
				<ValidateColumnValueWrapper
					value={cpuRequest}
					entity={InfraMonitoringEntity.DAEMONSETS}
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
		accessorFn: (row): number => row.cpuLimit,
		width: { min: 200, default: 200 },
		enableSort: true,
		cell: ({ value }): React.ReactNode => {
			const cpuLimit = value as number;
			return (
				<ValidateColumnValueWrapper
					value={cpuLimit}
					entity={InfraMonitoringEntity.DAEMONSETS}
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
		accessorFn: (row): number => row.cpuUsage,
		width: { min: 190 },
		enableSort: true,
		defaultVisibility: false,
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
		accessorFn: (row): number => row.memoryRequest,
		width: { min: 190 },
		enableSort: true,
		defaultVisibility: false,
		cell: ({ value }): React.ReactNode => {
			const memoryRequest = value as number;
			return (
				<ValidateColumnValueWrapper
					value={memoryRequest}
					entity={InfraMonitoringEntity.DAEMONSETS}
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
		accessorFn: (row): number => row.memoryLimit,
		width: { min: 180 },
		enableSort: true,
		cell: ({ value }): React.ReactNode => {
			const memoryLimit = value as number;
			return (
				<ValidateColumnValueWrapper
					value={memoryLimit}
					entity={InfraMonitoringEntity.DAEMONSETS}
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
		accessorFn: (row): number => row.memoryUsage,
		width: { min: 160 },
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
