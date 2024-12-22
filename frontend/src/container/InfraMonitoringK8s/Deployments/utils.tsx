import { Color } from '@signozhq/design-tokens';
import { Progress, Tag } from 'antd';
import { ColumnType } from 'antd/es/table';
import {
	K8sDeploymentsData,
	K8sDeploymentsListPayload,
} from 'api/infraMonitoring/getK8sDeploymentsList';
import { Group } from 'lucide-react';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

import { IEntityColumn } from '../utils';

export const defaultAddedColumns: IEntityColumn[] = [
	{
		label: 'Deployment Name',
		value: 'deploymentName',
		id: 'deploymentName',
		canRemove: false,
	},
	{
		label: 'Namespace Name',
		value: 'namespaceName',
		id: 'namespaceName',
		canRemove: false,
	},
	{
		label: 'Available',
		value: 'available',
		id: 'available',
		canRemove: false,
	},
	{
		label: 'Desired',
		value: 'desired',
		id: 'desired',
		canRemove: false,
	},
	{
		label: 'CPU Request Utilization (% of limit)',
		value: 'cpuRequestUtilization',
		id: 'cpuRequestUtilization',
		canRemove: false,
	},
	{
		label: 'CPU Limit Utilization (% of request)',
		value: 'cpuLimitUtilization',
		id: 'cpuLimitUtilization',
		canRemove: false,
	},
	{
		label: 'CPU Utilization (cores)',
		value: 'cpuUtilization',
		id: 'cpuUtilization',
		canRemove: false,
	},
	{
		label: 'Memory Request Utilization (% of limit)',
		value: 'memoryRequestUtilization',
		id: 'memoryRequestUtilization',
		canRemove: false,
	},
	{
		label: 'Memory Limit Utilization (% of request)',
		value: 'memoryLimitUtilization',
		id: 'memoryLimitUtilization',
		canRemove: false,
	},
	{
		label: 'Memory Utilization (bytes)',
		value: 'memoryUtilization',
		id: 'memoryUtilization',
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
	clusterName: string;
	namespaceName: string;
	groupedByMeta?: any;
}

const deploymentGroupColumnConfig = {
	title: (
		<div className="column-header pod-group-header">
			<Group size={14} /> DEPLOYMENT GROUP
		</div>
	),
	dataIndex: 'deploymentGroup',
	key: 'deploymentGroup',
	ellipsis: true,
	width: 150,
	align: 'left',
	sorter: false,
};

export const getK8sDeploymentsListQuery = (): K8sDeploymentsListPayload => ({
	filters: {
		items: [],
		op: 'and',
	},
	orderBy: { columnName: 'cpu', order: 'desc' },
});

const columnsConfig = [
	{
		title: <div className="column-header-left">Deployment Name</div>,
		dataIndex: 'deploymentName',
		key: 'deploymentName',
		ellipsis: true,
		width: 150,
		sorter: true,
		align: 'left',
	},
	{
		title: <div className="column-header-left">Namespace Name</div>,
		dataIndex: 'namespaceName',
		key: 'namespaceName',
		ellipsis: true,
		width: 150,
		sorter: true,
		align: 'left',
	},
	{
		title: <div className="column-header-left">Available</div>,
		dataIndex: 'availableReplicas',
		key: 'availableReplicas',
		width: 100,
		sorter: true,
		align: 'left',
	},
	{
		title: <div className="column-header-left">Desired</div>,
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
		title: <div className="column-header-left">Memory Utilization (bytes)</div>,
		dataIndex: 'memoryUtilization',
		key: 'memoryUtilization',
		width: 80,
		sorter: true,
		align: 'left',
	},
];

export const getK8sDeploymentsListColumns = (
	groupBy: IBuilderQuery['groupBy'],
): ColumnType<K8sDeploymentsRowData>[] => {
	if (groupBy.length > 0) {
		const filteredColumns = [...columnsConfig].filter(
			(column) => column.key !== 'deploymentName',
		);
		filteredColumns.unshift(deploymentGroupColumnConfig);
		return filteredColumns as ColumnType<K8sDeploymentsRowData>[];
	}

	return columnsConfig as ColumnType<K8sDeploymentsRowData>[];
};

const getGroupByEle = (
	deployment: K8sDeploymentsData,
	groupBy: IBuilderQuery['groupBy'],
): React.ReactNode => {
	const groupByValues: string[] = [];

	groupBy.forEach((group) => {
		groupByValues.push(
			deployment.meta[group.key as keyof typeof deployment.meta],
		);
	});

	return (
		<div className="pod-group">
			{groupByValues.map((value) => (
				<Tag key={value} color="#1D212D" className="pod-group-tag-item">
					{value === '' ? '<no-value>' : value}
				</Tag>
			))}
		</div>
	);
};

const getStrokeColorForProgressBar = (value: number): string => {
	if (value >= 90) return Color.BG_SAKURA_500;
	if (value >= 60) return Color.BG_AMBER_500;
	return Color.BG_FOREST_500;
};

export const formatDataForTable = (
	data: K8sDeploymentsData[],
	groupBy: IBuilderQuery['groupBy'],
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
		clusterName: deployment.meta.k8s_cluster_name,
		namespaceName: deployment.meta.k8s_namespace_name,
		deploymentGroup: getGroupByEle(deployment, groupBy),
		meta: deployment.meta,
		...deployment.meta,
		groupedByMeta: deployment.meta,
	}));
