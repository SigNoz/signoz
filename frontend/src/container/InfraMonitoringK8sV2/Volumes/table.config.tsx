import { Tooltip } from 'antd';
import { TableColumnDef } from 'components/TanStackTableView';
import TanStackTable from 'components/TanStackTableView';
import { ExpandButtonWrapper } from 'container/InfraMonitoringK8sV2/components';

import EntityGroupHeader from '../Base/EntityGroupHeader';
import K8sGroupCell from '../Base/K8sGroupCell';
import { formatBytes } from '../commonUtils';
import { ValidateColumnValueWrapper } from '../components';
import { InfraMonitoringEntity } from '../constants';
import { K8sVolumesData } from './api';
import { HardDrive } from '@signozhq/icons';

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
		header: (): React.ReactNode => <EntityGroupHeader title="VOLUME GROUP" />,
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
		header: (): React.ReactNode => (
			<EntityGroupHeader
				title="PVC Name"
				icon={<HardDrive data-hide-expanded="true" size={14} />}
			/>
		),
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
		header: 'Capacity',
		accessorFn: (row): number => row.volumeCapacity,
		width: { min: 140 },
		enableSort: true,
		cell: ({ value }): React.ReactNode => {
			const capacity = value as number;
			return (
				<ValidateColumnValueWrapper
					value={capacity}
					entity={InfraMonitoringEntity.VOLUMES}
					attribute="capacity metric"
				>
					<TanStackTable.Text>{formatBytes(capacity)}</TanStackTable.Text>
				</ValidateColumnValueWrapper>
			);
		},
	},
	{
		id: 'usage',
		header: 'Used',
		accessorFn: (row): number => row.volumeUsage,
		width: { min: 140 },
		enableSort: true,
		cell: ({ value }): React.ReactNode => {
			const usage = value as number;
			return (
				<ValidateColumnValueWrapper
					value={usage}
					entity={InfraMonitoringEntity.VOLUMES}
					attribute="utilization metric"
				>
					<TanStackTable.Text>{formatBytes(usage)}</TanStackTable.Text>
				</ValidateColumnValueWrapper>
			);
		},
	},
	{
		id: 'available',
		header: 'Available',
		accessorFn: (row): number => row.volumeAvailable,
		width: { min: 140 },
		enableSort: true,
		cell: ({ value }): React.ReactNode => {
			const available = value as number;
			return (
				<ValidateColumnValueWrapper
					value={available}
					entity={InfraMonitoringEntity.VOLUMES}
					attribute="available metric"
				>
					<TanStackTable.Text>{formatBytes(available)}</TanStackTable.Text>
				</ValidateColumnValueWrapper>
			);
		},
	},
	{
		id: 'inodes',
		header: 'Inodes',
		accessorFn: (row): number => row.volumeInodes,
		width: { min: 140 },
		enableSort: true,
		cell: ({ value }): React.ReactNode => {
			const inodes = value as number;
			return (
				<ValidateColumnValueWrapper
					value={inodes}
					entity={InfraMonitoringEntity.VOLUMES}
					attribute="inodes metric"
				>
					<TanStackTable.Text>{inodes}</TanStackTable.Text>
				</ValidateColumnValueWrapper>
			);
		},
	},
	{
		id: 'inodesUsed',
		header: 'Inodes Used',
		accessorFn: (row): number => row.volumeInodesUsed,
		width: { min: 160 },
		enableSort: true,
		cell: ({ value }): React.ReactNode => {
			const inodesUsed = value as number;
			return (
				<ValidateColumnValueWrapper
					value={inodesUsed}
					entity={InfraMonitoringEntity.VOLUMES}
					attribute="inodes used metric"
				>
					<TanStackTable.Text>{inodesUsed}</TanStackTable.Text>
				</ValidateColumnValueWrapper>
			);
		},
	},
	{
		id: 'inodesFree',
		header: 'Inodes Free',
		accessorFn: (row): number => row.volumeInodesFree,
		width: { min: 160 },
		enableSort: true,
		cell: ({ value }): React.ReactNode => {
			const inodesFree = value as number;
			return (
				<ValidateColumnValueWrapper
					value={inodesFree}
					entity={InfraMonitoringEntity.VOLUMES}
					attribute="inodes free metric"
				>
					<TanStackTable.Text>{inodesFree}</TanStackTable.Text>
				</ValidateColumnValueWrapper>
			);
		},
	},
];
