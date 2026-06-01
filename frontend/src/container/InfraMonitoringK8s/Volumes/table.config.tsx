import { TooltipSimple } from '@signozhq/ui/tooltip';
import { InframonitoringtypesVolumeRecordDTO } from 'api/generated/services/sigNoz.schemas';
import { TableColumnDef } from 'components/TanStackTableView';
import TanStackTable from 'components/TanStackTableView';
import { ExpandButtonWrapper } from 'container/InfraMonitoringK8s/components';

import EntityGroupHeader from '../Base/EntityGroupHeader';
import K8sGroupCell from '../Base/K8sGroupCell';
import { formatBytes } from '../commonUtils';
import { ValidateColumnValueWrapper } from '../components';
import {
	INFRA_MONITORING_ATTR_KEYS,
	InfraMonitoringEntity,
} from '../constants';
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
): string {
	return volume.persistentVolumeClaimName;
}

export type VolumeTableColumnConfig =
	TableColumnDef<InframonitoringtypesVolumeRecordDTO>;
export const k8sVolumesColumnsConfig: VolumeTableColumnConfig[] = [
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
				<TooltipSimple title={pvcName}>
					<TanStackTable.Text>{pvcName}</TanStackTable.Text>
				</TooltipSimple>
			);
		},
	},
	{
		id: 'namespaceName',
		header: 'Namespace Name',
		accessorFn: (row): string =>
			row.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME] || '',
		width: { min: 220 },
		enableSort: false,
		cell: ({ value }): React.ReactNode => {
			const namespaceName = value as string;
			return (
				<TooltipSimple title={namespaceName}>
					<TanStackTable.Text>{namespaceName}</TanStackTable.Text>
				</TooltipSimple>
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
		header: 'Volume Used',
		accessorFn: (row): number => row.volumeUsage,
		width: { min: 220 },
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
		header: 'Volume Available',
		accessorFn: (row): number => row.volumeAvailable,
		width: { min: 220 },
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
		header: 'Total Inodes',
		accessorFn: (row): number => row.volumeInodes,
		width: { min: 180 },
		enableSort: true,
		cell: ({ value }): React.ReactNode => {
			const inodes = value as number;
			return (
				<ValidateColumnValueWrapper
					value={inodes}
					entity={InfraMonitoringEntity.VOLUMES}
					attribute="inodes metric"
				>
					<TanStackTable.Text>{inodes.toLocaleString()}</TanStackTable.Text>
				</ValidateColumnValueWrapper>
			);
		},
	},
	{
		id: 'inodes_free',
		header: 'Inodes Free',
		accessorFn: (row): number => row.volumeInodesFree,
		width: { min: 180 },
		enableSort: true,
		cell: ({ value }): React.ReactNode => {
			const inodesFree = value as number;
			return (
				<ValidateColumnValueWrapper
					value={inodesFree}
					entity={InfraMonitoringEntity.VOLUMES}
					attribute="inodes free metric"
				>
					<TanStackTable.Text>{inodesFree.toLocaleString()}</TanStackTable.Text>
				</ValidateColumnValueWrapper>
			);
		},
	},
	{
		id: 'inodes_used',
		header: 'Inodes Used',
		accessorFn: (row): number => row.volumeInodesUsed,
		width: { min: 180 },
		enableSort: true,
		cell: ({ value }): React.ReactNode => {
			const inodesUsed = value as number;
			return (
				<ValidateColumnValueWrapper
					value={inodesUsed}
					entity={InfraMonitoringEntity.VOLUMES}
					attribute="inodes used metric"
				>
					<TanStackTable.Text>{inodesUsed.toLocaleString()}</TanStackTable.Text>
				</ValidateColumnValueWrapper>
			);
		},
	},
];
