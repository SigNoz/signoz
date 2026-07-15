import { Color } from '@signozhq/design-tokens';
import { InframonitoringtypesDaemonSetRecordDTO } from 'api/generated/services/sigNoz.schemas';
import TanStackTable, { TableColumnDef } from 'components/TanStackTableView';
import { ExpandButtonWrapper } from 'container/InfraMonitoringK8sV2/components';

import ColumnHeader from '../Base/ColumnHeader';
import EntityGroupHeader from '../Base/EntityGroupHeader';
import K8sGroupCell from '../Base/K8sGroupCell';
import { SelectedItemParams } from '../hooks';
import { formatBytes, getPodPhaseStatusItems } from '../commonUtils';
import {
	CellValueTooltip,
	EntityProgressBar,
	GroupedStatusCounts,
	ValidateColumnValueWrapper,
} from '../components';
import {
	INFRA_MONITORING_ATTR_KEYS,
	InfraMonitoringEntity,
} from '../constants';
import { Group } from '@signozhq/icons';

export function getK8sDaemonSetRowKey(
	daemonSet: InframonitoringtypesDaemonSetRecordDTO,
): string {
	return (
		daemonSet.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_DAEMONSET_NAME] ||
		daemonSet.daemonSetName ||
		`${daemonSet.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME]}-${daemonSet.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_DAEMONSET_NAME]}`
	);
}

export function getK8sDaemonSetItemKey(
	daemonSet: InframonitoringtypesDaemonSetRecordDTO,
): SelectedItemParams {
	return {
		selectedItem:
			daemonSet.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_DAEMONSET_NAME] ?? null,
		clusterName:
			daemonSet.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME] ?? null,
		namespaceName:
			daemonSet.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME] ?? null,
	};
}

export type DaemonSetTableColumnConfig =
	TableColumnDef<InframonitoringtypesDaemonSetRecordDTO>;
