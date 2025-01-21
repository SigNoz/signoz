import { Color } from '@signozhq/design-tokens';
import { Tag } from 'antd';
import { ColumnType } from 'antd/es/table';
import {
	K8sNamespacesData,
	K8sNamespacesListPayload,
} from 'api/infraMonitoring/getK8sNamespacesList';
import { Group } from 'lucide-react';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

import { formatBytes, ValidateColumnValueWrapper } from '../commonUtils';
import { IEntityColumn } from '../utils';

export const defaultAddedColumns: IEntityColumn[] = [
	{
		label: 'Namespace Name',
		value: 'namespaceName',
		id: 'namespaceName',
		canRemove: false,
	},
	{
		label: 'Cluster Name',
		value: 'clusterName',
		id: 'clusterName',
		canRemove: false,
	},
	{
		label: 'CPU Utilization (cores)',
		value: 'cpu',
		id: 'cpu',
		canRemove: false,
	},
	{
		label: 'Memory Utilization (bytes)',
		value: 'memory',
		id: 'memory',
		canRemove: false,
	},
];

export interface K8sNamespacesRowData {
	key: string;
	namespaceUID: string;
	namespaceName: string;
	clusterName: string;
	cpu: React.ReactNode;
	memory: React.ReactNode;
	groupedByMeta?: any;
}

const namespaceGroupColumnConfig = {
	title: (
		<div className="column-header entity-group-header">
			<Group size={14} /> NAMESPACE GROUP
		</div>
	),
	dataIndex: 'namespaceGroup',
	key: 'namespaceGroup',
	ellipsis: true,
	width: 150,
	align: 'left',
	sorter: false,
	className: 'column entity-group-header',
};

export const getK8sNamespacesListQuery = (): K8sNamespacesListPayload => ({
	filters: {
		items: [],
		op: 'and',
	},
	orderBy: { columnName: 'cpu', order: 'desc' },
});

const columnsConfig = [
	{
		title: <div className="column-header-left">Namespace Name</div>,
		dataIndex: 'namespaceName',
		key: 'namespaceName',
		ellipsis: true,
		width: 120,
		sorter: false,
		align: 'left',
	},
	{
		title: <div className="column-header-left">Cluster Name</div>,
		dataIndex: 'clusterName',
		key: 'clusterName',
		ellipsis: true,
		width: 120,
		sorter: false,
		align: 'left',
	},
	{
		title: <div className="column-header-left">CPU Usage (cores)</div>,
		dataIndex: 'cpu',
		key: 'cpu',
		width: 100,
		sorter: true,
		align: 'left',
	},
	{
		title: <div className="column-header-left">Mem Usage</div>,
		dataIndex: 'memory',
		key: 'memory',
		width: 80,
		sorter: true,
		align: 'left',
	},
];

export const getK8sNamespacesListColumns = (
	groupBy: IBuilderQuery['groupBy'],
): ColumnType<K8sNamespacesRowData>[] => {
	if (groupBy.length > 0) {
		const filteredColumns = [...columnsConfig].filter(
			(column) => column.key !== 'namespaceName',
		);
		filteredColumns.unshift(namespaceGroupColumnConfig);
		return filteredColumns as ColumnType<K8sNamespacesRowData>[];
	}

	return columnsConfig as ColumnType<K8sNamespacesRowData>[];
};

const getGroupByEle = (
	namespace: K8sNamespacesData,
	groupBy: IBuilderQuery['groupBy'],
): React.ReactNode => {
	const groupByValues: string[] = [];

	groupBy.forEach((group) => {
		groupByValues.push(namespace.meta[group.key as keyof typeof namespace.meta]);
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
	data: K8sNamespacesData[],
	groupBy: IBuilderQuery['groupBy'],
): K8sNamespacesRowData[] =>
	data.map((namespace, index) => ({
		key: index.toString(),
		namespaceUID: namespace.namespaceName,
		namespaceName: namespace.namespaceName,
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
		namespaceGroup: getGroupByEle(namespace, groupBy),
		meta: namespace.meta,
		...namespace.meta,
		groupedByMeta: namespace.meta,
	}));
