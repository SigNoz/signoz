import { Color } from '@signozhq/design-tokens';
import { Progress } from 'antd';
import { ColumnType } from 'antd/es/table';
import {
	K8sDeploymentsData,
	K8sDeploymentsListPayload,
} from 'api/infraMonitoring/getK8sDeploymentsList';

import { IEntityColumn } from '../utils';

export const defaultAddedColumns: IEntityColumn[] = [
	{
		label: 'Namespace Status',
		value: 'NamespaceStatus',
		id: 'NamespaceStatus',
		canRemove: false,
	},
	{
		label: 'CPU Utilization (cores)',
		value: 'cpuUsage',
		id: 'cpuUsage',
		canRemove: false,
	},
	{
		label: 'CPU Allocatable (cores)',
		value: 'cpuAllocatable',
		id: 'cpuAllocatable',
		canRemove: false,
	},
	{
		label: 'Memory Allocatable (bytes)',
		value: 'memoryAllocatable',
		id: 'memoryAllocatable',
		canRemove: false,
	},
	{
		label: 'Pods count by phase',
		value: 'podsCount',
		id: 'podsCount',
		canRemove: false,
	},
];

export interface K8sDeploymentsRowData {
	key: string;
	deploymentName: string;
	availableReplicas: number;
	desiredReplicas: number;
	cpuRequestUtilization: React.ReactNode;
	cpuLimitUtilization: React.ReactNode;
	cpuUtilization: number;
	memoryRequestUtilization: React.ReactNode;
	memoryLimitUtilization: React.ReactNode;
	memoryUtilization: number;
	containerRestarts: number;
}

export const getK8sDeploymentsListQuery = (): K8sDeploymentsListPayload => ({
	filters: {
		items: [],
		op: 'and',
	},
	orderBy: { columnName: 'cpu', order: 'desc' },
});

// - Available Replicas
// - Desired Replicas
// - CPU Request Utilization (% of limit)
// - CPU Limit Utilization (% of request)
// - CPU Utilization (cores)
// - Memory Request Utilization (% of limit)
// - Memory Limit Utilization (% of request)
// - Memory Utilization (bytes)
// - Container Restarts

const columnsConfig = [
	{
		title: <div className="column-header-left">Deployment</div>,
		dataIndex: 'deploymentName',
		key: 'deploymentName',
		ellipsis: true,
		width: 150,
		sorter: true,
		align: 'left',
	},
	{
		title: <div className="column-header-left">Available Replicas</div>,
		dataIndex: 'availableReplicas',
		key: 'availableReplicas',
		width: 100,
		sorter: true,
		align: 'left',
	},
	{
		title: <div className="column-header-left">Desired Replicas</div>,
		dataIndex: 'desiredReplicas',
		key: 'desiredReplicas',
		width: 80,
		sorter: true,
		align: 'left',
	},
	{
		title: (
			<div className="column-header-left">
				CPU Request Utilization (% of limit)
			</div>
		),
		dataIndex: 'cpuRequestUtilization',
		key: 'cpuRequestUtilization',
		width: 80,
		sorter: true,
		align: 'left',
	},
	{
		title: (
			<div className="column-header-left">
				CPU Limit Utilization (% of request)
			</div>
		),
		dataIndex: 'cpuLimitUtilization',
		key: 'cpuLimitUtilization',
		width: 50,
		sorter: true,
		align: 'left',
	},
	{
		title: <div className="column-header-left">CPU Utilization (cores)</div>,
		dataIndex: 'cpuUtilization',
		key: 'cpuUtilization',
		width: 80,
		sorter: true,
		align: 'left',
	},
	{
		title: (
			<div className="column-header-left">
				Memory Request Utilization (% of limit)
			</div>
		),
		dataIndex: 'memoryRequestUtilization',
		key: 'memoryRequestUtilization',
		width: 50,
		sorter: true,
		align: 'left',
	},
	{
		title: (
			<div className="column-header-left">
				Memory Limit Utilization (% of request)
			</div>
		),
		dataIndex: 'memoryLimitUtilization',
		key: 'memoryLimitUtilization',
		width: 80,
		sorter: true,
		align: 'left',
	},
	{
		title: <div className="column-header-left">Container Restarts</div>,
		dataIndex: 'containerRestarts',
		key: 'containerRestarts',
		width: 50,
		sorter: true,
		align: 'left',
	},
];

export const getK8sDeploymentsListColumns = (): ColumnType<K8sDeploymentsRowData>[] =>
	columnsConfig as ColumnType<K8sDeploymentsRowData>[];

const getStrokeColorForProgressBar = (value: number): string => {
	if (value >= 90) return Color.BG_SAKURA_500;
	if (value >= 60) return Color.BG_AMBER_500;
	return Color.BG_FOREST_500;
};

export const formatDataForTable = (
	data: K8sDeploymentsData[],
): K8sDeploymentsRowData[] =>
	data.map((deployment, index) => ({
		key: `${deployment.meta.k8s_deployment_name}-${index}`,
		deploymentName: deployment.meta.k8s_deployment_name,
		availableReplicas: deployment.availablePods,
		desiredReplicas: deployment.desiredPods,
		containerRestarts: deployment.restarts,
		cpuUtilization: deployment.cpuUsage,
		cpuRequestUtilization: (
			<div className="progress-container">
				<Progress
					percent={Number((deployment.cpuRequest * 100).toFixed(1))}
					strokeLinecap="butt"
					size="small"
					status="active"
					strokeColor={((): string => {
						const cpuPercent = Number((deployment.cpuRequest * 100).toFixed(1));
						return getStrokeColorForProgressBar(cpuPercent);
					})()}
					className="progress-bar"
				/>
			</div>
		),
		cpuLimitUtilization: (
			<div className="progress-container">
				<Progress
					percent={Number((deployment.cpuLimit * 100).toFixed(1))}
					strokeLinecap="butt"
					size="small"
					status="active"
					strokeColor={((): string => {
						const cpuPercent = Number((deployment.cpuLimit * 100).toFixed(1));
						return getStrokeColorForProgressBar(cpuPercent);
					})()}
					className="progress-bar"
				/>
			</div>
		),
		memoryUtilization: deployment.memoryUsage,
		memoryRequestUtilization: (
			<div className="progress-container">
				<Progress
					percent={Number((deployment.memoryRequest * 100).toFixed(1))}
					strokeLinecap="butt"
					size="small"
					status="active"
					strokeColor={((): string => {
						const memoryPercent = Number((deployment.memoryRequest * 100).toFixed(1));
						return getStrokeColorForProgressBar(memoryPercent);
					})()}
					className="progress-bar"
				/>
			</div>
		),
		memoryLimitUtilization: (
			<div className="progress-container">
				<Progress
					percent={Number((deployment.memoryLimit * 100).toFixed(1))}
					strokeLinecap="butt"
					size="small"
					status="active"
					strokeColor={((): string => {
						const memoryPercent = Number((deployment.memoryLimit * 100).toFixed(1));
						return getStrokeColorForProgressBar(memoryPercent);
					})()}
					className="progress-bar"
				/>
			</div>
		),
	}));
