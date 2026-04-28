import { Tooltip } from 'antd';
import { TableColumnDef } from 'components/TanStackTableView';
import TanStackTable from 'components/TanStackTableView';
import { Group } from 'lucide-react';

import { ValidateColumnValueWrapper } from '../components';
import { formatBytes } from '../commonUtils';
import K8sGroupCell from '../Base/K8sGroupCell';
import { K8sVolumesData } from './api';

import styles from './table.module.scss';
import { ExpandButtonWrapper } from 'container/InfraMonitoringK8s/components';

export function getK8sVolumeRowKey(volume: K8sVolumesData): string {
	return (
		volume.persistentVolumeClaimName ||
		volume.meta.k8s_persistentvolumeclaim_name ||
		''
	);
}

export function getK8sVolumeItemKey(volume: K8sVolumesData): string {
	return volume.persistentVolumeClaimName;
}

export const k8sVolumesColumnsConfig: TableColumnDef<K8sVolumesData>[] = [
	{
		id: 'volumeGroup',
		header: (): React.ReactNode => (
			<div className={styles.entityGroupHeader}>
				<Group size={14} /> VOLUME GROUP
			</div>
		),
		accessorFn: (row): string => row.persistentVolumeClaimName || '',
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
		id: 'pvcName',
		header: 'PVC Name',
		accessorFn: (row): string => row.persistentVolumeClaimName || '',
		width: { min: 290 },
		enableSort: false,
		enableRemove: false,
		enableMove: false,
		pin: 'left',
		visibilityBehavior: 'hidden-on-expand',
		cell: ({ value }): React.ReactNode => {
			const pvcName = value as string;
			return (
				<Tooltip title={pvcName}>
					<TanStackTable.Text>{pvcName}</TanStackTable.Text>
				</Tooltip>
			);
		},
	},
	{
		id: 'namespaceName',
		header: 'Namespace Name',
		accessorFn: (row): string => row.meta.k8s_namespace_name || '',
		width: { min: 220 },
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
		id: 'capacity',
		header: 'Volume Capacity',
		accessorFn: (row): number => row.volumeCapacity,
		width: { min: 220 },
		enableSort: true,
		cell: ({ value }): React.ReactNode => {
			const capacity = value as number;
			return (
				<ValidateColumnValueWrapper value={capacity}>
					<TanStackTable.Text>{formatBytes(capacity)}</TanStackTable.Text>
				</ValidateColumnValueWrapper>
			);
		},
	},
	{
		id: 'usage',
		header: 'Volume Utilization',
		accessorFn: (row): number => row.volumeUsage,
		width: { min: 220 },
		enableSort: true,
		cell: ({ value }): React.ReactNode => {
			const usage = value as number;
			return (
				<ValidateColumnValueWrapper value={usage}>
					<TanStackTable.Text>{formatBytes(usage)}</TanStackTable.Text>
				</ValidateColumnValueWrapper>
			);
		},
	},
	{
		id: 'available',
		header: 'Volume Available',
		accessorFn: (row): number => row.volumeAvailable,
		width: { min: 220 },
		enableSort: true,
		cell: ({ value }): React.ReactNode => {
			const available = value as number;
			return (
				<ValidateColumnValueWrapper value={available}>
					<TanStackTable.Text>{formatBytes(available)}</TanStackTable.Text>
				</ValidateColumnValueWrapper>
			);
		},
	},
];
