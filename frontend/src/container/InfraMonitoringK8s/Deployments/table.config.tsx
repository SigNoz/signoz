import { Tooltip } from 'antd';
import { TableColumnDef } from 'components/TanStackTableView';
import TanStackTable from 'components/TanStackTableView';
import { Group } from 'lucide-react';

import { EntityProgressBar, ValidateColumnValueWrapper } from '../components';
import { formatBytes } from '../commonUtils';
import { InfraMonitoringEntity } from '../constants';
import K8sGroupCell from '../Base/K8sGroupCell';
import { K8sDeploymentsData } from './api';

import styles from './table.module.scss';
import { ExpandButtonWrapper } from 'container/InfraMonitoringK8s/components';

export function getK8sDeploymentRowKey(deployment: K8sDeploymentsData): string {
	return deployment.meta.k8s_deployment_name || deployment.deploymentName;
}

export function getK8sDeploymentItemKey(
	deployment: K8sDeploymentsData,
): string {
	return deployment.meta.k8s_deployment_name;
}

export const k8sDeploymentsColumnsConfig: TableColumnDef<K8sDeploymentsData>[] =
	[
		{
			id: 'deploymentGroup',
			header: (): React.ReactNode => (
				<div className={styles.entityGroupHeader}>
					<Group size={14} /> DEPLOYMENT GROUP
				</div>
			),
			accessorFn: (row): string => row.meta.k8s_deployment_name || '',
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
			header: 'Deployment Name',
			accessorFn: (row): string => row.meta.k8s_deployment_name || '',
			width: { min: 210 },
			enableSort: false,
			enableRemove: false,
			enableMove: false,
			pin: 'left',
			visibilityBehavior: 'hidden-on-expand',
			cell: ({ value }): React.ReactNode => {
				const deploymentName = value as string;
				return (
					<Tooltip title={deploymentName}>
						<TanStackTable.Text>{deploymentName}</TanStackTable.Text>
					</Tooltip>
				);
			},
		},
		{
			id: 'namespaceName',
			header: 'Namespace Name',
			accessorFn: (row): string => row.meta.k8s_namespace_name || '',
			width: { default: 220 },
			enableSort: false,
			enableResize: true,
			cell: ({ value }): React.ReactNode => (
				<TanStackTable.Text>{value as string}</TanStackTable.Text>
			),
		},
		{
			id: 'available_pods',
			header: 'Available',
			accessorFn: (row): number => row.availablePods,
			width: { min: 100 },
			enableSort: false,
			enableResize: true,
			defaultVisibility: false,
			cell: ({ value }): React.ReactNode => {
				const availablePods = value as number;
				return (
					<ValidateColumnValueWrapper value={availablePods}>
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
			enableSort: false,
			enableResize: true,
			defaultVisibility: false,
			cell: ({ value }): React.ReactNode => {
				const desiredPods = value as number;
				return (
					<ValidateColumnValueWrapper value={desiredPods}>
						<TanStackTable.Text>{desiredPods}</TanStackTable.Text>
					</ValidateColumnValueWrapper>
				);
			},
		},
		{
			id: 'cpu_request',
			header: 'CPU Req Usage (%)',
			accessorFn: (row): number => row.cpuRequest,
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
						<div className={styles.progressBar}>
							<EntityProgressBar value={cpuRequest} type="request" />
						</div>
					</ValidateColumnValueWrapper>
				);
			},
		},
		{
			id: 'cpu_limit',
			header: 'CPU Limit Usage (%)',
			accessorFn: (row): number => row.cpuLimit,
			width: { min: 210 },
			enableSort: true,
			enableResize: true,
			cell: ({ value }): React.ReactNode => {
				const cpuLimit = value as number;
				return (
					<ValidateColumnValueWrapper
						value={cpuLimit}
						entity={InfraMonitoringEntity.DEPLOYMENTS}
						attribute="CPU Limit"
					>
						<div className={styles.progressBar}>
							<EntityProgressBar value={cpuLimit} type="limit" />
						</div>
					</ValidateColumnValueWrapper>
				);
			},
		},
		{
			id: 'cpu',
			header: 'CPU Usage (cores)',
			accessorFn: (row): number => row.cpuUsage,
			width: { min: 210 },
			enableSort: true,
			enableResize: true,
			cell: ({ value }): React.ReactNode => {
				const cpu = value as number;
				return (
					<ValidateColumnValueWrapper value={cpu}>
						<TanStackTable.Text>{cpu}</TanStackTable.Text>
					</ValidateColumnValueWrapper>
				);
			},
		},
		{
			id: 'memory_request',
			header: 'Mem Req Usage (%)',
			accessorFn: (row): number => row.memoryRequest,
			width: { min: 210 },
			enableSort: true,
			enableResize: true,
			cell: ({ value }): React.ReactNode => {
				const memoryRequest = value as number;
				return (
					<ValidateColumnValueWrapper
						value={memoryRequest}
						entity={InfraMonitoringEntity.DEPLOYMENTS}
						attribute="Memory Request"
					>
						<div className={styles.progressBar}>
							<EntityProgressBar value={memoryRequest} type="request" />
						</div>
					</ValidateColumnValueWrapper>
				);
			},
		},
		{
			id: 'memory_limit',
			header: 'Mem Limit Usage (%)',
			accessorFn: (row): number => row.memoryLimit,
			width: { min: 210 },
			enableSort: true,
			enableResize: true,
			cell: ({ value }): React.ReactNode => {
				const memoryLimit = value as number;
				return (
					<ValidateColumnValueWrapper
						value={memoryLimit}
						entity={InfraMonitoringEntity.DEPLOYMENTS}
						attribute="Memory Limit"
					>
						<div className={styles.progressBar}>
							<EntityProgressBar value={memoryLimit} type="limit" />
						</div>
					</ValidateColumnValueWrapper>
				);
			},
		},
		{
			id: 'memory',
			header: 'Mem Usage (WSS)',
			accessorFn: (row): number => row.memoryUsage,
			width: { min: 140 },
			enableSort: true,
			enableResize: true,
			cell: ({ value }): React.ReactNode => {
				const memory = value as number;
				return (
					<ValidateColumnValueWrapper value={memory}>
						<TanStackTable.Text>{formatBytes(memory)}</TanStackTable.Text>
					</ValidateColumnValueWrapper>
				);
			},
		},
	];
