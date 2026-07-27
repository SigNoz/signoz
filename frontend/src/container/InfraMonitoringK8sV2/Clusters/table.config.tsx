import { Color } from '@signozhq/design-tokens';
import { Boxes } from '@signozhq/icons';
import { InframonitoringtypesClusterRecordDTO } from 'api/generated/services/sigNoz.schemas';
import { TableColumnDef } from 'components/TanStackTableView';
import TanStackTable from 'components/TanStackTableView';
import { ExpandButtonWrapper } from 'container/InfraMonitoringK8sV2/components';

import ColumnHeader from '../Base/ColumnHeader';
import EntityGroupHeader from '../Base/EntityGroupHeader';
import K8sGroupCell from '../Base/K8sGroupCell';
import { formatBytes, getPodStatusItems } from '../commonUtils';
import {
	CellValueTooltip,
	GroupedStatusCounts,
	ValidateColumnValueWrapper,
} from '../components';
import {
	INFRA_MONITORING_ATTR_KEYS,
	InfraMonitoringEntity,
} from '../constants';

export function getK8sClusterRowKey(
	cluster: InframonitoringtypesClusterRecordDTO,
): string {
	return (
		cluster.clusterName ||
		cluster.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_UID] ||
		''
	);
}

export function getK8sClusterItemKey(
	cluster: InframonitoringtypesClusterRecordDTO,
): string {
	return cluster.clusterName;
}

export type ClusterTableColumnConfig =
	TableColumnDef<InframonitoringtypesClusterRecordDTO>;
export const k8sClustersColumnsConfig: ClusterTableColumnConfig[] = [
	{
		id: 'clusterGroup',
		header: (): React.ReactNode => <EntityGroupHeader title="Cluster Group" />,
		accessorFn: (row): string => row.clusterName || '',
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
		id: 'clusterName',
		header: (): React.ReactNode => (
			<EntityGroupHeader
				title="Cluster Name"
				icon={<Boxes data-hide-expanded="true" size={14} />}
				docPath="/infrastructure-monitoring/kubernetes/clusters#cluster-name"
			/>
		),
		accessorFn: (row): string => row.clusterName || '',
		width: { min: 290 },
		enableSort: false,
		enableRemove: false,
		enableMove: false,
		pin: 'left',
		visibilityBehavior: 'hidden-on-expand',
		cell: ({ value }): React.ReactNode => {
			const clusterName = value as string;
			return <CellValueTooltip value={clusterName} />;
		},
	},
	{
		id: 'nodeCountsByReadiness',
		header: (): React.ReactNode => (
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/clusters#node-readiness">
				Node Readiness
			</ColumnHeader>
		),
		accessorFn: (
			row,
		): InframonitoringtypesClusterRecordDTO['nodeCountsByReadiness'] =>
			row.nodeCountsByReadiness,
		width: { min: 180 },
		enableSort: false,
		cell: ({ row, rowId }): React.ReactNode => {
			if (!row.nodeCountsByReadiness) {
				return <TanStackTable.Text>-</TanStackTable.Text>;
			}

			return (
				<GroupedStatusCounts
					rowId={rowId}
					items={[
						{
							value: row.nodeCountsByReadiness.ready,
							label: 'Ready',
							color: Color.BG_FOREST_500,
						},
						{
							value: row.nodeCountsByReadiness.notReady,
							label: 'Not Ready',
							color: Color.BG_AMBER_500,
						},
					]}
				/>
			);
		},
	},
	{
		id: 'podCountsByStatus',
		header: (): React.ReactNode => (
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/clusters#pod-counts-by-status">
				Pod Status
			</ColumnHeader>
		),
		accessorFn: (
			row,
		): InframonitoringtypesClusterRecordDTO['podCountsByStatus'] =>
			row.podCountsByStatus,
		width: { min: 250 },
		enableSort: false,
		cell: ({ row, rowId }): React.ReactNode => {
			const podCountsByStatus = row.podCountsByStatus;
			if (!podCountsByStatus) {
				return <TanStackTable.Text>-</TanStackTable.Text>;
			}
			return (
				<GroupedStatusCounts
					rowId={rowId}
					items={getPodStatusItems(row.podCountsByStatus)}
				/>
			);
		},
	},
	{
		id: 'cpu',
		header: (): React.ReactNode => (
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/clusters#cpu-usage-cores">
				CPU Usage
				<br /> (cores)
			</ColumnHeader>
		),
		accessorFn: (row): number => row.clusterCPU,
		width: { min: 160 },
		enableSort: true,
		cell: ({ value }): React.ReactNode => {
			const cpu = Number(value);
			return (
				<ValidateColumnValueWrapper
					value={cpu}
					entity={InfraMonitoringEntity.CLUSTERS}
					attribute="CPU metric"
				>
					<TanStackTable.Text>{cpu.toFixed(2)}</TanStackTable.Text>
				</ValidateColumnValueWrapper>
			);
		},
	},
	{
		id: 'cpu_allocatable',
		header: (): React.ReactNode => (
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/clusters#cpu-alloc-cores">
				CPU Allocatable
				<br /> (cores)
			</ColumnHeader>
		),
		accessorFn: (row): number => row.clusterCPUAllocatable,
		width: { min: 200 },
		enableSort: true,
		cell: ({ value }): React.ReactNode => {
			const cpuAllocatable = Number(value);
			return (
				<ValidateColumnValueWrapper
					value={cpuAllocatable}
					entity={InfraMonitoringEntity.CLUSTERS}
					attribute="CPU allocatable metric"
				>
					<TanStackTable.Text>{cpuAllocatable.toFixed(2)}</TanStackTable.Text>
				</ValidateColumnValueWrapper>
			);
		},
	},
	{
		id: 'memory',
		header: (): React.ReactNode => (
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/clusters#memory-usage-wss">
				Memory Usage
				<br /> (WSS)
			</ColumnHeader>
		),
		accessorFn: (row): number => row.clusterMemory,
		width: { min: 180 },
		enableSort: true,
		cell: ({ value }): React.ReactNode => {
			const memory = value as number;
			return (
				<ValidateColumnValueWrapper
					value={memory}
					entity={InfraMonitoringEntity.CLUSTERS}
					attribute="memory metric"
				>
					<TanStackTable.Text>{formatBytes(memory)}</TanStackTable.Text>
				</ValidateColumnValueWrapper>
			);
		},
	},
	{
		id: 'memory_allocatable',
		header: (): React.ReactNode => (
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/clusters#memory-allocatable">
				Memory
				<br /> Allocatable
			</ColumnHeader>
		),
		accessorFn: (row): number => row.clusterMemoryAllocatable,
		width: { min: 180 },
		enableSort: true,
		cell: ({ value }): React.ReactNode => {
			const memoryAllocatable = value as number;
			return (
				<ValidateColumnValueWrapper
					value={memoryAllocatable}
					entity={InfraMonitoringEntity.CLUSTERS}
					attribute="memory allocatable metric"
				>
					<TanStackTable.Text>{formatBytes(memoryAllocatable)}</TanStackTable.Text>
				</ValidateColumnValueWrapper>
			);
		},
	},
];
