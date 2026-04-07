import { TableColumnType as ColumnType, Tooltip } from 'antd';
import { Group } from 'lucide-react';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';

import { K8sRenderedRowData } from '../Base/types';
import { IEntityColumn } from '../Base/useInfraMonitoringTableColumnsStore';
import { getGroupByEl, getGroupedByMeta, getRowKey } from '../Base/utils';
import { formatBytes, ValidateColumnValueWrapper } from '../commonUtils';
import { K8sNamespacesData, K8sNamespacesListPayload } from './api';

import styles from './table.module.scss';

export interface K8sNamespacesRowData {
	key: string;
	itemKey: string;
	namespaceUID: string;
	namespaceName: React.ReactNode;
	clusterName: string;
	cpu: React.ReactNode;
	memory: React.ReactNode;
	groupedByMeta?: Record<string, string>;
}

export const k8sNamespacesColumns: IEntityColumn[] = [
	{
		label: 'Namespace Group',
		value: 'namespaceGroup',
		id: 'namespaceGroup',
		canBeHidden: false,
		defaultVisibility: true,
		behavior: 'hidden-on-collapse',
	},
	{
		label: 'Namespace Name',
		value: 'namespaceName',
		id: 'namespaceName',
		canBeHidden: false,
		defaultVisibility: true,
		behavior: 'hidden-on-expand',
	},
	{
		label: 'Cluster Name',
		value: 'clusterName',
		id: 'clusterName',
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
		label: 'Memory Usage (WSS)',
		value: 'memory',
		id: 'memory',
		canBeHidden: false,
		defaultVisibility: true,
		behavior: 'always-visible',
	},
];

export const getK8sNamespacesListQuery = (): K8sNamespacesListPayload => ({
	filters: {
		items: [],
		op: 'and',
	},
	orderBy: { columnName: 'cpu', order: 'desc' },
});

export const k8sNamespacesColumnsConfig: ColumnType<K8sRenderedRowData>[] = [
	{
		title: (
			<div className={styles.entityGroupHeader}>
				<Group size={14} /> NAMESPACE GROUP
			</div>
		),
		dataIndex: 'namespaceGroup',
		key: 'namespaceGroup',
		ellipsis: true,
		width: 150,
		align: 'left',
		sorter: false,
	},
	{
		title: <div>Namespace Name</div>,
		dataIndex: 'namespaceName',
		key: 'namespaceName',
		ellipsis: true,
		width: 120,
		sorter: false,
		align: 'left',
	},
	{
		title: <div>Cluster Name</div>,
		dataIndex: 'clusterName',
		key: 'clusterName',
		ellipsis: true,
		width: 120,
		sorter: false,
		align: 'left',
	},
	{
		title: <div>CPU Usage (cores)</div>,
		dataIndex: 'cpu',
		key: 'cpu',
		width: 100,
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

export const k8sNamespacesRenderRowData = (
	namespace: K8sNamespacesData,
	groupBy: BaseAutocompleteData[],
): K8sRenderedRowData => ({
	key: getRowKey(
		namespace,
		() => namespace.namespaceName || namespace.meta.k8s_namespace_name,
		groupBy,
	),
	itemKey: namespace.meta.k8s_namespace_name,
	namespaceUID: namespace.namespaceName,
	namespaceName: (
		<Tooltip title={namespace.namespaceName}>
			{namespace.namespaceName || ''}
		</Tooltip>
	),
	clusterName: namespace.meta.k8s_cluster_name,
	cpu: (
		<ValidateColumnValueWrapper value={namespace.cpuUsage}>
			{namespace.cpuUsage}
		</ValidateColumnValueWrapper>
	),
	memory: (
		<ValidateColumnValueWrapper value={namespace.memoryUsage}>
			{formatBytes(namespace.memoryUsage)}
		</ValidateColumnValueWrapper>
	),
	namespaceGroup: getGroupByEl(namespace, groupBy),
	...namespace.meta,
	groupedByMeta: getGroupedByMeta(namespace, groupBy),
});
