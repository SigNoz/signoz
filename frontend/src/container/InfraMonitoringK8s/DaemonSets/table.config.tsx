import { TooltipSimple } from '@signozhq/ui/tooltip';
import { InframonitoringtypesDaemonSetRecordDTO } from 'api/generated/services/sigNoz.schemas';
import TanStackTable, { TableColumnDef } from 'components/TanStackTableView';
import { ExpandButtonWrapper } from 'container/InfraMonitoringK8s/components';

import EntityGroupHeader from '../Base/EntityGroupHeader';
import K8sGroupCell from '../Base/K8sGroupCell';
import { formatBytes, getPodPhaseStatusItems } from '../commonUtils';
import {
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
): string {
	return daemonSet.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_DAEMONSET_NAME] || '';
}

export type DaemonSetTableColumnConfig =
	TableColumnDef<InframonitoringtypesDaemonSetRecordDTO>;
export const k8sDaemonSetsColumnsConfig: DaemonSetTableColumnConfig[] = [
	{
		id: 'daemonSetGroup',
		header: (): React.ReactNode => <EntityGroupHeader title="DAEMONSET GROUP" />,
		accessorFn: (row): string =>
			row.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_DAEMONSET_NAME] || '',
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
		header: (): React.ReactNode => (
			<EntityGroupHeader
				title="DaemonSet Name"
				icon={<Group data-hide-expanded="true" size={14} />}
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
				<TooltipSimple title={daemonsetName}>
					<TanStackTable.Text>{daemonsetName}</TanStackTable.Text>
				</TooltipSimple>
			);
		},
	},
	{
		id: 'namespaceName',
		header: 'Namespace Name',
		accessorFn: (row): string =>
			row.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME] || '',
		width: { default: 100 },
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
		id: 'pod_counts_by_phase',
		header: 'Pod Phases',
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
		id: 'current_nodes',
		header: 'Current Nodes',
		accessorFn: (row): number => row.currentNodes,
		width: { min: 140 },
		enableSort: true,
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
		header: 'Desired Nodes',
		accessorFn: (row): number => row.desiredNodes,
		width: { min: 140 },
		enableSort: true,
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
		id: 'cpu_request',
		header: 'CPU Req Usage (%)',
		accessorFn: (row): number => row.daemonSetCPURequest,
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
					<EntityProgressBar value={cpuRequest} type="request" />
				</ValidateColumnValueWrapper>
			);
		},
	},
	{
		id: 'cpu_limit',
		header: 'CPU Limit Usage (%)',
		accessorFn: (row): number => row.daemonSetCPULimit,
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
					<EntityProgressBar value={cpuLimit} type="limit" />
				</ValidateColumnValueWrapper>
			);
		},
	},
	{
		id: 'cpu',
		header: 'CPU Usage (cores)',
		accessorFn: (row): number => row.daemonSetCPU,
		width: { min: 190 },
		enableSort: true,
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
		header: 'Mem Req Usage (%)',
		accessorFn: (row): number => row.daemonSetMemoryRequest,
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
					<EntityProgressBar value={memoryRequest} type="request" />
				</ValidateColumnValueWrapper>
			);
		},
	},
	{
		id: 'memory_limit',
		header: 'Mem Limit Usage (%)',
		accessorFn: (row): number => row.daemonSetMemoryLimit,
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
					<EntityProgressBar value={memoryLimit} type="limit" />
				</ValidateColumnValueWrapper>
			);
		},
	},
	{
		id: 'memory',
		header: 'Mem Usage (WSS)',
		accessorFn: (row): number => row.daemonSetMemory,
		width: { min: 160 },
		enableSort: true,
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
];
