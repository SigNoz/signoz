import { Color } from '@signozhq/design-tokens';
import { InframonitoringtypesDeploymentRecordDTO } from 'api/generated/services/sigNoz.schemas';
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
import { Computer } from '@signozhq/icons';

export function getK8sDeploymentRowKey(
	deployment: InframonitoringtypesDeploymentRecordDTO,
): string {
	return (
		deployment.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_DEPLOYMENT_NAME] ||
		deployment.deploymentName ||
		''
	);
}

export function getK8sDeploymentItemKey(
	deployment: InframonitoringtypesDeploymentRecordDTO,
): SelectedItemParams {
	return {
		selectedItem:
			deployment.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_DEPLOYMENT_NAME] ?? null,
		clusterName:
			deployment.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME] ?? null,
		namespaceName:
			deployment.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME] ?? null,
	};
}

export const k8sDeploymentsColumnsConfig: TableColumnDef<InframonitoringtypesDeploymentRecordDTO>[] =
	[
		{
			id: 'deploymentGroup',
			header: (): React.ReactNode => (
				<EntityGroupHeader title="Deployment Group" />
			),
			accessorFn: (row): string =>
				row.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_DEPLOYMENT_NAME] || '',
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
			id: 'deploymentName',
			header: (): React.ReactNode => (
				<EntityGroupHeader
					title="Deployment Name"
					icon={<Computer data-hide-expanded="true" size={14} />}
					docPath="/infrastructure-monitoring/kubernetes/deployments#deployment-name"
				/>
			),
			accessorFn: (row): string =>
				row.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_DEPLOYMENT_NAME] || '',
			width: { min: 290 },
			enableSort: false,
			enableRemove: false,
			enableMove: false,
			pin: 'left',
			visibilityBehavior: 'hidden-on-expand',
			cell: ({ value }): React.ReactNode => {
				const deploymentName = value as string;
				return (
					<CellValueTooltip value={deploymentName}>
						<TanStackTable.Text>{deploymentName}</TanStackTable.Text>
					</CellValueTooltip>
				);
			},
		},
		{
			id: 'namespaceName',
			header: (): React.ReactNode => (
				<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/deployments#namespace-name">
					Namespace
				</ColumnHeader>
			),
			accessorFn: (row): string =>
				row.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME] || '',
			width: { min: 160 },
			enableSort: false,
			enableResize: true,
			cell: ({ value }): React.ReactNode => (
				<TanStackTable.Text>{value as string}</TanStackTable.Text>
			),
		},
		{
			id: 'podCountsByPhase',
			header: (): React.ReactNode => (
				<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/deployments#pod-counts-by-phase">
					Pod Phases
				</ColumnHeader>
			),
			accessorFn: (row): object | undefined => row.podCountsByPhase,
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
			id: 'replica_status',
			header: (): React.ReactNode => (
				<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/deployments#replica-status">
					Replica Status
				</ColumnHeader>
			),
			accessorFn: (row): number => row.availablePods,
			width: { min: 180 },
			enableSort: false,
			enableResize: true,
			cell: ({ row }): React.ReactNode => (
				<GroupedStatusCounts
					items={[
						{
							value: row.availablePods,
							label: 'Available',
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
				<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/deployments#cpu-req-usage-">
					CPU Request
					<br /> Usage (%)
				</ColumnHeader>
			),
			accessorFn: (row): number => row.deploymentCPURequest,
			width: { min: 210 },
			enableSort: true,
			enableResize: true,
			defaultVisibility: false,
			cell: ({ value }): React.ReactNode => {
				const cpuRequest = value as number;
				return (
					<ValidateColumnValueWrapper
						value={cpuRequest}
						entity={InfraMonitoringEntity.DEPLOYMENTS}
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
				<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/deployments#cpu-limit-usage-">
					CPU Limit
					<br /> Usage (%)
				</ColumnHeader>
			),
			accessorFn: (row): number => row.deploymentCPULimit,
			width: { min: 210 },
			enableSort: true,
			enableResize: true,
			cell: ({ value }): React.ReactNode => {
				const cpuLimit = Number(value);
				return (
					<ValidateColumnValueWrapper
						value={cpuLimit}
						entity={InfraMonitoringEntity.DEPLOYMENTS}
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
				<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/deployments#cpu-usage-cores">
					CPU Usage
					<br /> (cores)
				</ColumnHeader>
			),
			accessorFn: (row): number => row.deploymentCPU,
			width: { min: 160 },
			enableSort: true,
			enableResize: true,
			cell: ({ value }): React.ReactNode => {
				const cpu = Number(value);
				return (
					<ValidateColumnValueWrapper
						value={cpu}
						entity={InfraMonitoringEntity.DEPLOYMENTS}
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
				<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/deployments#mem-req-usage-">
					Memory Request
					<br /> Usage (%)
				</ColumnHeader>
			),
			accessorFn: (row): number => row.deploymentMemoryRequest,
			width: { min: 210 },
			enableSort: true,
			enableResize: true,
			defaultVisibility: false,
			cell: ({ value }): React.ReactNode => {
				const memoryRequest = Number(value);
				return (
					<ValidateColumnValueWrapper
						value={memoryRequest}
						entity={InfraMonitoringEntity.DEPLOYMENTS}
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
				<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/deployments#mem-limit-usage-">
					Memory Limit
					<br /> Usage (%)
				</ColumnHeader>
			),
			accessorFn: (row): number => row.deploymentMemoryLimit,
			width: { min: 210 },
			enableSort: true,
			enableResize: true,
			cell: ({ value }): React.ReactNode => {
				const memoryLimit = Number(value);
				return (
					<ValidateColumnValueWrapper
						value={memoryLimit}
						entity={InfraMonitoringEntity.DEPLOYMENTS}
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
				<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/deployments#mem-usage-wss">
					Memory Usage
					<br /> (WSS)
				</ColumnHeader>
			),
			accessorFn: (row): number => row.deploymentMemory,
			width: { min: 180 },
			enableSort: true,
			enableResize: true,
			cell: ({ value }): React.ReactNode => {
				const memory = value as number;
				return (
					<ValidateColumnValueWrapper
						value={memory}
						entity={InfraMonitoringEntity.DEPLOYMENTS}
						attribute="memory metric"
					>
						<TanStackTable.Text>{formatBytes(memory)}</TanStackTable.Text>
					</ValidateColumnValueWrapper>
				);
			},
		},
		{
			id: 'available_pods',
			header: (): React.ReactNode => (
				<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/deployments#available">
					Available Pods
				</ColumnHeader>
			),
			accessorFn: (row): number => row.availablePods,
			width: { min: 120 },
			enableSort: true,
			defaultVisibility: false,
			cell: ({ value }): React.ReactNode => {
				const availablePods = value as number;
				return (
					<ValidateColumnValueWrapper
						value={availablePods}
						entity={InfraMonitoringEntity.DEPLOYMENTS}
						attribute="available pod"
					>
						<TanStackTable.Text>{availablePods}</TanStackTable.Text>
					</ValidateColumnValueWrapper>
				);
			},
		},
		{
			id: 'desired_pods',
			header: (): React.ReactNode => (
				<ColumnHeader docPath="/infrastructure-monitoring/kubernetes/deployments#desired">
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
						entity={InfraMonitoringEntity.DEPLOYMENTS}
						attribute="desired pod"
					>
						<TanStackTable.Text>{desiredPods}</TanStackTable.Text>
					</ValidateColumnValueWrapper>
				);
			},
		},
	];
