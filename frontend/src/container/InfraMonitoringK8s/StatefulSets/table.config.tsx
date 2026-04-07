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
import { K8sStatefulSetsData } from './api';

import styles from './table.module.scss';

export const k8sStatefulSetsColumns: IEntityColumn[] = [
	{
		label: 'StatefulSet Group',
		value: 'statefulSetGroup',
		id: 'statefulSetGroup',
		canBeHidden: false,
		defaultVisibility: true,
		behavior: 'hidden-on-collapse',
	},
	{
		label: 'StatefulSet Name',
		value: 'statefulsetName',
		id: 'statefulsetName',
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

export const k8sStatefulSetsColumnsConfig: ColumnType<K8sRenderedRowData>[] = [
	{
		title: (
			<div className={styles.entityGroupHeader}>
				<Group size={14} /> STATEFULSET GROUP
			</div>
		),
		dataIndex: 'statefulSetGroup',
		key: 'statefulSetGroup',
		ellipsis: true,
		width: 150,
		align: 'left',
		sorter: false,
	},
	{
		title: <div>StatefulSet Name</div>,
		dataIndex: 'statefulsetName',
		key: 'statefulsetName',
		ellipsis: true,
		width: 80,
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
		dataIndex: 'available_pods',
		key: 'available_pods',
		width: 80,
		sorter: true,
		align: 'left',
	},
	{
		title: <div>Desired</div>,
		dataIndex: 'desired_pods',
		key: 'desired_pods',
		width: 80,
		sorter: true,
		align: 'left',
	},
	{
		title: <div>CPU Req Usage (%)</div>,
		dataIndex: 'cpu_request',
		key: 'cpu_request',
		width: 120,
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
		width: 80,
		sorter: true,
		align: 'left',
	},
];

export const k8sStatefulSetsRenderRowData = (
	statefulSet: K8sStatefulSetsData,
	groupBy: BaseAutocompleteData[],
): K8sRenderedRowData => ({
	key: getRowKey(
		statefulSet,
		() =>
			statefulSet.statefulSetName || statefulSet.meta.k8s_statefulset_name || '',
		groupBy,
	),
	itemKey: statefulSet.meta.k8s_statefulset_name,
	statefulsetName: (
		<Tooltip title={statefulSet.meta.k8s_statefulset_name}>
			{statefulSet.meta.k8s_statefulset_name || ''}
		</Tooltip>
	),
	namespaceName: (
		<Tooltip title={statefulSet.meta.k8s_namespace_name}>
			{statefulSet.meta.k8s_namespace_name || ''}
		</Tooltip>
	),
	cpu_request: (
		<ValidateColumnValueWrapper
			value={statefulSet.cpuRequest}
			entity={K8sCategory.STATEFULSETS}
			attribute="CPU Request"
		>
			<div className={styles.progressBar}>
				<EntityProgressBar value={statefulSet.cpuRequest} type="request" />
			</div>
		</ValidateColumnValueWrapper>
	),
	cpu_limit: (
		<ValidateColumnValueWrapper
			value={statefulSet.cpuLimit}
			entity={K8sCategory.STATEFULSETS}
			attribute="CPU Limit"
		>
			<div className={styles.progressBar}>
				<EntityProgressBar value={statefulSet.cpuLimit} type="limit" />
			</div>
		</ValidateColumnValueWrapper>
	),
	cpu: (
		<ValidateColumnValueWrapper value={statefulSet.cpuUsage}>
			{statefulSet.cpuUsage}
		</ValidateColumnValueWrapper>
	),
	memory_request: (
		<ValidateColumnValueWrapper
			value={statefulSet.memoryRequest}
			entity={K8sCategory.STATEFULSETS}
			attribute="Memory Request"
		>
			<div className={styles.progressBar}>
				<EntityProgressBar value={statefulSet.memoryRequest} type="request" />
			</div>
		</ValidateColumnValueWrapper>
	),
	memory_limit: (
		<ValidateColumnValueWrapper
			value={statefulSet.memoryLimit}
			entity={K8sCategory.STATEFULSETS}
			attribute="Memory Limit"
		>
			<div className={styles.progressBar}>
				<EntityProgressBar value={statefulSet.memoryLimit} type="limit" />
			</div>
		</ValidateColumnValueWrapper>
	),
	memory: (
		<ValidateColumnValueWrapper value={statefulSet.memoryUsage}>
			{formatBytes(statefulSet.memoryUsage)}
		</ValidateColumnValueWrapper>
	),
	available_pods: (
		<ValidateColumnValueWrapper value={statefulSet.availablePods}>
			{statefulSet.availablePods}
		</ValidateColumnValueWrapper>
	),
	desired_pods: (
		<ValidateColumnValueWrapper value={statefulSet.desiredPods}>
			{statefulSet.desiredPods}
		</ValidateColumnValueWrapper>
	),
	statefulSetGroup: getGroupByEl(statefulSet, groupBy),
	...statefulSet.meta,
	groupedByMeta: getGroupedByMeta(statefulSet, groupBy),
});
