import { TableColumnType as ColumnType, Tooltip } from 'antd';
import { Group } from 'lucide-react';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';

import { K8sRenderedRowData } from '../Base/types';
import { IEntityColumn } from '../Base/useInfraMonitoringTableColumnsStore';
import { getGroupByEl, getGroupedByMeta, getRowKey } from '../Base/utils';
import {
	EntityProgressBar,
	formatBytes,
	ValidateColumnValueWrapper,
} from '../commonUtils';
import { K8sDeploymentsData } from './api';

import styles from './table.module.scss';

export const k8sDeploymentsColumns: IEntityColumn[] = [
	{
		label: 'Deployment Group',
		value: 'deploymentGroup',
		id: 'deploymentGroup',
		canBeHidden: false,
		defaultVisibility: true,
		behavior: 'hidden-on-collapse',
	},
	{
		label: 'Deployment Name',
		value: 'deploymentName',
		id: 'deploymentName',
		canBeHidden: false,
		defaultVisibility: true,
		behavior: 'hidden-on-expand',
	},
	{
		label: 'Namespace Name',
		value: 'namespaceName',
		id: 'namespaceName',
		canBeHidden: false,
		defaultVisibility: true,
		behavior: 'always-visible',
	},
	{
		label: 'Available',
		value: 'available_pods',
		id: 'available_pods',
		canBeHidden: false,
		defaultVisibility: true,
		behavior: 'always-visible',
	},
	{
		label: 'Desired',
		value: 'desired_pods',
		id: 'desired_pods',
		canBeHidden: false,
		defaultVisibility: true,
		behavior: 'always-visible',
	},
	{
		label: 'CPU Req Usage (%)',
		value: 'cpu_request',
		id: 'cpu_request',
		canBeHidden: false,
		defaultVisibility: true,
		behavior: 'always-visible',
	},
	{
		label: 'CPU Limit Usage (%)',
		value: 'cpu_limit',
		id: 'cpu_limit',
		canBeHidden: false,
		defaultVisibility: true,
		behavior: 'always-visible',
	},
	{
		label: 'CPU Usage (cores)',
		value: 'cpu',
		id: 'cpu',
		canBeHidden: false,
		defaultVisibility: true,
		behavior: 'always-visible',
	},
	{
		label: 'Mem Req Usage (%)',
		value: 'memory_request',
		id: 'memory_request',
		canBeHidden: false,
		defaultVisibility: true,
		behavior: 'always-visible',
	},
	{
		label: 'Mem Limit Usage (%)',
		value: 'memory_limit',
		id: 'memory_limit',
		canBeHidden: false,
		defaultVisibility: true,
		behavior: 'always-visible',
	},
	{
		label: 'Mem Usage (WSS)',
		value: 'memory',
		id: 'memory',
		canBeHidden: false,
		defaultVisibility: true,
		behavior: 'always-visible',
	},
];

export const k8sDeploymentsColumnsConfig: ColumnType<K8sRenderedRowData>[] = [
	{
		title: (
			<div className={styles.entityGroupHeader}>
				<Group size={14} /> DEPLOYMENT GROUP
			</div>
		),
		dataIndex: 'deploymentGroup',
		key: 'deploymentGroup',
		ellipsis: true,
		width: 150,
		align: 'left',
		sorter: false,
	},
	{
		title: <div>Deployment Name</div>,
		dataIndex: 'deploymentName',
		key: 'deploymentName',
		ellipsis: true,
		width: 150,
		sorter: false,
		align: 'left',
	},
	{
		title: <div>Namespace Name</div>,
		dataIndex: 'namespaceName',
		key: 'namespaceName',
		ellipsis: true,
		width: 150,
		sorter: false,
		align: 'left',
	},
	{
		title: <div>Available</div>,
		dataIndex: 'available_pods',
		key: 'available_pods',
		width: 100,
		sorter: false,
		align: 'left',
	},
	{
		title: <div>Desired</div>,
		dataIndex: 'desired_pods',
		key: 'desired_pods',
		width: 80,
		sorter: false,
		align: 'left',
	},
	{
		title: <div>CPU Req Usage (%)</div>,
		dataIndex: 'cpu_request',
		key: 'cpu_request',
		width: 170,
		sorter: true,
		align: 'left',
	},
	{
		title: <div>CPU Limit Usage (%)</div>,
		dataIndex: 'cpu_limit',
		key: 'cpu_limit',
		width: 170,
		sorter: true,
		align: 'left',
	},
	{
		title: <div>CPU Usage (cores)</div>,
		dataIndex: 'cpu',
		key: 'cpu',
		width: 80,
		sorter: true,
		align: 'left',
	},
	{
		title: <div>Mem Req Usage (%)</div>,
		dataIndex: 'memory_request',
		key: 'memory_request',
		width: 170,
		sorter: true,
		align: 'left',
	},
	{
		title: <div>Mem Limit Usage (%)</div>,
		dataIndex: 'memory_limit',
		key: 'memory_limit',
		width: 170,
		sorter: true,
		align: 'left',
	},
	{
		title: <div>Mem Usage (WSS)</div>,
		dataIndex: 'memory',
		key: 'memory',
		width: 120,
		sorter: true,
		align: 'left',
	},
];

export const k8sDeploymentsRenderRowData = (
	deployment: K8sDeploymentsData,
	groupBy: BaseAutocompleteData[],
): K8sRenderedRowData => ({
	key: getRowKey(deployment, () => deployment.meta.k8s_deployment_name, groupBy),
	itemKey: deployment.meta.k8s_deployment_name,
	deploymentName: (
		<Tooltip title={deployment.meta.k8s_deployment_name}>
			{deployment.meta.k8s_deployment_name || ''}
		</Tooltip>
	),
	namespaceName: deployment.meta.k8s_namespace_name,
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
	cpu: (
		<ValidateColumnValueWrapper value={deployment.cpuUsage}>
			{deployment.cpuUsage}
		</ValidateColumnValueWrapper>
	),
	cpu_request: (
		<ValidateColumnValueWrapper value={deployment.cpuRequest}>
			<div className={styles.progressBar}>
				<EntityProgressBar value={deployment.cpuRequest} type="request" />
			</div>
		</ValidateColumnValueWrapper>
	),
	cpu_limit: (
		<ValidateColumnValueWrapper value={deployment.cpuLimit}>
			<div className={styles.progressBar}>
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
			<div className={styles.progressBar}>
				<EntityProgressBar value={deployment.memoryRequest} type="request" />
			</div>
		</ValidateColumnValueWrapper>
	),
	memory_limit: (
		<ValidateColumnValueWrapper value={deployment.memoryLimit}>
			<div className={styles.progressBar}>
				<EntityProgressBar value={deployment.memoryLimit} type="limit" />
			</div>
		</ValidateColumnValueWrapper>
	),
	deploymentGroup: getGroupByEl(deployment, groupBy),
	...deployment.meta,
	groupedByMeta: getGroupedByMeta(deployment, groupBy),
});