export const k8sDaemonSetsColumnsConfig: DaemonSetTableColumnConfig[] = [
	{
		id: 'daemonSetGroup',
		header: (): React.ReactNode => <EntityGroupHeader title="DaemonSet Group" />,
		accessorFn: (row): string =>
			row.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_DAEMONSET_NAME] || '',
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
		id: 'daemonsetName',
		header: (): React.ReactNode => (
			<EntityGroupHeader
				title="DaemonSet Name"
				icon={<Group data-hide-expanded="true" size={14} />}
				docPath="/infrastructure-monitoring/kubernetes/daemonsets#daemonset-name"
			/>
		),
		accessorFn: (row): string =>
			row.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_DAEMONSET_NAME] || '',
		width: { min: 290 },
		enableSort: false,
		enableRemove: false,
		enableMove: false,
		pin: 'left',
		visibilityBehavior: 'hidden-on-expand',
		cell: ({ value }): React.ReactNode => {
			const daemonsetName = value as string;
			return (
				<CellValueTooltip value={daemonsetName}>
					<TanStackTable.Text>{daemonsetName}</TanStackTable.Text>
				</CellValueTooltip>
			);
		},
	},
	{
		id: 'namespaceName',
		header: (): React.ReactNode => (
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/daemonsets#namespace-name">
				Namespace
			</ColumnHeader>
		),
		accessorFn: (row): string =>
			row.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME] || '',
		width: { min: 160 },
		enableSort: false,
		enableResize: true,
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
		id: 'pod_counts_by_phase',
		header: (): React.ReactNode => (
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/daemonsets#pod-counts-by-phase">
				Pod Phases
			</ColumnHeader>
		),
		accessorFn: (
			row,
		): InframonitoringtypesDaemonSetRecordDTO['podCountsByPhase'] =>
			row.podCountsByPhase,
		width: { min: 250 },
		enableSort: false,
		enableResize: true,
		cell: ({ row }): React.ReactNode => {
			const podCountsByPhase = row.podCountsByPhase;
			if (!podCountsByPhase) {
				return <TanStackTable.Text>-</TanStackTable.Text>;
			}
			return (
				<GroupedStatusCounts items={getPodPhaseStatusItems(podCountsByPhase)} />
			);
		},
	},
	{
		id: 'node_status',
		header: (): React.ReactNode => (
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/daemonsets#node-status">
				Node Status
			</ColumnHeader>
		),
		accessorFn: (row): number => row.currentNodes,
		width: { min: 210 },
		enableSort: false,
		enableResize: true,
		cell: ({ row }): React.ReactNode => (
			<GroupedStatusCounts
				items={[
					{
						value: row.readyNodes,
						label: 'Ready',
						color: Color.BG_FOREST_500,
					},
					{
						value: row.currentNodes,
						label: 'Current',
						color: Color.BG_ROBIN_500,
					},
					{
						value: row.desiredNodes,
						label: 'Desired',
						color: Color.BG_SAKURA_400,
					},
					{
						value: row.misscheduledNodes,
						label: 'Misscheduled',
						color: Color.BG_AMBER_500,
					},
				]}
			/>
		),
	},
	{
		id: 'cpu_request',
		header: (): React.ReactNode => (
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/daemonsets#cpu-req-usage-">
				CPU Request
				<br /> Usage (%)
			</ColumnHeader>
		),
		accessorFn: (row): number => row.daemonSetCPURequest,
		width: { min: 200, default: 200 },
		enableSort: true,
		enableResize: true,
		defaultVisibility: false,
		cell: ({ value }): React.ReactNode => {
			const cpuRequest = value as number;
			return (
				<ValidateColumnValueWrapper
					value={cpuRequest}
					entity={InfraMonitoringEntity.DAEMONSETS}
					attribute="CPU Request"
				>
					<EntityProgressBar value={cpuRequest} type="request" />
				</ValidateColumnValueWrapper>
			);
		},
	},
	{
		id: 'cpu_limit',
		header: (): React.ReactNode => (
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/daemonsets#cpu-limit-usage-">
				CPU Limit
				<br /> Usage (%)
			</ColumnHeader>
		),
		accessorFn: (row): number => row.daemonSetCPULimit,
		width: { min: 160 },
		enableSort: true,
		enableResize: true,
		cell: ({ value }): React.ReactNode => {
			const cpuLimit = value as number;
			return (
				<ValidateColumnValueWrapper
					value={cpuLimit}
					entity={InfraMonitoringEntity.DAEMONSETS}
					attribute="CPU Limit"
				>
					<EntityProgressBar value={cpuLimit} type="limit" />
				</ValidateColumnValueWrapper>
			);
		},
	},
	{
		id: 'cpu',
		header: (): React.ReactNode => (
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/daemonsets#cpu-usage-cores">
				CPU Usage
				<br /> (cores)
			</ColumnHeader>
		),
		accessorFn: (row): number => row.daemonSetCPU,
		width: { min: 160 },
		enableSort: true,
		enableResize: true,
		defaultVisibility: false,
		cell: ({ value }): React.ReactNode => {
			const cpu = Number(value);
			return (
				<ValidateColumnValueWrapper
					value={cpu}
					entity={InfraMonitoringEntity.DAEMONSETS}
					attribute="CPU metric"
				>
					<TanStackTable.Text>{cpu.toFixed(2)}</TanStackTable.Text>
				</ValidateColumnValueWrapper>
			);
		},
	},
	{
		id: 'memory_request',
		header: (): React.ReactNode => (
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/daemonsets#mem-req-usage-">
				Memory Request
				<br /> Usage (%)
			</ColumnHeader>
		),
		accessorFn: (row): number => row.daemonSetMemoryRequest,
		width: { min: 190 },
		enableSort: true,
		enableResize: true,
		defaultVisibility: false,
		cell: ({ value }): React.ReactNode => {
			const memoryRequest = value as number;
			return (
				<ValidateColumnValueWrapper
					value={memoryRequest}
					entity={InfraMonitoringEntity.DAEMONSETS}
					attribute="Memory Request"
				>
					<EntityProgressBar value={memoryRequest} type="request" />
				</ValidateColumnValueWrapper>
			);
		},
	},
	{
		id: 'memory_limit',
		header: (): React.ReactNode => (
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/daemonsets#mem-limit-usage-">
				Memory Limit
				<br /> Usage (%)
			</ColumnHeader>
		),
		accessorFn: (row): number => row.daemonSetMemoryLimit,
		width: { min: 190 },
		enableSort: true,
		enableResize: true,
		cell: ({ value }): React.ReactNode => {
			const memoryLimit = value as number;
			return (
				<ValidateColumnValueWrapper
					value={memoryLimit}
					entity={InfraMonitoringEntity.DAEMONSETS}
					attribute="Memory Limit"
				>
					<EntityProgressBar value={memoryLimit} type="limit" />
				</ValidateColumnValueWrapper>
			);
		},
	},
	{
		id: 'memory',
		header: (): React.ReactNode => (
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/daemonsets#mem-usage-wss">
				Memory Usage
				<br /> (WSS)
			</ColumnHeader>
		),
		accessorFn: (row): number => row.daemonSetMemory,
		width: { min: 180 },
		enableSort: true,
		enableResize: true,
		cell: ({ value }): React.ReactNode => {
			const memory = value as number;
			return (
				<ValidateColumnValueWrapper
					value={memory}
					entity={InfraMonitoringEntity.DAEMONSETS}
					attribute="memory metric"
				>
					<TanStackTable.Text>{formatBytes(memory)}</TanStackTable.Text>
				</ValidateColumnValueWrapper>
			);
		},
	},
	{
		id: 'ready_nodes',
		header: (): React.ReactNode => (
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/daemonsets#ready">
				Ready Nodes
			</ColumnHeader>
		),
		accessorFn: (row): number => row.readyNodes,
		width: { min: 140 },
		enableSort: true,
		defaultVisibility: false,
		cell: ({ value }): React.ReactNode => {
			const readyNodes = value as number;
			return (
				<ValidateColumnValueWrapper
					value={readyNodes}
					entity={InfraMonitoringEntity.DAEMONSETS}
					attribute="ready node"
				>
					<TanStackTable.Text>{readyNodes}</TanStackTable.Text>
				</ValidateColumnValueWrapper>
			);
		},
	},
	{
		id: 'current_nodes',
		header: (): React.ReactNode => (
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/daemonsets#current">
				Current Nodes
			</ColumnHeader>
		),
		accessorFn: (row): number => row.currentNodes,
		width: { min: 140 },
		enableSort: true,
		defaultVisibility: false,
		cell: ({ value }): React.ReactNode => {
			const currentNodes = value as number;
			return (
				<ValidateColumnValueWrapper
					value={currentNodes}
					entity={InfraMonitoringEntity.DAEMONSETS}
					attribute="current node"
				>
					<TanStackTable.Text>{currentNodes}</TanStackTable.Text>
				</ValidateColumnValueWrapper>
			);
		},
	},
	{
		id: 'desired_nodes',
		header: (): React.ReactNode => (
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/daemonsets#desired">
				Desired Nodes
			</ColumnHeader>
		),
		accessorFn: (row): number => row.desiredNodes,
		width: { min: 140 },
		enableSort: true,
		defaultVisibility: false,
		cell: ({ value }): React.ReactNode => {
			const desiredNodes = value as number;
			return (
				<ValidateColumnValueWrapper
					value={desiredNodes}
					entity={InfraMonitoringEntity.DAEMONSETS}
					attribute="desired node"
				>
					<TanStackTable.Text>{desiredNodes}</TanStackTable.Text>
				</ValidateColumnValueWrapper>
			);
		},
	},
	{
		id: 'misscheduled_nodes',
		header: (): React.ReactNode => (
			<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/daemonsets#misscheduled">
				Misscheduled Nodes
			</ColumnHeader>
		),
		accessorFn: (row): number => row.misscheduledNodes,
		width: { min: 140 },
		enableSort: true,
		defaultVisibility: false,
		cell: ({ value }): React.ReactNode => {
			const misscheduledNodes = value as number;
			return (
				<ValidateColumnValueWrapper
					value={misscheduledNodes}
					entity={InfraMonitoringEntity.DAEMONSETS}
					attribute="misscheduled node"
				>
					<TanStackTable.Text>{misscheduledNodes}</TanStackTable.Text>
				</ValidateColumnValueWrapper>
			);
		},
	},
];
