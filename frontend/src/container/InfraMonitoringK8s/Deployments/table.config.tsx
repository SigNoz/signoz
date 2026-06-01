import { TooltipSimple } from '@signozhq/ui/tooltip';
import { InframonitoringtypesDeploymentRecordDTO } from 'api/generated/services/sigNoz.schemas';
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
): string {
	return deployment.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_DEPLOYMENT_NAME] || '';
}

export const k8sDeploymentsColumnsConfig: TableColumnDef<InframonitoringtypesDeploymentRecordDTO>[] =
	[
		{
			id: 'deploymentGroup',
			header: (): React.ReactNode => (
				<EntityGroupHeader title="DEPLOYMENT GROUP" />
			),
			accessorFn: (row): string =>
				row.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_DEPLOYMENT_NAME] || '',
			width: { min: 220 },
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
				/>
			),
			accessorFn: (row): string =>
				row.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_DEPLOYMENT_NAME] || '',
			width: { min: 210 },
			enableSort: false,
			enableRemove: false,
			enableMove: false,
			pin: 'left',
			visibilityBehavior: 'hidden-on-expand',
			cell: ({ value }): React.ReactNode => {
				const deploymentName = value as string;
				return (
					<TooltipSimple title={deploymentName}>
						<TanStackTable.Text>{deploymentName}</TanStackTable.Text>
					</TooltipSimple>
				);
			},
		},
		{
			id: 'namespaceName',
			header: 'Namespace Name',
			accessorFn: (row): string =>
				row.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME] || '',
			width: { default: 220 },
			enableSort: false,
			enableResize: true,
			cell: ({ value }): React.ReactNode => (
				<TanStackTable.Text>{value as string}</TanStackTable.Text>
			),
		},
		{
			id: 'podCountsByPhase',
			header: 'Pod Status',
			accessorFn: (row): object | undefined => row.podCountsByPhase,
			width: { min: 220 },
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
			id: 'available_pods',
			header: 'Available',
			accessorFn: (row): number => row.availablePods,
			width: { min: 100 },
			enableSort: true,
			enableResize: true,
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
			header: 'Desired',
			accessorFn: (row): number => row.desiredPods,
			width: { min: 80 },
			enableSort: true,
			enableResize: true,
			defaultVisibility: false,
			cell: ({ value }): React.ReactNode => {
				const desiredPods = Number(value);
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
		{
			id: 'cpu_request',
			header: 'CPU Req Usage (%)',
			accessorFn: (row): number => row.deploymentCPURequest,
			width: { min: 210 },
			enableSort: true,
			enableResize: true,
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
			header: 'CPU Limit Usage (%)',
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
			header: 'CPU Usage (cores)',
			accessorFn: (row): number => row.deploymentCPU,
			width: { min: 210 },
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
			header: 'Mem Req Usage (%)',
			accessorFn: (row): number => row.deploymentMemoryRequest,
			width: { min: 210 },
			enableSort: true,
			enableResize: true,
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
			header: 'Mem Limit Usage (%)',
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
			header: 'Mem Usage (WSS)',
			accessorFn: (row): number => row.deploymentMemory,
			width: { min: 140 },
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
	];
