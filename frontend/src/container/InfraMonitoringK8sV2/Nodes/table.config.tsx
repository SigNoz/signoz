import { Color } from '@signozhq/design-tokens';
import { Badge, BadgeColor } from '@signozhq/ui/badge';
import { InframonitoringtypesNodeRecordDTO } from 'api/generated/services/sigNoz.schemas';
import TanStackTable, { TableColumnDef } from 'components/TanStackTableView';
import { ExpandButtonWrapper } from 'container/InfraMonitoringK8sV2/components';

import ColumnHeader from '../Base/ColumnHeader';
import EntityGroupHeader from '../Base/EntityGroupHeader';
import K8sGroupCell from '../Base/K8sGroupCell';
import { formatBytes, getPodStatusItems } from '../commonUtils';
import { INFRA_MONITORING_ATTR_KEYS } from '../constants';
import {
	CellValueTooltip,
	GroupedStatusCounts,
	ValidateColumnValueWrapper,
} from '../components';
import { InfraMonitoringEntity } from '../constants';
import { Workflow } from '@signozhq/icons';

export function getK8sNodeRowKey(
	node: InframonitoringtypesNodeRecordDTO,
): string {
	return (
		node.nodeName || node.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_NODE_UID] || ''
	);
}

export function getK8sNodeItemKey(
	node: InframonitoringtypesNodeRecordDTO,
): string {
	return node.nodeName;
}

const NODE_CONDITION_COLORS: Record<string, BadgeColor> = {
	ready: 'forest',
	not_ready: 'amber',
	no_data: 'secondary',
};

const NODE_CONDITION_LABEL_MAP: Record<string, string> = {
	ready: 'Ready',
	not_ready: 'Not Ready',
	no_data: 'No Data',
};

export type NodeTableColumnConfig =
	TableColumnDef<InframonitoringtypesNodeRecordDTO>;
export const k8sNodesColumnsConfig: NodeTableColumnConfig[] = [
	{
		id: 'nodeGroup',
		header: (): React.ReactNode => <EntityGroupHeader title="Node Group" />,
		accessorFn: (row): string => row.nodeName || '',
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
		id: 'nodeName',
		header: (): React.ReactNode => (
			<EntityGroupHeader
				title="Node Name"
				icon={<Workflow data-hide-expanded="true" size={14} />}
				docPath="/infrastructure-monitoring/kubernetes/nodes#node-name"
			/>
		),
		accessorFn: (row): string => row.nodeName || '',
		width: { min: 290 },
		enableSort: false,
		enableRemove: false,
		enableMove: false,
		pin: 'left',
		visibilityBehavior: 'hidden-on-expand',
		cell: ({ value }): React.ReactNode => {
			const nodeName = value as string;
			return <CellValueTooltip value={nodeName} />;
		},
	},
	{
		id: 'condition',
		header: (): React.ReactNode => (
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/nodes#node-condition">
				Status
			</ColumnHeader>
		),
		accessorFn: (row): string => row.condition,
		width: { min: 120 },
		enableSort: false,
		cell: ({ row, groupMeta, rowId }): React.ReactNode => {
			if (!groupMeta) {
				const color =
					NODE_CONDITION_COLORS[row.condition] || NODE_CONDITION_COLORS.no_data;
				return (
					<Badge color={color} variant="outline">
						{NODE_CONDITION_LABEL_MAP[row.condition] || 'Unknown'}
					</Badge>
				);
			}

			return (
				<GroupedStatusCounts
					items={[
						{
							value: row.nodeCountsByReadiness?.ready ?? 0,
							label: 'Ready',
							color: Color.BG_FOREST_500,
						},
						{
							value: row.nodeCountsByReadiness?.notReady ?? 0,
							label: 'Not Ready',
							color: Color.BG_AMBER_500,
						},
					]}
					rowId={rowId}
				/>
			);
		},
	},
	{
		id: 'podCountsByStatus',
		header: (): React.ReactNode => (
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/nodes#pod-counts-by-status">
				Pod Status
			</ColumnHeader>
		),
		accessorFn: (row): InframonitoringtypesNodeRecordDTO['podCountsByStatus'] =>
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
					items={getPodStatusItems(row.podCountsByStatus)}
					rowId={rowId}
				/>
			);
		},
	},
	{
		id: 'clusterName',
		header: (): React.ReactNode => (
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/nodes#cluster-name">
				Cluster Name
			</ColumnHeader>
		),
		accessorFn: (row): string =>
			row.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME] || '',
		width: { min: 150, default: 150 },
		enableSort: false,
		defaultVisibility: false,
		cell: ({ value }): React.ReactNode => (
			<TanStackTable.Text>{value as string}</TanStackTable.Text>
		),
	},
	{
		id: 'cpu',
		header: (): React.ReactNode => (
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/nodes#cpu-usage-cores">
				CPU Usage
				<br /> (cores)
			</ColumnHeader>
		),
		accessorFn: (row): number => row.nodeCPU,
		width: { min: 160, default: 160 },
		enableSort: true,
		cell: ({ value }): React.ReactNode => {
			const cpu = Number(value);
			return (
				<ValidateColumnValueWrapper
					value={cpu}
					entity={InfraMonitoringEntity.NODES}
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
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/nodes#cpu-alloc-cores">
				CPU Allocatable
				<br /> (cores)
			</ColumnHeader>
		),
		accessorFn: (row): number => row.nodeCPUAllocatable,
		width: { min: 160, default: 190 },
		enableSort: true,
		cell: ({ value }): React.ReactNode => {
			const cpuAllocatable = Number(value);
			return (
				<ValidateColumnValueWrapper
					value={cpuAllocatable}
					entity={InfraMonitoringEntity.NODES}
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
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/nodes#memory-usage-wss">
				Memory Usage
				<br /> (WSS)
			</ColumnHeader>
		),
		accessorFn: (row): number => row.nodeMemory,
		width: { min: 220, default: 220 },
		enableSort: true,
		cell: ({ value }): React.ReactNode => {
			const memory = value as number;
			return (
				<ValidateColumnValueWrapper
					value={memory}
					entity={InfraMonitoringEntity.NODES}
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
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/nodes#memory-allocatable">
				Memory
				<br /> Allocatable
			</ColumnHeader>
		),
		accessorFn: (row): number => row.nodeMemoryAllocatable,
		width: { min: 200, default: 200 },
		enableSort: true,
		cell: ({ value }): React.ReactNode => {
			const memoryAllocatable = value as number;
			return (
				<ValidateColumnValueWrapper
					value={memoryAllocatable}
					entity={InfraMonitoringEntity.NODES}
					attribute="memory allocatable metric"
				>
					<TanStackTable.Text>{formatBytes(memoryAllocatable)}</TanStackTable.Text>
				</ValidateColumnValueWrapper>
			);
		},
	},
];
