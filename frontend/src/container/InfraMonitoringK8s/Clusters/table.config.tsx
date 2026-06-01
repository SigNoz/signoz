import { Color } from '@signozhq/design-tokens';
import { Boxes } from '@signozhq/icons';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import { InframonitoringtypesClusterRecordDTO } from 'api/generated/services/sigNoz.schemas';
import { TableColumnDef } from 'components/TanStackTableView';
import TanStackTable from 'components/TanStackTableView';
import { ExpandButtonWrapper } from 'container/InfraMonitoringK8s/components';

import EntityGroupHeader from '../Base/EntityGroupHeader';
import K8sGroupCell from '../Base/K8sGroupCell';
import { formatBytes, getPodPhaseStatusItems } from '../commonUtils';
import { GroupedStatusCounts, ValidateColumnValueWrapper } from '../components';
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
		header: (): React.ReactNode => <EntityGroupHeader title="CLUSTER GROUP" />,
		accessorFn: (row): string => row.clusterName || '',
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
		header: (): React.ReactNode => (
			<EntityGroupHeader
				title="Cluster Name"
				icon={<Boxes data-hide-expanded="true" size={14} />}
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
			return (
				<TooltipSimple title={clusterName}>
					<TanStackTable.Text>{clusterName}</TanStackTable.Text>
				</TooltipSimple>
			);
		},
	},
	{
		id: 'podCountsByPhase',
		header: 'Pod Phases',
		accessorFn: (row): InframonitoringtypesClusterRecordDTO['podCountsByPhase'] =>
			row.podCountsByPhase,
		width: { min: 220 },
		enableSort: false,
		cell: ({ row }): React.ReactNode => {
			const podCountsByPhase = row.podCountsByPhase;
			if (!podCountsByPhase) {
				return <TanStackTable.Text>-</TanStackTable.Text>;
			}
			return (
				<GroupedStatusCounts items={getPodPhaseStatusItems(row.podCountsByPhase)} />
			);
		},
	},
	{
		id: 'cpu',
		header: 'CPU Usage (cores)',
		accessorFn: (row): number => row.clusterCPU,
		width: { min: 220 },
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
		header: 'CPU Allocatable (cores)',
		accessorFn: (row): number => row.clusterCPUAllocatable,
		width: { min: 220 },
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
		header: 'Memory Usage (WSS)',
		accessorFn: (row): number => row.clusterMemory,
		width: { min: 220 },
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
		header: 'Memory Allocatable',
		accessorFn: (row): number => row.clusterMemoryAllocatable,
		width: { min: 220 },
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
	{
		id: 'nodeCountsByReadiness',
		header: 'Node Readiness',
		accessorFn: (
			row,
		): InframonitoringtypesClusterRecordDTO['nodeCountsByReadiness'] =>
			row.nodeCountsByReadiness,
		width: { min: 180 },
		enableSort: false,
		cell: ({ row }): React.ReactNode => {
			if (!row.nodeCountsByReadiness) {
				return <TanStackTable.Text>-</TanStackTable.Text>;
			}

			return (
				<GroupedStatusCounts
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
];
