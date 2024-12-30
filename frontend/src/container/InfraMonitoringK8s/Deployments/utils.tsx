/* eslint-disable @typescript-eslint/explicit-function-return-type */

import { Progress, Tag, Tooltip } from 'antd';
import { ColumnType } from 'antd/es/table';
import {
	K8sDeploymentsData,
	K8sDeploymentsListPayload,
} from 'api/infraMonitoring/getK8sDeploymentsList';
import { Group } from 'lucide-react';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

import {
	formatBytes,
	getProgressBarText,
	getStrokeColorForLimitUtilization,
	getStrokeColorForRequestUtilization,
	ValidateColumnValueWrapper,
} from '../commonUtils';
import { IEntityColumn } from '../utils';

const INVALID_MEMORY_CPU_VALUE_MESSAGE =
	'Some deployments do not have memory requests/limits.';

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
		value: 'cpu_request',
		id: 'cpu_request',
		canRemove: false,
	},
	{
		label: 'CPU Limit Utilization (% of request)',
		value: 'cpu_limit',
		id: 'cpu_limit',
		canRemove: false,
	},
	{
		label: 'CPU Utilization (cores)',
		value: 'cpu',
		id: 'cpu',
		canRemove: false,
	},
	{
		label: 'Memory Request Utilization (% of limit)',
		value: 'memory_request',
		id: 'memory_request',
		canRemove: false,
	},
	{
		label: 'Memory Limit Utilization (% of request)',
		value: 'memory_limit',
		id: 'memory_limit',
		canRemove: false,
	},
	{
		label: 'Memory Utilization (bytes)',
		value: 'memory',
		id: 'memory',
		canRemove: false,
	},
];

