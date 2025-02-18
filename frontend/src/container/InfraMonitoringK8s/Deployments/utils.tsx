import { Color } from '@signozhq/design-tokens';
import { Tag, Tooltip } from 'antd';
import { ColumnType } from 'antd/es/table';
import {
	K8sDeploymentsData,
	K8sDeploymentsListPayload,
} from 'api/infraMonitoring/getK8sDeploymentsList';
import { Group } from 'lucide-react';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

import {
	EntityProgressBar,
	formatBytes,
	ValidateColumnValueWrapper,
} from '../commonUtils';
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
		value: 'available_pods',
		id: 'available_pods',
		canRemove: false,
	},
	{
		label: 'Desired',
		value: 'desired_pods',
		id: 'desired_pods',
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
	deploymentUID: string;
	deploymentName: React.ReactNode;
	available_pods: React.ReactNode;
	desired_pods: React.ReactNode;
	cpu_request: React.ReactNode;
	cpu_limit: React.ReactNode;
	cpu: React.ReactNode;
	memory_request: React.ReactNode;
	memory_limit: React.ReactNode;
	memory: React.ReactNode;
	restarts: React.ReactNode;
	clusterName: string;
	namespaceName: string;
	groupedByMeta?: any;
}

const deploymentGroupColumnConfig = {
	title: (
		<div className="column-header entity-group-header">
			<Group size={14} /> DEPLOYMENT GROUP
		</div>
	),
	dataIndex: 'deploymentGroup',
	key: 'deploymentGroup',
	ellipsis: true,
	width: 150,
	align: 'left',
	sorter: false,
	className: 'column entity-group-header',
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
		title: (
			<div className="column-header-left deployment-name-header">
				Deployment Name
			</div>
		),
		dataIndex: 'deploymentName',
		key: 'deploymentName',
		ellipsis: true,
		width: 150,
		sorter: false,
		align: 'left',
	},
	{
		title: (
			<div className="column-header-left namespace-name-header">
				Namespace Name
			</div>
		),
		dataIndex: 'namespaceName',
		key: 'namespaceName',
		ellipsis: true,
		width: 150,
		sorter: false,
		align: 'left',
	},
	{
		title: <div className="column-header-left small-col">Available</div>,
		dataIndex: 'available_pods',
		key: 'available_pods',
		width: 100,
		sorter: false,
		align: 'left',
	},
	{
		title: <div className="column-header-left small-col">Desired</div>,
		dataIndex: 'desired_pods',
		key: 'desired_pods',
		width: 80,
		sorter: false,
		align: 'left',
	},
	{
		title: <div className="column-header-left med-col">CPU Req Usage (%)</div>,
		dataIndex: 'cpu_request',
		key: 'cpu_request',
		width: 80,
		sorter: true,
		align: 'left',
	},
	{
		title: <div className="column-header-left med-col">CPU Limit Usage (%)</div>,
		dataIndex: 'cpu_limit',
		key: 'cpu_limit',
		width: 50,
		sorter: true,
		align: 'left',
	},
	{
		title: <div className="column-header- small-col">CPU Usage (cores)</div>,
		dataIndex: 'cpu',
		key: 'cpu',
		width: 80,
		sorter: true,
		align: 'left',
	},
	{
		title: <div className="column-header-left med-col">Mem Req Usage (%)</div>,
		dataIndex: 'memory_request',
		key: 'memory_request',
		width: 50,
		sorter: true,
		align: 'left',
	},
	{
		title: <div className="column-header-left med-col">Mem Limit Usage (%)</div>,
		dataIndex: 'memory_limit',
		key: 'memory_limit',
		width: 80,
		sorter: true,
		align: 'left',
	},
	{
		title: <div className="column-header-left small-col">Mem Usage</div>,
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
				<Tag key={value} color={Color.BG_SLATE_400} className="pod-group-tag-item">
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
		key: index.toString(),
		deploymentUID: deployment.meta.k8s_deployment_name,
		deploymentName: (
			<Tooltip title={deployment.meta.k8s_deployment_name}>
				{deployment.meta.k8s_deployment_name}
			</Tooltip>
		),
		available_pods: (
			<ValidateColumnValueWrapper value={deployment.availablePods}>
				{deployment.availablePods}
			</ValidateColumnValueWrapper>
		),
		desired_pods: (
			<ValidateColumnValueWrapper value={deployment.desiredPods}>
				{deployment.desiredPods}
			</ValidateColumnValueWrapper>
		),
		restarts: (
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
					<EntityProgressBar value={deployment.cpuRequest} type="request" />
				</div>
			</ValidateColumnValueWrapper>
		),
		cpu_limit: (
			<ValidateColumnValueWrapper value={deployment.cpuLimit}>
				<div className="progress-container">
					<EntityProgressBar value={deployment.cpuLimit} type="limit" />
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
					<EntityProgressBar value={deployment.memoryRequest} type="request" />
				</div>
			</ValidateColumnValueWrapper>
		),
		memory_limit: (
			<ValidateColumnValueWrapper value={deployment.memoryLimit}>
				<div className="progress-container">
					<EntityProgressBar value={deployment.memoryLimit} type="limit" />
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
