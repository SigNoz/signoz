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
import { InfraMonitoringEntity } from '../constants';
import { K8sDaemonSetsData } from './api';

import styles from './table.module.scss';

export const k8sDaemonSetsColumns: IEntityColumn[] = [
	{
		label: 'DaemonSet Group',
		value: 'daemonSetGroup',
		id: 'daemonSetGroup',
		canBeHidden: false,
		defaultVisibility: true,
		behavior: 'hidden-on-collapse',
	},
	{
		label: 'DaemonSet Name',
		value: 'daemonsetName',
		id: 'daemonsetName',
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
		value: 'available_nodes',
		id: 'available_nodes',
		canBeHidden: false,
		defaultVisibility: true,
		behavior: 'always-visible',
	},
	{
		label: 'Desired',
		value: 'desired_nodes',
		id: 'desired_nodes',
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

export const k8sDaemonSetsColumnsConfig: ColumnType<K8sRenderedRowData>[] = [
	{
		title: (
			<div className={styles.entityGroupHeader}>
				<Group size={14} /> DAEMONSET GROUP
			</div>
		),
		dataIndex: 'daemonSetGroup',
		key: 'daemonSetGroup',
		ellipsis: true,
		width: 150,
		align: 'left',
		sorter: false,
	},
	{
		title: <div>DaemonSet Name</div>,
		dataIndex: 'daemonsetName',
		key: 'daemonsetName',
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
		width: 80,
		sorter: false,
		align: 'left',
	},
	{
		title: <div>Available</div>,
		dataIndex: 'available_nodes',
		key: 'available_nodes',
		width: 50,
		ellipsis: true,
		sorter: true,
		align: 'left',
	},
	{
		title: <div>Desired</div>,
		dataIndex: 'desired_nodes',
		key: 'desired_nodes',
		width: 50,
		sorter: true,
		align: 'left',
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
		width: 170,
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
];

export const k8sDaemonSetsRenderRowData = (
	entity: K8sDaemonSetsData,
	groupBy: BaseAutocompleteData[],
): K8sRenderedRowData => ({
	key: getRowKey(
		entity,
		() => entity.daemonSetName || entity.meta.k8s_daemonset_name || '',
		groupBy,
	),
	itemKey: entity.meta.k8s_daemonset_name,
	daemonsetName: (
		<Tooltip title={entity.meta.k8s_daemonset_name}>
			{entity.meta.k8s_daemonset_name || ''}
		</Tooltip>
	),
	namespaceName: (
		<Tooltip title={entity.meta.k8s_namespace_name}>
			{entity.meta.k8s_namespace_name || ''}
		</Tooltip>
	),
	cpu_request: (
		<ValidateColumnValueWrapper
			value={entity.cpuRequest}
			entity={InfraMonitoringEntity.DAEMONSETS}
			attribute="CPU Request"
		>
			<div className={styles.progressBar}>
				<EntityProgressBar value={entity.cpuRequest} type="request" />
			</div>
		</ValidateColumnValueWrapper>
	),
	cpu_limit: (
		<ValidateColumnValueWrapper
			value={entity.cpuLimit}
			entity={InfraMonitoringEntity.DAEMONSETS}
			attribute="CPU Limit"
		>
			<div className={styles.progressBar}>
				<EntityProgressBar value={entity.cpuLimit} type="limit" />
			</div>
		</ValidateColumnValueWrapper>
	),
	cpu: (
		<ValidateColumnValueWrapper value={entity.cpuUsage}>
			{entity.cpuUsage}
		</ValidateColumnValueWrapper>
	),
	memory_request: (
		<ValidateColumnValueWrapper
			value={entity.memoryRequest}
			entity={InfraMonitoringEntity.DAEMONSETS}
			attribute="Memory Request"
		>
			<div className={styles.progressBar}>
				<EntityProgressBar value={entity.memoryRequest} type="request" />
			</div>
		</ValidateColumnValueWrapper>
	),
	memory_limit: (
		<ValidateColumnValueWrapper
			value={entity.memoryLimit}
			entity={InfraMonitoringEntity.DAEMONSETS}
			attribute="Memory Limit"
		>
			<div className={styles.progressBar}>
				<EntityProgressBar value={entity.memoryLimit} type="limit" />
			</div>
		</ValidateColumnValueWrapper>
	),
	memory: (
		<ValidateColumnValueWrapper value={entity.memoryUsage}>
			{formatBytes(entity.memoryUsage)}
		</ValidateColumnValueWrapper>
	),
	available_nodes: (
		<ValidateColumnValueWrapper value={entity.availableNodes}>
			{entity.availableNodes}
		</ValidateColumnValueWrapper>
	),
	desired_nodes: (
		<ValidateColumnValueWrapper value={entity.desiredNodes}>
			{entity.desiredNodes}
		</ValidateColumnValueWrapper>
	),
	daemonSetGroup: getGroupByEl(entity, groupBy),
	...entity.meta,
	groupedByMeta: getGroupedByMeta(entity, groupBy),
});