export interface K8sDeploymentsRowData {
	key: string;
	deploymentName: React.ReactNode;
	availableReplicas: React.ReactNode;
	desiredReplicas: React.ReactNode;
	cpu_request: React.ReactNode;
	cpu_limit: React.ReactNode;
	cpu: React.ReactNode;
	memory_request: React.ReactNode;
	memory_limit: React.ReactNode;
	memory: React.ReactNode;
	containerRestarts: React.ReactNode;
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
			<Tooltip title={INVALID_MEMORY_CPU_VALUE_MESSAGE}>
				<div className="column-header-left">
					CPU Request Utilization (% of limit)
				</div>
			</Tooltip>
		),
		dataIndex: 'cpu_request',
		key: 'cpu_request',
		width: 80,
		sorter: true,
		align: 'left',
	},
	{
		title: (
			<Tooltip title={INVALID_MEMORY_CPU_VALUE_MESSAGE}>
				<div className="column-header-left">
					CPU Limit Utilization (% of request)
				</div>
			</Tooltip>
		),
		dataIndex: 'cpu_limit',
		key: 'cpu_limit',
		width: 50,
		sorter: true,
		align: 'left',
	},
	{
		title: <div className="column-header-left">CPU Utilization (cores)</div>,
		dataIndex: 'cpu',
		key: 'cpu',
		width: 80,
		sorter: true,
		align: 'left',
	},
	{
		title: (
			<Tooltip title={INVALID_MEMORY_CPU_VALUE_MESSAGE}>
				<div className="column-header-left">
					Memory Request Utilization (% of limit)
				</div>
			</Tooltip>
		),
		dataIndex: 'memory_request',
		key: 'memory_request',
		width: 50,
		sorter: true,
		align: 'left',
	},
	{
		title: (
			<Tooltip title={INVALID_MEMORY_CPU_VALUE_MESSAGE}>
				<div className="column-header-left">
					Memory Limit Utilization (% of request)
				</div>
			</Tooltip>
		),
		dataIndex: 'memory_limit',
		key: 'memory_limit',
		width: 80,
		sorter: true,
		align: 'left',
	},
	{
		title: <div className="column-header-left">Memory Utilization (bytes)</div>,
		dataIndex: 'memory',
		key: 'memory',
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

export const formatDataForTable = (
	data: K8sDeploymentsData[],
	groupBy: IBuilderQuery['groupBy'],
): K8sDeploymentsRowData[] =>
	data.map((deployment, index) => ({
		key: `${deployment.meta.k8s_deployment_name}-${index}`,
		deploymentName: (
			<Tooltip title={deployment.meta.k8s_deployment_name}>
				{deployment.meta.k8s_deployment_name}
			</Tooltip>
		),
		availableReplicas: (
			<ValidateColumnValueWrapper value={deployment.availablePods}>
				{deployment.availablePods}
			</ValidateColumnValueWrapper>
		),
		desiredReplicas: (
			<ValidateColumnValueWrapper value={deployment.desiredPods}>
				{deployment.desiredPods}
			</ValidateColumnValueWrapper>
		),
		containerRestarts: (
			<ValidateColumnValueWrapper value={deployment.restarts}>
				{deployment.restarts}
			</ValidateColumnValueWrapper>
		),
		cpu: (
			<ValidateColumnValueWrapper value={deployment.cpuUsage}>
				{deployment.cpuUsage}
			</ValidateColumnValueWrapper>
		),
		cpu_request: (
			<ValidateColumnValueWrapper value={deployment.cpuRequest}>
				<div className="progress-container">
					<Progress
						percent={Number((deployment.cpuRequest * 100).toFixed(1))}
						strokeLinecap="butt"
						size="small"
						status="active"
						strokeColor={getStrokeColorForRequestUtilization(deployment.cpuRequest)}
						format={() =>
							getProgressBarText(Number((deployment.cpuRequest * 100).toFixed(1)))
						}
						className="progress-bar"
					/>
				</div>
			</ValidateColumnValueWrapper>
		),
		cpu_limit: (
			<ValidateColumnValueWrapper value={deployment.cpuLimit}>
				<div className="progress-container">
					<Progress
						percent={Number((deployment.cpuLimit * 100).toFixed(1))}
						strokeLinecap="butt"
						size="small"
						status="active"
						strokeColor={getStrokeColorForLimitUtilization(deployment.cpuLimit)}
						format={() =>
							getProgressBarText(Number((deployment.cpuLimit * 100).toFixed(1)))
						}
						className="progress-bar"
					/>
				</div>
			</ValidateColumnValueWrapper>
		),
		memory: (
			<ValidateColumnValueWrapper value={deployment.memoryUsage}>
				{formatBytes(deployment.memoryUsage)}
			</ValidateColumnValueWrapper>
		),
		memory_request: (
			<ValidateColumnValueWrapper value={deployment.memoryRequest}>
				<div className="progress-container">
					<Progress
						percent={Number((deployment.memoryRequest * 100).toFixed(1))}
						strokeLinecap="butt"
						size="small"
						status="active"
						strokeColor={getStrokeColorForRequestUtilization(
							deployment.memoryRequest,
						)}
						format={() =>
							getProgressBarText(Number((deployment.memoryRequest * 100).toFixed(1)))
						}
						className="progress-bar"
					/>
				</div>
			</ValidateColumnValueWrapper>
		),
		memory_limit: (
			<ValidateColumnValueWrapper value={deployment.memoryLimit}>
				<div className="progress-container">
					<Progress
						percent={Number((deployment.memoryLimit * 100).toFixed(1))}
						strokeLinecap="butt"
						size="small"
						status="active"
						strokeColor={getStrokeColorForLimitUtilization(deployment.memoryLimit)}
						format={() =>
							getProgressBarText(Number((deployment.memoryLimit * 100).toFixed(1)))
						}
						className="progress-bar"
					/>
				</div>
			</ValidateColumnValueWrapper>
		),
		clusterName: deployment.meta.k8s_cluster_name,
		namespaceName: deployment.meta.k8s_namespace_name,
		deploymentGroup: getGroupByEle(deployment, groupBy),
		meta: deployment.meta,
		...deployment.meta,
		groupedByMeta: deployment.meta,
	}));
