import React from 'react';
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
import { K8sCategory } from '../constants';
import { K8sPodsData } from './api';

import styles from './table.module.scss';

export interface K8sPodsRowData {
	key: string;
	podName: React.ReactNode;
	podUID: string;
	cpu_request: React.ReactNode;
	cpu_limit: React.ReactNode;
	cpu: React.ReactNode;
	memory_request: React.ReactNode;
	memory_limit: React.ReactNode;
	memory: React.ReactNode;
	restarts: React.ReactNode;
	groupedByMeta?: any;
}

export const k8sPodColumns: IEntityColumn[] = [
	{
		label: 'Pod Group',
		value: 'podGroup',
		id: 'podGroup',
		canBeHidden: false,
		defaultVisibility: true,
		behavior: 'hidden-on-collapse',
	},
	{
		label: 'Pod name',
		value: 'podName',
		id: 'podName',
		canBeHidden: false,
		defaultVisibility: true,
		behavior: 'hidden-on-expand',
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
	{
		label: 'Namespace name',
		value: 'namespace',
		id: 'namespace',
		canBeHidden: true,
		defaultVisibility: false,
		behavior: 'always-visible',
	},
	{
		label: 'Node name',
		value: 'node',
		id: 'node',
		canBeHidden: true,
		defaultVisibility: false,
		behavior: 'always-visible',
	},
	{
		label: 'Cluster name',
		value: 'cluster',
		id: 'cluster',
		canBeHidden: true,
		defaultVisibility: false,
		behavior: 'always-visible',
	},
	// TODO - Re-enable the column once backend issue is fixed
	// {
	// 	label: 'Restarts',
	// 	value: 'restarts',
	// 	id: 'restarts',
	// 	canRemove: false,
	// },
];

export const k8sPodColumnsConfig: ColumnType<K8sRenderedRowData>[] = [
	{
		title: (
			<div className={styles.entityGroupHeader}>
				<Group size={14} /> POD GROUP
			</div>
		),
		dataIndex: 'podGroup',
		key: 'podGroup',
		ellipsis: true,
		width: 180,
		sorter: false,
	},
	{
		title: <div>Pod Name</div>,
		dataIndex: 'podName',
		key: 'podName',
		width: 180,
		ellipsis: true,
		sorter: false,
	},
	{
		title: <div>CPU Req Usage (%)</div>,
		dataIndex: 'cpu_request',
		key: 'cpu_request',
		width: 180,
		ellipsis: true,
		sorter: true,
		align: 'left',
	},
	{
		title: <div>CPU Limit Usage (%)</div>,
		dataIndex: 'cpu_limit',
		key: 'cpu_limit',
		width: 120,
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
		width: 120,
		sorter: true,
		align: 'left',
	},
	{
		title: <div>Mem Limit Usage (%)</div>,
		dataIndex: 'memory_limit',
		key: 'memory_limit',
		width: 120,
		sorter: true,
		align: 'left',
	},
	{
		title: <div>Mem Usage (WSS)</div>,
		dataIndex: 'memory',
		key: 'memory',
		width: 120,
		ellipsis: true,
		sorter: true,
		align: 'left',
	},
	{
		title: <div>Namespace</div>,
		dataIndex: 'namespace',
		key: 'namespace',
		width: 100,
		sorter: false,
		ellipsis: true,
		align: 'left',
	},
	{
		title: <div>Node</div>,
		dataIndex: 'node',
		key: 'node',
		width: 100,
		sorter: false,
		ellipsis: true,
		align: 'left',
	},
	{
		title: <div>Cluster</div>,
		dataIndex: 'cluster',
		key: 'cluster',
		width: 100,
		sorter: false,
		ellipsis: true,
		align: 'left',
	},
	// TODO - Re-enable the column once backend issue is fixed
	// {
	// 	title: (
	// 		<div className="column-header">
	// 			<Tooltip title="Container Restarts">Restarts</Tooltip>
	// 		</div>
	// 	),
	// 	dataIndex: 'restarts',
	// 	key: 'restarts',
	// 	width: 40,
	// 	ellipsis: true,
	// 	sorter: true,
	// 	align: 'left',
	// 	className: `column ${columnProgressBarClassName}`,
	// },
];

export const k8sPodRenderRowData = (
	pod: K8sPodsData,
	groupBy: BaseAutocompleteData[],
): K8sRenderedRowData => ({
	key: getRowKey(
		pod,
		() => pod.podUID || pod.meta.k8s_pod_uid || pod.meta.k8s_pod_name,
		groupBy,
	),
	itemKey: pod.podUID,
	podName: (
		<Tooltip title={pod.meta.k8s_pod_name || ''}>
			{pod.meta.k8s_pod_name || ''}
		</Tooltip>
	),
	podUID: pod.podUID || '',
	cpu_request: (
		<ValidateColumnValueWrapper
			value={pod.podCPURequest}
			entity={K8sCategory.PODS}
			attribute="CPU Request"
		>
			<div className={styles.progressBar}>
				<EntityProgressBar value={pod.podCPURequest} type="request" />
			</div>
		</ValidateColumnValueWrapper>
	),
	cpu_limit: (
		<ValidateColumnValueWrapper
			value={pod.podCPULimit}
			entity={K8sCategory.PODS}
			attribute="CPU Limit"
		>
			<div className={styles.progressBar}>
				<EntityProgressBar value={pod.podCPULimit} type="limit" />
			</div>
		</ValidateColumnValueWrapper>
	),
	cpu: (
		<ValidateColumnValueWrapper value={pod.podCPU}>
			{pod.podCPU}
		</ValidateColumnValueWrapper>
	),
	memory_request: (
		<ValidateColumnValueWrapper
			value={pod.podMemoryRequest}
			entity={K8sCategory.PODS}
			attribute="Memory Request"
		>
			<div className={styles.progressBar}>
				<EntityProgressBar value={pod.podMemoryRequest} type="request" />
			</div>
		</ValidateColumnValueWrapper>
	),
	memory_limit: (
		<ValidateColumnValueWrapper
			value={pod.podMemoryLimit}
			entity={K8sCategory.PODS}
			attribute="Memory Limit"
		>
			<div className={styles.progressBar}>
				<EntityProgressBar value={pod.podMemoryLimit} type="limit" />
			</div>
		</ValidateColumnValueWrapper>
	),
	memory: (
		<ValidateColumnValueWrapper value={pod.podMemory}>
			{formatBytes(pod.podMemory)}
		</ValidateColumnValueWrapper>
	),
	restarts: (
		<ValidateColumnValueWrapper value={pod.restartCount}>
			{pod.restartCount}
		</ValidateColumnValueWrapper>
	),
	namespace: pod.meta.k8s_namespace_name,
	node: pod.meta.k8s_node_name,
	cluster: pod.meta.k8s_cluster_name,
	meta: pod.meta,
	podGroup: getGroupByEl(pod, groupBy),
	...pod.meta,
	groupedByMeta: getGroupedByMeta(pod, groupBy),
});
