import { Color } from '@signozhq/design-tokens';
import { InframonitoringtypesStatefulSetRecordDTO } from 'api/generated/services/sigNoz.schemas';
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
import { ArrowUpDown } from '@signozhq/icons';

export function getK8sStatefulSetRowKey(
	statefulSet: InframonitoringtypesStatefulSetRecordDTO,
): string {
	return (
		statefulSet.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_STATEFULSET_NAME] ||
		statefulSet.statefulSetName ||
		''
	);
}

export function getK8sStatefulSetItemKey(
	statefulSet: InframonitoringtypesStatefulSetRecordDTO,
): SelectedItemParams {
	return {
		selectedItem:
			statefulSet.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_STATEFULSET_NAME] ?? null,
		clusterName:
			statefulSet.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME] ?? null,
		namespaceName:
			statefulSet.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME] ?? null,
	};
}

export const k8sStatefulSetsColumnsConfig: TableColumnDef<InframonitoringtypesStatefulSetRecordDTO>[] =
	[
		{
			id: 'statefulSetGroup',
			header: (): React.ReactNode => (
				<EntityGroupHeader title="StatefulSet Group" />
			),
			accessorFn: (row): string =>
				row.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_STATEFULSET_NAME] || '',
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
			id: 'statefulsetName',
			header: (): React.ReactNode => (
				<EntityGroupHeader
					title="StatefulSet Name"
					icon={<ArrowUpDown data-hide-expanded="true" size={14} />}
					docPath="/infrastructure-monitoring/kubernetes/statefulsets#statefulset-name"
				/>
			),
			accessorFn: (row): string =>
				row.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_STATEFULSET_NAME] || '',
			width: { min: 290 },
			enableSort: false,
			enableRemove: false,
			enableMove: false,
			pin: 'left',
			visibilityBehavior: 'hidden-on-expand',
			cell: ({ value }): React.ReactNode => {
				const statefulsetName = value as string;
				return (
					<CellValueTooltip value={statefulsetName}>
						<TanStackTable.Text>{statefulsetName}</TanStackTable.Text>
					</CellValueTooltip>
				);
			},
		},
		{
			id: 'namespaceName',
			header: (): React.ReactNode => (
				<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/statefulsets#namespace-name">
					Namespace
				</ColumnHeader>
			),
			accessorFn: (row): string =>
				row.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME] || '',
			width: { min: 180 },
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
				<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/statefulsets#pod-counts-by-phase">
					Pod Phases
				</ColumnHeader>
			),
			accessorFn: (
				row,
			): InframonitoringtypesStatefulSetRecordDTO['podCountsByPhase'] =>
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
			id: 'pod_status',
			header: (): React.ReactNode => (
				<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/statefulsets#pod-status">
					Pod Status
				</ColumnHeader>
			),
			accessorFn: (row): number => row.currentPods,
			width: { min: 140 },
			enableSort: false,
			enableResize: true,
			cell: ({ row }): React.ReactNode => (
				<GroupedStatusCounts
					items={[
						{
							value: row.currentPods,
							label: 'Current',
							color: Color.BG_FOREST_500,
						},
						{
							value: row.desiredPods,
							label: 'Desired',
							color: Color.BG_ROBIN_500,
						},
					]}
				/>
			),
		},
		{
			id: 'cpu_request',
			header: (): React.ReactNode => (
				<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/statefulsets#cpu-req-usage-">
					CPU Request
					<br /> Usage (%)
				</ColumnHeader>
			),
			accessorFn: (row): number => row.statefulSetCPURequest,
			width: { min: 200, default: 200 },
			enableSort: true,
			enableResize: true,
			defaultVisibility: false,
			cell: ({ value }): React.ReactNode => {
				const cpuRequest = value as number;
				return (
					<ValidateColumnValueWrapper
						value={cpuRequest}
						entity={InfraMonitoringEntity.STATEFULSETS}
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
				<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/statefulsets#cpu-limit-usage-">
					CPU Limit
					<br /> Usage (%)
				</ColumnHeader>
			),
			accessorFn: (row): number => row.statefulSetCPULimit,
			width: { min: 200, default: 200 },
			enableSort: true,
			enableResize: true,
			cell: ({ value }): React.ReactNode => {
				const cpuLimit = value as number;
				return (
					<ValidateColumnValueWrapper
						value={cpuLimit}
						entity={InfraMonitoringEntity.STATEFULSETS}
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
				<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/statefulsets#cpu-usage-cores">
					CPU Usage
					<br /> (cores)
				</ColumnHeader>
			),
			accessorFn: (row): number => row.statefulSetCPU,
			width: { min: 160 },
			enableSort: true,
			enableResize: true,
			defaultVisibility: false,
			cell: ({ value }): React.ReactNode => {
				const cpu = Number(value);
				return (
					<ValidateColumnValueWrapper
						value={cpu}
						entity={InfraMonitoringEntity.STATEFULSETS}
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
				<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/statefulsets#mem-req-usage-">
					Memory Request
					<br /> Usage (%)
				</ColumnHeader>
			),
			accessorFn: (row): number => row.statefulSetMemoryRequest,
			width: { min: 190 },
			enableSort: true,
			enableResize: true,
			defaultVisibility: false,
			cell: ({ value }): React.ReactNode => {
				const memoryRequest = value as number;
				return (
					<ValidateColumnValueWrapper
						value={memoryRequest}
						entity={InfraMonitoringEntity.STATEFULSETS}
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
				<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/statefulsets#mem-limit-usage-">
					Memory Limit
					<br /> Usage (%)
				</ColumnHeader>
			),
			accessorFn: (row): number => row.statefulSetMemoryLimit,
			width: { min: 180 },
			enableSort: true,
			enableResize: true,
			cell: ({ value }): React.ReactNode => {
				const memoryLimit = value as number;
				return (
					<ValidateColumnValueWrapper
						value={memoryLimit}
						entity={InfraMonitoringEntity.STATEFULSETS}
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
				<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/statefulsets#mem-usage-wss">
					Memory Usage
					<br /> (WSS)
				</ColumnHeader>
			),
			accessorFn: (row): number => row.statefulSetMemory,
			width: { min: 160 },
			enableSort: true,
			enableResize: true,
			defaultVisibility: false,
			cell: ({ value }): React.ReactNode => {
				const memory = value as number;
				return (
					<ValidateColumnValueWrapper
						value={memory}
						entity={InfraMonitoringEntity.STATEFULSETS}
						attribute="memory metric"
					>
						<TanStackTable.Text>{formatBytes(memory)}</TanStackTable.Text>
					</ValidateColumnValueWrapper>
				);
			},
		},
		{
			id: 'current_pods',
			header: (): React.ReactNode => (
				<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/statefulsets#current">
					Current Pods
				</ColumnHeader>
			),
			accessorFn: (row): number => row.currentPods,
			width: { min: 120 },
			enableSort: true,
			defaultVisibility: false,
			cell: ({ value }): React.ReactNode => {
				const currentPods = value as number;
				return (
					<ValidateColumnValueWrapper
						value={currentPods}
						entity={InfraMonitoringEntity.STATEFULSETS}
						attribute="current pod"
					>
						<TanStackTable.Text>{currentPods}</TanStackTable.Text>
					</ValidateColumnValueWrapper>
				);
			},
		},
		{
			id: 'desired_pods',
			header: (): React.ReactNode => (
				<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/statefulsets#desired">
					Desired Pods
				</ColumnHeader>
			),
			accessorFn: (row): number => row.desiredPods,
			width: { min: 120 },
			enableSort: true,
			defaultVisibility: false,
			cell: ({ value }): React.ReactNode => {
				const desiredPods = value as number;
				return (
					<ValidateColumnValueWrapper
						value={desiredPods}
						entity={InfraMonitoringEntity.STATEFULSETS}
						attribute="desired pod"
					>
						<TanStackTable.Text>{desiredPods}</TanStackTable.Text>
					</ValidateColumnValueWrapper>
				);
			},
		},
	];
