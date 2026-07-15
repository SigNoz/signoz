import TanStackTable, { TableColumnDef } from 'components/TanStackTableView';
import { InframonitoringtypesVolumeRecordDTO } from 'api/generated/services/sigNoz.schemas';
import { ExpandButtonWrapper } from 'container/InfraMonitoringK8sV2/components';

import ColumnHeader from '../Base/ColumnHeader';
import EntityGroupHeader from '../Base/EntityGroupHeader';
import K8sGroupCell from '../Base/K8sGroupCell';
import { formatBytes } from '../commonUtils';
import { CellValueTooltip, ValidateColumnValueWrapper } from '../components';
import {
	INFRA_MONITORING_ATTR_KEYS,
	InfraMonitoringEntity,
} from '../constants';
import { SelectedItemParams } from '../hooks';
import { HardDrive } from '@signozhq/icons';

export function getK8sVolumeRowKey(
	volume: InframonitoringtypesVolumeRecordDTO,
): string {
	return (
		volume.persistentVolumeClaimName ||
		volume.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_PERSISTENT_VOLUME_CLAIM_NAME] ||
		''
	);
}

export function getK8sVolumeItemKey(
	volume: InframonitoringtypesVolumeRecordDTO,
): SelectedItemParams {
	return {
		selectedItem:
			volume.persistentVolumeClaimName ??
			volume.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_PERSISTENT_VOLUME_CLAIM_NAME] ??
			null,
		clusterName:
			volume.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME] ?? null,
		namespaceName:
			volume.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME] ?? null,
	};
}

export type VolumeTableColumnConfig =
	TableColumnDef<InframonitoringtypesVolumeRecordDTO>;
export const k8sVolumesColumnsConfig: VolumeTableColumnConfig[] = [
	{
		id: 'volumeGroup',
		header: (): React.ReactNode => <EntityGroupHeader title="Volume Group" />,
		accessorFn: (row): string => row.persistentVolumeClaimName || '',
		width: { min: 290 },
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
				docPath="/infrastructure-monitoring/kubernetes/volumes#pvc-name"
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
				<CellValueTooltip value={pvcName}>
					<TanStackTable.Text>{pvcName}</TanStackTable.Text>
				</CellValueTooltip>
			);
		},
	},
	{
		id: 'namespaceName',
		header: (): React.ReactNode => (
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/volumes#namespace-name">
				Namespace
			</ColumnHeader>
		),
		accessorFn: (row): string =>
			row.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME] || '',
		width: { min: 220 },
		enableSort: false,
		cell: ({ value }): React.ReactNode => {
			const namespaceName = value as string;
			return (
				<CellValueTooltip value={namespaceName}>
					<TanStackTable.Text>{namespaceName}</TanStackTable.Text>
				</CellValueTooltip>
			);
		},
	},
	{
		id: 'capacity',
		header: (): React.ReactNode => (
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/volumes#volume-capacity">
				Capacity
			</ColumnHeader>
		),
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
		header: (): React.ReactNode => (
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/volumes#volume-used">
				Used
			</ColumnHeader>
		),
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
		header: (): React.ReactNode => (
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/volumes#volume-available">
				Available
			</ColumnHeader>
		),
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
		header: (): React.ReactNode => (
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/volumes#volume-inodes">
				Inodes
			</ColumnHeader>
		),
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
		header: (): React.ReactNode => (
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/volumes#volume-inodes-used">
				Inodes Used
			</ColumnHeader>
		),
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
		header: (): React.ReactNode => (
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/volumes#volume-inodes-free">
				Inodes Free
			</ColumnHeader>
		),
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
